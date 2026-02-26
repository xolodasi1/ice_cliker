/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, Mic, Sun, Scissors, Armchair, Zap, Play, 
  TrendingUp, Users, DollarSign, Award, Trophy, Star,
  ChevronRight, Settings, Youtube, User, Lock, LogOut, Clock, MousePointer2, X, Edit2
} from 'lucide-react';
import { GameState, Upgrade, Milestone } from './types';
import { UPGRADES, MILESTONES } from './constants';

const ICON_MAP: Record<string, any> = {
  Camera, Mic, Sun, Scissors, Armchair, Zap, Award, Trophy, Star
};

const AVATARS = ['😎', '🤓', '🤖', '👽', '👻', '🤡', '🤠', '🤑', '😈', '😺', '🐼', '🦊', '🦄', '🦖', '🚀', '💎'];

export default function App() {
  const [user, setUser] = useState<{username: string, token: string, avatar: string} | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ username: '', avatar: '' });
  const [profileError, setProfileError] = useState('');
  const [currentTab, setCurrentTab] = useState<'studio' | 'leaderboard'>('studio');
  const [leaderboardType, setLeaderboardType] = useState<'subscribers' | 'playtime' | 'money' | 'clicks'>('subscribers');
  const [leaderboard, setLeaderboard] = useState<{username: string, subscribers: number, playtime: number, money: number, clicks: number, avatar: string}[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({username: '', password: ''});
  const [authError, setAuthError] = useState('');

  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('youtuber_clicker_save');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.playtime === undefined) parsed.playtime = 0;
      if (parsed.clicks === undefined) parsed.clicks = 0;
      return parsed;
    }
    return {
      views: 0, subscribers: 0, money: 0, totalViews: 0, upgrades: {}, lastSave: Date.now(), playtime: 0, clicks: 0
    };
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [particles, setParticles] = useState<{ id: number; x: number; y: number; value: number }[]>([]);
  const particleIdCounter = useRef(0);

  // Auth functions
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      localStorage.setItem('youtuber_token', data.token);
      setUser({ username: data.username, token: data.token, avatar: data.avatar || '😎' });
      if (data.gameState) {
        setState(data.gameState);
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const openProfileModal = () => {
    if (user) {
      setEditProfileForm({ username: user.username, avatar: user.avatar });
      setProfileError('');
      setShowProfileModal(true);
    }
  };

  const handleSaveProfile = async () => {
    setProfileError('');
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(editProfileForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setUser(prev => prev ? { ...prev, username: data.username, avatar: data.avatar } : null);
      setShowProfileModal(false);
      
      if (currentTab === 'leaderboard') {
        fetch(`/api/leaderboard?type=${leaderboardType}`)
          .then(res => res.json())
          .then(data => setLeaderboard(data));
      }
    } catch (err: any) {
      setProfileError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('youtuber_token');
    setUser(null);
    setState({
      views: 0, subscribers: 0, money: 0, totalViews: 0, upgrades: {}, lastSave: Date.now(), playtime: 0, clicks: 0
    });
  };

  // Auto-login
  useEffect(() => {
    const token = localStorage.getItem('youtuber_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()).then(data => {
        if (data.username) {
          setUser({ username: data.username, token, avatar: data.avatar || '😎' });
          if (data.gameState) setState(data.gameState);
        } else {
          localStorage.removeItem('youtuber_token');
        }
      }).catch(() => localStorage.removeItem('youtuber_token'));
    }
  }, []);

  // Sync to server
  useEffect(() => {
    const interval = setInterval(() => {
      const currentUser = userRef.current;
      const currentState = stateRef.current;
      if (!currentUser) return;
      
      fetch('/api/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ 
          subscribers: currentState.subscribers, 
          playtime: currentState.playtime,
          money: currentState.money,
          clicks: currentState.clicks,
          avatar: currentUser.avatar,
          gameState: currentState 
        })
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch leaderboard
  useEffect(() => {
    let isMounted = true;
    if (currentTab === 'leaderboard') {
      const fetchLeaderboard = () => {
        fetch(`/api/leaderboard?type=${leaderboardType}`)
          .then(res => res.json())
          .then(data => {
            if (isMounted) setLeaderboard(data);
          });
      };
      
      fetchLeaderboard();
      const interval = setInterval(fetchLeaderboard, 3000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [currentTab, leaderboardType]);

  // Calculate stats
  const getViewsPerClick = useCallback(() => {
    let base = 1;
    UPGRADES.filter(u => u.type === 'click').forEach(u => {
      const level = state.upgrades[u.id] || 0;
      base += level * u.value;
    });
    if (state.subscribers >= 10000000) base *= 5;
    else if (state.subscribers >= 1000000) base *= 2;
    else if (state.subscribers >= 100000) base *= 1.5;
    return base;
  }, [state.upgrades, state.subscribers]);

  const getViewsPerSecond = useCallback(() => {
    let base = 0;
    UPGRADES.filter(u => u.type === 'passive').forEach(u => {
      const level = state.upgrades[u.id] || 0;
      base += level * u.value;
    });
    if (state.subscribers >= 10000000) base *= 5;
    else if (state.subscribers >= 1000000) base *= 2;
    else if (state.subscribers >= 100000) base *= 1.5;
    return base;
  }, [state.upgrades, state.subscribers]);

  // Game Loop
  useEffect(() => {
    if (!user) return; // Only run game loop if logged in
    const interval = setInterval(() => {
      const vps = getViewsPerSecond();
      setState(prev => {
        const newViews = prev.views + vps / 10;
        const newTotalViews = prev.totalViews + vps / 10;
        const newMoney = prev.money + (vps / 10) * 0.001;
        const newSubs = prev.subscribers + (vps / 10) * 0.01;
        const newPlaytime = (prev.playtime || 0) + 0.1;
        return {
          ...prev,
          views: newViews, totalViews: newTotalViews, money: newMoney, subscribers: newSubs, playtime: newPlaytime
        };
      });
    }, 100);
    return () => clearInterval(interval);
  }, [getViewsPerSecond, user]);

  // Auto-save local
  useEffect(() => {
    localStorage.setItem('youtuber_clicker_save', JSON.stringify(state));
  }, [state]);

  const handleMainClick = (e: React.MouseEvent | React.TouchEvent) => {
    const vpc = getViewsPerClick();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }

    const id = particleIdCounter.current++;
    setParticles(prev => [...prev, { id, x, y, value: vpc }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1000);

    setState(prev => ({
      ...prev,
      views: prev.views + vpc,
      totalViews: prev.totalViews + vpc,
      money: prev.money + vpc * 0.001,
      subscribers: prev.subscribers + vpc * 0.01,
      clicks: (prev.clicks || 0) + 1
    }));
  };

  const buyUpgrade = (upgrade: Upgrade) => {
    const level = state.upgrades[upgrade.id] || 0;
    const price = Math.floor(upgrade.basePrice * Math.pow(upgrade.multiplier, level));
    if (state.money >= price) {
      setState(prev => ({
        ...prev,
        money: prev.money - price,
        upgrades: { ...prev.upgrades, [upgrade.id]: level + 1 }
      }));
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (!user) {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-zinc-950 items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.15),transparent_50%)]" />
        <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/20 mb-6 z-10">
          <Youtube className="text-white w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-8 z-10">Creator Studio</h1>
        
        <form onSubmit={handleAuth} className="w-full space-y-4 z-10">
          {authError && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm text-center">{authError}</div>}
          
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Username" 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-100 focus:outline-none focus:border-red-500 transition-colors"
                value={authForm.username}
                onChange={e => setAuthForm({...authForm, username: e.target.value})}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-100 focus:outline-none focus:border-red-500 transition-colors"
                value={authForm.password}
                onChange={e => setAuthForm({...authForm, password: e.target.value})}
                required
              />
            </div>
          </div>
          
          <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors">
            {authMode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
        
        <button 
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          className="mt-6 text-sm text-zinc-500 hover:text-zinc-300 transition-colors z-10"
        >
          {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-zinc-950 overflow-hidden relative">
      {/* Header / Stats */}
      <header className="p-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={openProfileModal}>
            <button 
              className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center shadow-lg border border-zinc-700 group-hover:border-red-500 transition-colors text-2xl"
              title="Edit Profile"
            >
              {user.avatar}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-zinc-400 uppercase group-hover:text-zinc-200 transition-colors">{user.username}'s Studio</h1>
                <Edit2 className="w-3 h-3 text-zinc-600 group-hover:text-red-500 transition-colors" />
              </div>
              <p className="text-xs text-zinc-500 font-mono">v1.3.0</p>
            </div>
          </div>
          <button onClick={logout} className="p-2 rounded-full hover:bg-zinc-800 transition-colors" title="Logout">
            <LogOut className="w-5 h-5 text-zinc-400 hover:text-red-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-800/50 p-3 rounded-2xl border border-zinc-700/50">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Users className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Subscribers</span>
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100">
              {formatNumber(state.subscribers)}
            </div>
          </div>
          <div className="bg-zinc-800/50 p-3 rounded-2xl border border-zinc-700/50">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <DollarSign className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Revenue</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              ${state.money.toFixed(2)}
            </div>
          </div>
        </div>
      </header>

      {currentTab === 'studio' ? (
        <>
          {/* Main Clicker Area */}
          <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.1),transparent_70%)]" />
            
            <div className="text-center mb-8 z-10">
              <div className="text-5xl font-black font-mono tracking-tighter text-zinc-100 mb-2">
                {formatNumber(state.views)}
              </div>
              <div className="text-sm font-medium text-zinc-500 uppercase tracking-[0.2em]">
                Total Views
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleMainClick}
              className="relative w-64 h-64 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center shadow-2xl shadow-black group z-10"
            >
              <div className="absolute inset-4 rounded-full border border-zinc-700/50 group-hover:border-red-500/50 transition-colors" />
              <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40 group-hover:bg-red-500 transition-colors">
                <Play className="text-white w-10 h-10 fill-current ml-1" />
              </div>
              <div className="absolute inset-0 rounded-full border border-zinc-800 animate-ping opacity-20" />
            </motion.button>

            <div className="mt-12 grid grid-cols-2 gap-8 w-full z-10">
              <div className="text-center">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Per Click</div>
                <div className="text-lg font-mono font-bold text-zinc-300">+{formatNumber(getViewsPerClick())}</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Per Second</div>
                <div className="text-lg font-mono font-bold text-zinc-300">+{formatNumber(getViewsPerSecond())}</div>
              </div>
            </div>

            <AnimatePresence>
              {particles.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 1, y: p.y - 20, x: p.x - 20 }}
                  animate={{ opacity: 0, y: p.y - 150 }}
                  exit={{ opacity: 0 }}
                  className="fixed pointer-events-none text-red-500 font-mono font-bold text-xl z-50"
                >
                  +{formatNumber(p.value)}
                </motion.div>
              ))}
            </AnimatePresence>
          </main>

          {/* Upgrades Drawer */}
          <section className="h-1/3 bg-zinc-900 border-t border-zinc-800 p-4 overflow-y-auto z-20">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-zinc-900 py-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Upgrades & Gear</h2>
              <div className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                ${state.money.toFixed(2)}
              </div>
            </div>

            <div className="space-y-3">
              {UPGRADES.map(upgrade => {
                const level = state.upgrades[upgrade.id] || 0;
                const price = Math.floor(upgrade.basePrice * Math.pow(upgrade.multiplier, level));
                const canAfford = state.money >= price;
                const Icon = ICON_MAP[upgrade.icon] || Camera;

                return (
                  <button
                    key={upgrade.id}
                    onClick={() => buyUpgrade(upgrade)}
                    disabled={!canAfford}
                    className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-all ${
                      canAfford 
                        ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 active:scale-[0.98]' 
                        : 'bg-zinc-900/50 border-zinc-800 opacity-60 grayscale'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${canAfford ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-500'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-zinc-200">{upgrade.name}</span>
                        <span className="text-[10px] font-mono text-zinc-500">LVL {level}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{upgrade.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-emerald-400">${price}</span>
                        <span className="text-[10px] text-zinc-600">•</span>
                        <span className="text-[10px] text-zinc-400">+{upgrade.value} {upgrade.type === 'click' ? 'view/click' : 'view/sec'}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </button>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        /* Leaderboard Area */
        <main className="flex-1 overflow-y-auto p-4 bg-zinc-950 flex flex-col">
          <div className="flex items-center gap-3 mb-4 sticky top-0 bg-zinc-950/90 backdrop-blur py-2 z-10">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-widest">Global Top</h2>
          </div>

          <div className="flex bg-zinc-900 rounded-xl p-1 mb-4 shrink-0">
            <button 
              onClick={() => setLeaderboardType('subscribers')}
              className={`flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${leaderboardType === 'subscribers' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Subs
            </button>
            <button 
              onClick={() => setLeaderboardType('playtime')}
              className={`flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${leaderboardType === 'playtime' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Time
            </button>
            <button 
              onClick={() => setLeaderboardType('money')}
              className={`flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${leaderboardType === 'money' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Money
            </button>
            <button 
              onClick={() => setLeaderboardType('clicks')}
              className={`flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${leaderboardType === 'clicks' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Clicks
            </button>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pb-20">
            {leaderboard.length === 0 ? (
              <div className="text-center text-zinc-500 py-10">Loading leaderboard...</div>
            ) : (
              leaderboard.map((u, index) => (
                <div key={index} className={`flex items-center gap-3 p-4 rounded-2xl border ${index < 3 ? 'bg-zinc-900/80 border-zinc-700' : 'bg-zinc-900/40 border-zinc-800'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-sm shrink-0 ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                    index === 1 ? 'bg-zinc-300/20 text-zinc-300' : 
                    index === 2 ? 'bg-amber-700/20 text-amber-600' : 
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="text-2xl shrink-0">{u.avatar || '😎'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-zinc-200 truncate">{u.username}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                      {leaderboardType === 'subscribers' && <><Users className="w-3 h-3" /> {formatNumber(u.subscribers)} subs</>}
                      {leaderboardType === 'playtime' && <><Clock className="w-3 h-3" /> {formatTime(u.playtime)} played</>}
                      {leaderboardType === 'money' && <><DollarSign className="w-3 h-3" /> ${formatNumber(u.money)}</>}
                      {leaderboardType === 'clicks' && <><MousePointer2 className="w-3 h-3" /> {formatNumber(u.clicks)} clicks</>}
                    </div>
                  </div>
                  {u.username === user.username && (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-2 py-1 rounded-full shrink-0">
                      You
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-widest">Edit Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="p-2 rounded-full hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5 text-zinc-500 hover:text-white" />
              </button>
            </div>
            
            {profileError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm text-center">{profileError}</div>}
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Username</label>
              <input 
                type="text" 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-100 focus:outline-none focus:border-red-500 transition-colors"
                value={editProfileForm.username}
                onChange={e => setEditProfileForm({...editProfileForm, username: e.target.value})}
                maxLength={15}
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Avatar</label>
              <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1">
                {AVATARS.map(a => (
                  <button 
                    key={a} 
                    onClick={() => setEditProfileForm({...editProfileForm, avatar: a})} 
                    className={`text-3xl p-2 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${
                      editProfileForm.avatar === a ? 'bg-zinc-800 border-red-500 shadow-lg shadow-red-500/20' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleSaveProfile}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <nav className="flex items-center justify-around p-4 bg-zinc-950 border-t border-zinc-900 z-30">
        <button 
          onClick={() => setCurrentTab('studio')}
          className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'studio' ? 'text-red-500' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
          <Play className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Studio</span>
        </button>
        <button 
          onClick={() => setCurrentTab('leaderboard')}
          className={`flex flex-col items-center gap-1 transition-colors ${currentTab === 'leaderboard' ? 'text-red-500' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
          <Trophy className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Top</span>
        </button>
      </nav>
    </div>
  );
}
