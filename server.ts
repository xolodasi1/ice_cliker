import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('game.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    token TEXT,
    subscribers REAL DEFAULT 0,
    game_state TEXT
  )
`);

try { db.exec('ALTER TABLE users ADD COLUMN playtime REAL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN money REAL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN clicks INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT "😎"'); } catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to authenticate
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = db.prepare('SELECT * FROM users WHERE token = ?').get(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  };

  app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    
    try {
      const token = crypto.randomUUID();
      db.prepare('INSERT INTO users (username, password, token, avatar) VALUES (?, ?, ?, ?)').run(username, password, token, '😎');
      res.json({ token, username, avatar: '😎' });
    } catch (e) {
      res.status(400).json({ error: 'Username already exists' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = crypto.randomUUID();
    db.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, user.id);
    
    res.json({ 
      token, 
      username: user.username, 
      avatar: user.avatar || '😎',
      gameState: user.game_state ? JSON.parse(user.game_state) : null 
    });
  });

  app.get('/api/auth/me', authenticate, (req: any, res: any) => {
    res.json({ 
      username: req.user.username,
      avatar: req.user.avatar || '😎',
      gameState: req.user.game_state ? JSON.parse(req.user.game_state) : null
    });
  });

  app.post('/api/user/update', authenticate, (req: any, res: any) => {
    const { username, avatar } = req.body;
    if (!username || username.trim() === '') return res.status(400).json({ error: 'Username cannot be empty' });
    
    try {
      db.prepare('UPDATE users SET username = ?, avatar = ? WHERE id = ?').run(username.trim(), avatar || '😎', req.user.id);
      res.json({ success: true, username: username.trim(), avatar: avatar || '😎' });
    } catch (e) {
      res.status(400).json({ error: 'Username already taken' });
    }
  });

  app.post('/api/sync', authenticate, (req: any, res: any) => {
    const { subscribers, playtime, money, clicks, avatar, gameState } = req.body;
    db.prepare('UPDATE users SET subscribers = ?, playtime = ?, money = ?, clicks = ?, avatar = ?, game_state = ? WHERE id = ?')
      .run(subscribers || 0, playtime || 0, money || 0, clicks || 0, avatar || '😎', JSON.stringify(gameState), req.user.id);
    res.json({ success: true });
  });

  app.get('/api/leaderboard', (req, res) => {
    const type = req.query.type || 'subscribers';
    let orderBy = 'subscribers';
    if (type === 'playtime') orderBy = 'playtime';
    if (type === 'money') orderBy = 'money';
    if (type === 'clicks') orderBy = 'clicks';
    
    const topUsers = db.prepare(`SELECT username, subscribers, playtime, money, clicks, avatar FROM users ORDER BY ${orderBy} DESC LIMIT 50`).all();
    res.json(topUsers);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
