export interface Resources {
  food: number;
  water: number;
  materials: number;
  survivors: number;
}

export interface BaseUpgrade {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  cost: Partial<Resources>;
  effect: (level: number) => Partial<Resources>;
}

export interface Building {
  id: string;
  name: string;
  description: string;
  cost: Partial<Resources>;
  production: Partial<Resources>;
  imageUrl?: string;
  type?: 'house' | 'water_collector';
  level?: number;
}

export interface MapLocation {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  discovered: boolean;
  scavenged: boolean;
  building?: Building;
  resources?: Partial<Resources>;
  isBase?: boolean;
  owner?: string | null;
  scavengeTime?: number;
  lastScavenged?: number | null;
}

export interface Disaster {
  id: string;
  name: string;
  description: string;
  effect: (resources: Resources) => Partial<Resources>;
  probability: number;
}

export interface AIAttack {
  id: string;
  name: string;
  description: string;
  strength: number;
  resources: Partial<Resources>;
  locationId?: string;
  locationName?: string;
  success?: boolean;
  survivorsLost?: number;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

export interface GameState {
  resources: Resources;
  upgrades: BaseUpgrade[];
  locations: MapLocation[];
  lastSave: number;
  autoScavengeEnabled: boolean;
} 