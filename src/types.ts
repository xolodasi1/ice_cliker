export interface Upgrade {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  multiplier: number;
  type: 'click' | 'passive';
  value: number; // views per click or views per second
  icon: string;
}

export interface GameState {
  views: number;
  subscribers: number;
  money: number;
  totalViews: number;
  upgrades: Record<string, number>; // id -> level
  lastSave: number;
  playtime: number;
  clicks: number;
  energy: number;
  maxEnergy: number;
}

export interface Food {
  id: string;
  name: string;
  description: string;
  price: number; // in clicks
  energyRestore: number;
  icon: string;
}

export interface Milestone {
  id: string;
  name: string;
  requirement: number;
  reward: string;
  icon: string;
}
