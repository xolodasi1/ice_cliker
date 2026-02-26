import express from 'express';
import { createServer as createViteServer } from 'vite';
import pkg from 'pg';
const { Pool } = pkg;
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || "postgres://postgres.ullomarmkawbrzlfgbfo:Ms4Gf3dTKIc8CPIU@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x",
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        token TEXT,
        subscribers REAL DEFAULT 0,
        game_state TEXT,
        playtime REAL DEFAULT 0,
        money REAL DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        avatar TEXT DEFAULT '😎'
      )
    `);
    
    // Attempt to add columns if they don't exist (for migrations)
    const columns = [
      "ALTER TABLE users ADD COLUMN playtime REAL DEFAULT 0",
      "ALTER TABLE users ADD COLUMN money REAL DEFAULT 0",
      "ALTER TABLE users ADD COLUMN clicks INTEGER DEFAULT 0",
      "ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT '😎'"
    ];
    for (const col of columns) {
      try { await pool.query(col); } catch (e) {}
    }
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }
};

initDB();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to authenticate
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE token = $1', [token]);
      const user = rows[0];
      if (!user) return res.status(401).json({ error: 'Invalid token' });
      req.user = user;
      next();
    } catch (e) {
      console.error('Auth error:', e);
      res.status(500).json({ error: 'Database error' });
    }
  };

  app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    
    try {
      const token = crypto.randomUUID();
      await pool.query(
        'INSERT INTO users (username, password, token, avatar) VALUES ($1, $2, $3, $4)',
        [username, password, token, '😎']
      );
      res.json({ token, username, avatar: '😎' });
    } catch (e: any) {
      console.error('Register error:', e);
      res.status(400).json({ error: 'Username already exists or database error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
      const user = rows[0];
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      
      const token = crypto.randomUUID();
      await pool.query('UPDATE users SET token = $1 WHERE id = $2', [token, user.id]);
      
      res.json({ 
        token, 
        username: user.username, 
        avatar: user.avatar || '😎',
        gameState: user.game_state ? JSON.parse(user.game_state) : null 
      });
    } catch (e) {
      console.error('Login error:', e);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/auth/me', authenticate, (req: any, res: any) => {
    res.json({ 
      username: req.user.username,
      avatar: req.user.avatar || '😎',
      gameState: req.user.game_state ? JSON.parse(req.user.game_state) : null
    });
  });

  app.post('/api/user/update', authenticate, async (req: any, res: any) => {
    const { username, avatar } = req.body;
    if (!username || username.trim() === '') return res.status(400).json({ error: 'Username cannot be empty' });
    
    try {
      await pool.query('UPDATE users SET username = $1, avatar = $2 WHERE id = $3', [username.trim(), avatar || '😎', req.user.id]);
      res.json({ success: true, username: username.trim(), avatar: avatar || '😎' });
    } catch (e) {
      console.error('Update user error:', e);
      res.status(400).json({ error: 'Username already taken' });
    }
  });

  app.post('/api/sync', authenticate, async (req: any, res: any) => {
    const { subscribers, playtime, money, clicks, avatar, gameState } = req.body;
    try {
      await pool.query(
        'UPDATE users SET subscribers = $1, playtime = $2, money = $3, clicks = $4, avatar = $5, game_state = $6 WHERE id = $7',
        [subscribers || 0, playtime || 0, money || 0, clicks || 0, avatar || '😎', JSON.stringify(gameState), req.user.id]
      );
      res.json({ success: true });
    } catch (e) {
      console.error('Sync error:', e);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/leaderboard', async (req, res) => {
    const type = req.query.type || 'subscribers';
    let orderBy = 'subscribers';
    if (type === 'playtime') orderBy = 'playtime';
    if (type === 'money') orderBy = 'money';
    if (type === 'clicks') orderBy = 'clicks';
    
    try {
      const { rows } = await pool.query(`SELECT username, subscribers, playtime, money, clicks, avatar FROM users ORDER BY ${orderBy} DESC LIMIT 50`);
      res.json(rows);
    } catch (e) {
      console.error('Leaderboard error:', e);
      res.status(500).json({ error: 'Database error' });
    }
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
