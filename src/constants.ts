import { Upgrade, Milestone } from './types';

export const UPGRADES: Upgrade[] = [
  {
    id: 'camera_1',
    name: 'Webcam 720p',
    description: 'Better quality means more views per click.',
    basePrice: 15,
    multiplier: 1.15,
    type: 'click',
    value: 1,
    icon: 'Camera',
  },
  {
    id: 'mic_1',
    name: 'Budget Mic',
    description: 'Clearer audio for your viewers.',
    basePrice: 100,
    multiplier: 1.2,
    type: 'click',
    value: 5,
    icon: 'Mic',
  },
  {
    id: 'lighting_1',
    name: 'Ring Light',
    description: 'Look professional! Passive views every second.',
    basePrice: 50,
    multiplier: 1.1,
    type: 'passive',
    value: 1,
    icon: 'Sun',
  },
  {
    id: 'editor_1',
    name: 'Freelance Editor',
    description: 'Someone to cut your videos while you sleep.',
    basePrice: 500,
    multiplier: 1.25,
    type: 'passive',
    value: 10,
    icon: 'Scissors',
  },
  {
    id: 'setup_1',
    name: 'Gaming Chair',
    description: 'Increases both click and passive gains.',
    basePrice: 2000,
    multiplier: 1.3,
    type: 'passive',
    value: 50,
    icon: 'Armchair',
  },
  {
    id: 'viral_1',
    name: 'Clickbait Master',
    description: 'Huge boost to views per click.',
    basePrice: 5000,
    multiplier: 1.4,
    type: 'click',
    value: 200,
    icon: 'Zap',
  }
];

export const MILESTONES: Milestone[] = [
  {
    id: 'silver',
    name: 'Silver Play Button',
    requirement: 100000,
    reward: '1.5x Multiplier to all gains',
    icon: 'Award',
  },
  {
    id: 'gold',
    name: 'Gold Play Button',
    requirement: 1000000,
    reward: '2x Multiplier to all gains',
    icon: 'Trophy',
  },
  {
    id: 'diamond',
    name: 'Diamond Play Button',
    requirement: 10000000,
    reward: '5x Multiplier to all gains',
    icon: 'Star',
  }
];
