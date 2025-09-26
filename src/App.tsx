import React, { useEffect, useRef, useState } from "react";
import { ResourcePanel } from './components/ResourcePanel';
import { AIAttack, BaseUpgrade, Building, Disaster, MapLocation, Notification, Resources } from './types';

// Constants
const SAVE_KEY = "apocalypse-idle-save";
const AUTO_SAVE_INTERVAL = 10000;
const DISASTER_CHANCE = 0.002;
const AI_ATTACK_CHANCE = 0.02;
const HOUSE_CAPACITY = 2;
const UNHOUSED_SURVIVOR_DEATH_RATE = 0.01;
const EXPLORATION_COST = { materials: 20 };

// Initial state
const initialResources: Resources = {
  food: 100,
  water: 100,
  materials: 50,
  survivors: 5,
};

const initialUpgrades: BaseUpgrade[] = [
  {
    id: 'food_production',
    name: 'Food Production',
    description: 'Increases food production rate',
    level: 1,
    maxLevel: 5,
    cost: { materials: 50 },
    effect: (level) => ({ food: level * 0.2 }),
  },
  {
    id: 'water_production',
    name: 'Water Production',
    description: 'Increases water production rate',
    level: 1,
    maxLevel: 5,
    cost: { materials: 50 },
    effect: (level) => ({ water: level * 0.2 }),
  },
  {
    id: 'material_production',
    name: 'Material Production',
    description: 'Increases material production rate',
    level: 1,
    maxLevel: 5,
    cost: { materials: 50 },
    effect: (level) => ({ materials: level * 0.2 }),
  },
];

const disasters: Disaster[] = [
  {
    id: 'food_shortage',
    name: 'Food Shortage',
    description: 'A severe food shortage has occurred!',
    effect: (resources) => ({ food: -resources.food * 0.2 }),
    probability: 0.1,
  },
  {
    id: 'water_contamination',
    name: 'Water Contamination',
    description: 'The water supply has been contaminated!',
    effect: (resources) => ({ water: -resources.water * 0.2 }),
    probability: 0.1,
  },
  {
    id: 'survivor_loss',
    name: 'Survivor Loss',
    description: 'Some survivors have perished!',
    effect: (resources) => ({ survivors: -Math.floor(resources.survivors * 0.1) }),
    probability: 0.05,
  },
];

const availableBuildings: Building[] = [
  {
    id: 'house',
    name: 'House',
    description: 'Provides shelter for survivors',
    cost: { materials: 30, food: 10 },
    production: { survivors: 0.1 },
    type: 'house',
    level: 0,
    imageUrl: 'https://img.icons8.com/ios-filled/50/ffffff/home.png',
  },
  {
    id: 'water_collector',
    name: 'Water Collector',
    description: 'Collects water from the atmosphere',
    cost: { materials: 40 },
    production: { water: 0.3 },
    type: 'water_collector',
    level: 0,
  },
];

const ApocalypticGame: React.FC = () => {
  // State
  const [resources, setResources] = useState<Resources>(initialResources);
  const [upgrades, setUpgrades] = useState<BaseUpgrade[]>(initialUpgrades);
  const [activeTab, setActiveTab] = useState<"resources" | "map">("resources");
  const [isMobile, setIsMobile] = useState(false);
  const [showRadialMenu, setShowRadialMenu] = useState(false);
  const [radialMenuPosition, setRadialMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [showDisaster, setShowDisaster] = useState<Disaster | null>(null);
  const [autoScavengeEnabled, setAutoScavengeEnabled] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [scavengeResult, setScavengeResult] = useState<Partial<Resources> | null>(null);
  const [showAttackResult, setShowAttackResult] = useState<{ success: boolean; locationName: string; resourcesGained?: Partial<Resources>; survivorsLost?: number } | null>(null);
  const [showAIAttack, setShowAIAttack] = useState<AIAttack | null>(null);
  const [showAttackedAnimation, setShowAttackedAnimation] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [waitingForScavengePopup, setWaitingForScavengePopup] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(() => {
    const savedGame = localStorage.getItem(SAVE_KEY);
    return !savedGame;
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [locations, setLocations] = useState<MapLocation[]>(generateInitialGrid());

  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const GRID_SIZE = 5;

  const locationNames = [
    "Dustfield",
    "Ashrock",
    "Ironpit",
    "Deadwell",
    "Cragpoint",
    "Burnpass",
    "Mudspire",
    "Wretchend",
    "Redhollow",
    "Saltmoor",
    "Scraptown",
    "Charcliff",
    "Dryreach",
    "Ragbank",
    "Blightden",
    "Boneplain",
    "Rustbarrow",
    "Smokefall",
    "Shivglen",
    "Flintgorge",
    "Gravefen",
    "Scorchbay",
    "Fogscar",
    "Ruinstep",
    "Crimsonlot",
  ];

  const generateInitialGrid = (): MapLocation[] => {
    const grid: MapLocation[] = [];
    const center = Math.floor(GRID_SIZE / 2);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isBase = x === center && y === center;
        grid.push({
          id: `${x}-${y}`,
          name: isBase ? 'Base' : `Location ${x}-${y}`,
          description: isBase ? 'Your base of operations' : 'An unexplored location',
          position: { x, y },
          discovered: isBase,
          scavenged: false,
          isBase,
          owner: isBase ? 'player' : null,
          scavengeTime: isBase ? 0 : Math.floor(Math.random() * 60) + 30,
          lastScavenged: null,
        });
      }
    }
    return grid;
  };

  const resourcesRef = useRef(resources);
  const upgradesRef = useRef(upgrades);

  useEffect(() => {
    resourcesRef.current = resources;
  }, [resources]);
  useEffect(() => {
    upgradesRef.current = upgrades;
  }, [upgrades]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedGame = localStorage.getItem(SAVE_KEY);
    if (savedGame) {
      const { resources: savedResources, upgrades: savedUpgrades, locations: savedLocations } = JSON.parse(savedGame);
      setResources(savedResources);
      setUpgrades(savedUpgrades);
      setLocations(savedLocations);
    }
  }, []);

  useEffect(() => {
    const autoSave = () => {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          resources,
          upgrades,
          locations,
        })
      );
    };

    const interval = setInterval(autoSave, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [resources, upgrades, locations]);

  function floorResources(res: Resources): Resources {
    return {
      food: Math.floor(res.food),
      water: Math.floor(res.water),
      materials: Math.floor(res.materials),
      survivors: Math.floor(res.survivors),
    };
  }

  function isEqualResources(a: Resources, b: Resources): boolean {
    return (
      a.food === b.food &&
      a.water === b.water &&
      a.materials === b.materials &&
      a.survivors === b.survivors
    );
  }

  useEffect(() => {
    const gameLoop = () => {
      // Update resources based on buildings and upgrades
      const newResources = { ...resources };
      
      // Apply building production
      buildings.forEach((building) => {
        Object.entries(building.production).forEach(([resource, amount]) => {
          newResources[resource as keyof Resources] += amount;
        });
      });

      // Apply upgrade effects
      upgrades.forEach((upgrade) => {
        const effect = upgrade.effect(upgrade.level);
        Object.entries(effect).forEach(([resource, amount]) => {
          newResources[resource as keyof Resources] += amount;
        });
      });

      // Check for disasters
      disasters.forEach((disaster) => {
        if (Math.random() < disaster.probability) {
          const effect = disaster.effect(newResources);
          Object.entries(effect).forEach(([resource, amount]) => {
            newResources[resource as keyof Resources] += amount;
          });
          setShowDisaster(disaster);
          addNotification(`Disaster: ${disaster.name}`, 'error');
        }
      });

      // Auto scavenge
      if (autoScavengeEnabled) {
        locations.forEach((loc) => {
          if (loc.scavengeTime && loc.scavengeTime > 0 && !loc.lastScavenged) {
            const scavengeAmount = Math.floor(Math.random() * 10) + 5;
            newResources.materials += scavengeAmount;
            addNotification(`Auto scavenged ${scavengeAmount} materials from ${loc.name}`, 'info');
            loc.lastScavenged = Date.now();
          }
        });
      }

      setResources(newResources);
    };

    gameLoopRef.current = setInterval(gameLoop, 1000);
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [resources, buildings, upgrades, locations, autoScavengeEnabled]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (waitingForScavengePopup || scavengeResult) return;

      const finished = locations.find(
        (loc) =>
          loc.lastScavenged &&
          loc.scavengeTime > 0 &&
          now - loc.lastScavenged >= loc.scavengeTime,
      );

      if (finished) finalizeScavenge(finished);
    }, 1000);

    return () => clearInterval(interval);
  }, [locations, waitingForScavengePopup, scavengeResult]);

  const applyDisaster = (disaster: Disaster) => {
    setResources((prev) => ({
      food: Math.max(0, prev.food + (disaster.effect.food || 0)),
      water: Math.max(0, prev.water + (disaster.effect.water || 0)),
      materials: Math.max(0, prev.materials + (disaster.effect.materials || 0)),
      survivors: Math.max(1, prev.survivors + (disaster.effect.survivors || 0)),
    }));
  };

  const checkAutoScavenge = () => {
    if (waitingForScavengePopup) return;

    const now = Date.now();

    setLocations((prev) => {
      let hasActiveScavenge = false;
      let updated = false;

      const newLocations = prev.map((loc) => {
        if (loc.lastScavenged && loc.scavengeTime > 0) {
          if (now - loc.lastScavenged >= loc.scavengeTime && !updated) {
            const loot = {
              food: loc.resources.food || 0,
              water: loc.resources.water || 0,
              materials: loc.resources.materials || 0,
              survivors: loc.resources.survivors || 0,
            };

            finalizeScavenge(loc);
            updated = true;
            return loc;
          }

          hasActiveScavenge = true;
          return loc;
        }

        return loc;
      });

      if (!hasActiveScavenge && !updated) {
        const targetIndex = newLocations.findIndex(
          (loc) =>
            loc.discovered &&
            !loc.lastScavenged &&
            loc.scavengeTime > 0 &&
            Object.values(loc.resources).some((v) => v && v > 0),
        );

        if (targetIndex !== -1) {
          newLocations[targetIndex] = {
            ...newLocations[targetIndex],
            lastScavenged: now,
          };
          updated = true;
        }
      }

      return newLocations;
    });
  };

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: Notification = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };
    setNotifications((prev) => [...prev, notification]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const finalizeScavenge = (location: MapLocation) => {
    const loot = {
      food: location.resources.food || 0,
      water: location.resources.water || 0,
      materials: location.resources.materials || 0,
      survivors: location.resources.survivors || 0,
    };

    const resourceMessages = Object.entries(loot)
      .filter(([_, value]) => value > 0)
      .map(([resource, value]) => `${value} ${resource}`)
      .join(', ');
    
    if (resourceMessages) {
      addNotification(`Found resources: ${resourceMessages}`, 'success');
    }

    setResources((prevResources) => ({
      food: prevResources.food + loot.food,
      water: prevResources.water + loot.water,
      materials: prevResources.materials + loot.materials,
      survivors: prevResources.survivors + loot.survivors,
    }));

    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === location.id
          ? { ...loc, lastScavenged: null, resources: {}, wasScavenged: true }
          : loc,
      ),
    );
  };

  const handleMapClick = (
    e: React.MouseEvent<HTMLDivElement>,
    location: MapLocation,
  ) => {
    e.stopPropagation();
    if (!location.discovered && location.id !== "base") return;

    setSelectedLocation(location);
    setRadialMenuPosition({ x: e.clientX, y: e.clientY });
    setShowRadialMenu(true);
  };

  const scavengeLocation = (location: MapLocation) => {
    if (location.lastScavenged || location.scavengeTime === 0) return;

    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === location.id ? { ...loc, lastScavenged: Date.now() } : loc,
      ),
    );
    setShowRadialMenu(false);
  };

  const exploreNearby = () => {
    if (!selectedLocation) return;

    const cost = EXPLORATION_COST;
    const canAfford = Object.entries(cost).every(
      ([resource, amount]) => resources[resource as keyof Resources] >= (amount || 0)
    );

    if (!canAfford) {
      setShowAttackResult({
        success: false,
        locationName: "Exploration",
        survivorsLost: 0,
      });
      setShowRadialMenu(false);
      return;
    }

    setResources(prev => {
      const newResources = { ...prev };
      Object.entries(cost).forEach(([resource, amount]) => {
        newResources[resource as keyof Resources] -= amount || 0;
      });
      return newResources;
    });

    const getGridCoords = (id: string) => {
      const match = id.match(/cell-(\d+)-(\d+)/);
      if (!match) return null;
      return { x: parseInt(match[1]), y: parseInt(match[2]) };
    };

    const selectedCoords = getGridCoords(selectedLocation.id);
    if (!selectedCoords) return;

    setLocations((prev) =>
      prev.map((loc) => {
        const coords = getGridCoords(loc.id);
        if (!coords || loc.discovered) return loc;

        const dx = Math.abs(coords.x - selectedCoords.x);
        const dy = Math.abs(coords.y - selectedCoords.y);

        if (dx <= 1 && dy <= 1) {
          return { ...loc, discovered: true };
        }

        return loc;
      }),
    );

    setShowRadialMenu(false);
  };

  const purchaseUpgrade = (upgrade: BaseUpgrade) => {
    if (upgrade.level >= upgrade.maxLevel) return;

    const canAfford = Object.entries(upgrade.cost).every(
      ([resource, amount]) => resources[resource as keyof Resources] >= amount
    );

    if (!canAfford) {
      addNotification('Not enough resources to purchase upgrade', 'error');
      return;
    }

    // Deduct cost
    const newResources = { ...resources };
    Object.entries(upgrade.cost).forEach(([resource, amount]) => {
      newResources[resource as keyof Resources] -= amount;
    });

    // Apply upgrade
    const newUpgrades = upgrades.map((u) =>
      u.id === upgrade.id ? { ...u, level: u.level + 1 } : u
    );

    setResources(newResources);
    setUpgrades(newUpgrades);
    addNotification(`Upgraded ${upgrade.name} to level ${upgrade.level + 1}`, 'success');
  };

  const getScavengeProgress = (location: MapLocation) => {
    if (!location.lastScavenged || location.scavengeTime === 0) return 0;
    const elapsed = Date.now() - location.lastScavenged;
    return Math.min(100, (elapsed / location.scavengeTime) * 100);
  };

  const attackLocation = (location: MapLocation) => {
    const success = Math.random() < 0.7;

    if (success) {
      const materialsGained = 20 + Math.floor(Math.random() * 30);
      setResources((prev) => ({
        ...prev,
        materials: prev.materials + materialsGained,
      }));
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === location.id ? { ...loc, owner: "player" } : loc,
        ),
      );
      setShowAttackResult({
        success: true,
        locationName: location.name,
        resourcesGained: { materials: materialsGained },
      });
      setShowAttackedAnimation(location.id);
    } else {
      const survivorsLost = 1;
      setResources((prev) => ({
        ...prev,
        survivors: Math.max(0, prev.survivors - survivorsLost),
      }));
      setShowAttackResult({
        success: false,
        locationName: location.name,
        survivorsLost: survivorsLost,
      });
    }
    setShowRadialMenu(false);
  };

  const buyBackLocation = (location: MapLocation) => {
    const cost = { materials: 50 };

    const canAfford = Object.entries(cost).every(
      ([resource, amount]) => resources[resource as keyof Resources] >= (amount || 0)
    );

    if (canAfford) {
      setResources(prev => {
        const newResources = { ...prev };
        Object.entries(cost).forEach(([resource, amount]) => {
          newResources[resource as keyof Resources] -= amount || 0;
        });
        return newResources;
      });

      setLocations(prev =>
        prev.map(loc =>
          loc.id === location.id ? { ...loc, owner: "player" } : loc
        )
      );
      setShowAttackedAnimation(location.id);
      setShowRadialMenu(false);
    } else {
      console.log("Cannot afford to buy back this location.");
    }
  };

  const startNewGame = () => {
    setResources(initialResources);
    setUpgrades(initialUpgrades);
    setLocations(generateInitialGrid());
    setBuildings([]);
    setIsFirstTimeUser(false);
    setIsGameOver(false);
    addNotification('New game started!', 'success');
  };

  useEffect(() => {
    if (showAttackedAnimation) {
      const timer = setTimeout(() => {
        setShowAttackedAnimation(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showAttackedAnimation]);

  const GameOver = () => {
    if (!isGameOver) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 pointer-events-auto">
        <div className="relative bg-gray-900 border border-red-700 rounded-xl p-8 max-w-md shadow-2xl text-center animate-fade-in">
          <h3 className="text-4xl font-bold text-red-500 mb-6 drop-shadow-md">
            Game Over
          </h3>
          <p className="text-gray-200 text-lg mb-8">
            All your survivors have perished. The wasteland has claimed another settlement.
          </p>
          <div className="space-y-4">
            <button
              onClick={startNewGame}
              className="w-full px-6 py-3 rounded-lg text-lg font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 shadow-md bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white"
            >
              Start New Game
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NewGame = () => {
    if (!isFirstTimeUser) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 pointer-events-auto">
        <div className="relative bg-gray-900 border border-blue-700 rounded-xl p-8 max-w-md shadow-2xl text-center animate-fade-in">
          <h3 className="text-4xl font-bold text-blue-500 mb-6 drop-shadow-md">
            Welcome to Wasteland Survivor
          </h3>
          <p className="text-gray-200 text-lg mb-8">
            Lead your survivors through the post-apocalyptic wasteland. Gather resources, expand your territory, and survive against all odds.
          </p>
          <div className="space-y-4">
            <button
              onClick={startNewGame}
              className="w-full px-6 py-3 rounded-lg text-lg font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 shadow-md bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white"
            >
              Start New Game
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Notifications = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`px-4 py-2 rounded-lg shadow-lg transform transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-green-600'
              : notification.type === 'error'
              ? 'bg-red-600'
              : 'bg-blue-600'
          }`}
        >
          <p className="text-white font-medium">{notification.message}</p>
        </div>
      ))}
    </div>
  );

  useEffect(() => {
    if (resources.survivors <= 0 && !isGameOver) {
      setIsGameOver(true);
    }
  }, [resources.survivors, isGameOver]);

  const triggerAIAttack = () => {
    const playerOwnedLocations = locations.filter(
      (loc) => loc.owner === "player" && !loc.isBase
    );

    if (playerOwnedLocations.length > 0) {
      const targetLocation =
        playerOwnedLocations[Math.floor(Math.random() * playerOwnedLocations.length)];
      const success = Math.random() < 0.75;

      setShowAttackedAnimation(targetLocation.id);

      if (success) {
        setLocations((prev) =>
          prev.map((loc) =>
            loc.id === targetLocation.id ? { ...loc, owner: null } : loc
          )
        );
        setResources((prev) => ({
          ...prev,
          survivors: Math.max(0, prev.survivors - 1),
        }));
        setShowAIAttack({
          locationId: targetLocation.id,
          locationName: targetLocation.name,
          success: true,
          survivorsLost: 1,
        });
      } else {
        setShowAIAttack({
          locationId: targetLocation.id,
          locationName: targetLocation.name,
          success: false,
        });
      }
    }
  };

  const HowToPlay = () => {
    if (!showHowToPlay) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 pointer-events-auto">
        <div className="relative bg-gray-900 border border-blue-700 rounded-xl p-8 max-w-2xl shadow-2xl text-center animate-fade-in">
          <h3 className="text-4xl font-bold text-blue-500 mb-6 drop-shadow-md font-display">
            How to Play
          </h3>
          <div className="text-gray-200 text-lg space-y-4 text-left">
            <p>
              Welcome to Wasteland Survivor! Your goal is to lead your group of survivors through a post-apocalyptic world. Here's how to play:
            </p>
            <h4 className="text-xl font-semibold text-blue-300 mt-4">Resources:</h4>
            <p>Gather Food, Water, Materials, and manage your Survivors. These are essential for survival and progress.</p>

            <h4 className="text-xl font-semibold text-blue-300 mt-4">Map & Exploration:</h4>
            <p>Click on map locations to open a radial menu. You can Scavenge locations for resources, Attack rival locations to take them over, or Explore nearby to discover new areas. Exploring costs materials.</p>

            <h4 className="text-xl font-semibold text-blue-300 mt-4">Buildings:</h4>
            <p>From the Resources panel, you can drag and drop buildings like Houses onto available map squares. Houses provide shelter for your survivors; without enough housing, survivors will freeze and die!</p>

            <h4 className="text-xl font-semibold text-blue-300 mt-4">Upgrades:</h4>
            <p>Invest in base upgrades to increase your resource production and survivor attraction.</p>

            <h4 className="text-xl font-semibold text-blue-300 mt-4">Threats:</h4>
            <p>Beware of random Disasters and Rival Clan attacks. These events can deplete your resources and survivors, so be prepared!</p>

            <h4 className="text-xl font-semibold text-blue-300 mt-4">Game Over:</h4>
            <p>The game ends if all your survivors are lost. You can always start a new game to try again!</p>
          </div>
          <button
            onClick={() => setShowHowToPlay(false)}
            className="w-full mt-8 px-6 py-3 rounded-lg text-lg font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 shadow-md bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white"
          >
            Got It!
          </button>
        </div>
      </div>
    );
  };

  const MapView = ({
    buildings,
    availableBuildings,
    setBuildings,
    setResources,
    locations,
    showAttackedAnimation,
  }: {
    buildings: Building[];
    availableBuildings: Building[];
    setBuildings: React.Dispatch<React.SetStateAction<Building[]>>;
    setResources: React.Dispatch<React.SetStateAction<Resources>>;
    locations: MapLocation[];
    showAttackedAnimation: string | null;
  }) => {
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, locationId: string) => {
      e.preventDefault();
      const buildingId = e.dataTransfer.getData("buildingId");
      const buildingBlueprint = availableBuildings.find((b) => b.id === buildingId);
      const targetLocation = locations.find((loc) => loc.id === locationId);

      if (!buildingBlueprint || !targetLocation) return;

      const isLocationOccupied = buildings.some(b => b.locationId === locationId);
      if (!targetLocation.discovered || targetLocation.owner !== "player" || targetLocation.isBase || isLocationOccupied) {
        return;
      }

      const canAfford = Object.entries(buildingBlueprint.cost).every(
        ([resource, cost]) => resources[resource as keyof Resources] >= (cost || 0)
      );

      if (!canAfford) {
        return;
      }

      setResources(prev => {
        const newResources = { ...prev };
        Object.entries(buildingBlueprint.cost).forEach(([resource, cost]) => {
          newResources[resource as keyof Resources] -= cost || 0;
        });
        return newResources;
      });

      const newBuilding: Building = {
        ...buildingBlueprint,
        id: `${buildingBlueprint.type}-${Date.now()}`,
        locationId: locationId,
      };
      setBuildings(prev => [...prev, newBuilding]);
    };

    return (
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-8 shadow-2xl h-full flex flex-col overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-gray-800 before:via-gray-900 before:to-black before:opacity-50 before:rounded-xl">
        <h2 className="relative z-10 text-2xl sm:text-4xl font-black text-white mb-4 sm:mb-8 text-center drop-shadow-md">
          Wasteland Map
        </h2>
        <div
          className="relative z-10 grid bg-gray-950 border border-gray-700 rounded-lg aspect-square shadow-inner overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          }}
          onClick={() => setShowRadialMenu(false)}
        >
          {locations.map((location) => {
            const isAnimatingTakeover = showAttackedAnimation === location.id;
            const placedBuilding = buildings.find(b => b.locationId === location.id);

            return (
              <div
                key={location.id}
                className={`relative flex items-center justify-center p-0.5 sm:p-1 transition-all duration-300 group ${location.discovered ? "cursor-pointer" : "opacity-30"} ${isAnimatingTakeover ? 'animate-pulse' : ''} ${location.id === showAttackedAnimation ? 'border-2 sm:border-4 border-red-500 animate-pulse-fast' : ''}`}
                onClick={(e) => handleMapClick(e, location)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, location.id)}
              >
                {location.discovered ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center text-center rounded-md overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-300 border border-transparent group-hover:border-blue-500">
                    <div
                      className={`w-full h-full flex items-center justify-center text-2xl sm:text-4xl transform transition-all duration-300 group-hover:scale-105 ${location.isBase || location.owner === "player" ? "bg-green-700" : "bg-blue-700"}`}
                    >
                      {placedBuilding ? (
                        placedBuilding.imageUrl ? (
                          <img src={placedBuilding.imageUrl} alt={placedBuilding.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain mx-auto" />
                        ) : (
                          <BaseIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                        )
                      ) : (
                        location.isBase ? (
                          <BaseIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                        ) : location.owner === "player" ? (
                          <ResourcesIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                        ) : location.resources && Object.values(location.resources).some(val => val && val > 0) ? (
                          <ResourcesIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                        ) : null
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 p-0.5 text-center backdrop-blur-sm group-hover:bg-opacity-90 transition-opacity">
                      <p className="text-[8px] sm:text-xs font-medium text-gray-200 truncate">
                        {location.name}
                      </p>
                    </div>
                    {location.lastScavenged && location.scavengeTime > 0 && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 sm:h-1 bg-gray-700 rounded-t">
                        <div
                          className="h-full bg-yellow-500 rounded-t transition-all duration-1000"
                          style={{ width: `${getScavengeProgress(location)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full rounded-md bg-gray-800 flex items-center justify-center text-2xl sm:text-4xl opacity-50 animate-pulse border border-gray-700"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-outfit antialiased relative overflow-hidden">
      <Notifications />
      
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none" 
        style={{ 
          backgroundImage: `url('https://www.transparenttextures.com/patterns/dust-and-stones.png')`, 
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed'
        }}
      ></div>
      
      {!isGameOver && (
        <>
          {isMobile ? (
            <div className="relative z-10 px-2 py-4 h-screen flex flex-col bg-gray-950 bg-opacity-95 pointer-events-auto">
              <h1 className="text-3xl font-black text-center mb-4 text-white drop-shadow-lg leading-tight tracking-tight">
                Wasteland
                <br />
                Survivor
              </h1>
              <div className="flex mb-4 bg-gray-800 rounded-lg p-1 shadow-inner border border-gray-700">
                <button
                  onClick={() => setActiveTab("resources")}
                  className={`flex-1 py-2 px-3 rounded-md text-base font-bold transition-all duration-300 ${
                    activeTab === "resources"
                      ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  Resources
                </button>
                <button
                  onClick={() => setActiveTab("map")}
                  className={`flex-1 py-2 px-3 rounded-md text-base font-bold transition-all duration-300 ${
                    activeTab === "map"
                      ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  Map
                </button>
              </div>
              {activeTab === "resources" ? (
                <ResourcePanel
                  resources={resources}
                  upgrades={upgrades}
                  autoScavengeEnabled={autoScavengeEnabled}
                  purchaseUpgrade={purchaseUpgrade}
                  setAutoScavengeEnabled={setAutoScavengeEnabled}
                  availableBuildings={availableBuildings}
                />
              ) : (
                <div className="flex-1 overflow-hidden">
                  <MapView
                    buildings={buildings}
                    availableBuildings={availableBuildings}
                    setBuildings={setBuildings}
                    setResources={setResources}
                    locations={locations}
                    showAttackedAnimation={showAttackedAnimation}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="relative z-10 flex h-screen p-8 gap-8 bg-gray-950 bg-opacity-95">
              <div className="w-1/2 flex flex-col">
                <h1 className="text-5xl font-black mb-8 text-white drop-shadow-lg leading-tight text-center tracking-tight">
                  Wasteland
                  <br />
                  Survivor
                </h1>
                <ResourcePanel
                  resources={resources}
                  upgrades={upgrades}
                  autoScavengeEnabled={autoScavengeEnabled}
                  purchaseUpgrade={purchaseUpgrade}
                  setAutoScavengeEnabled={setAutoScavengeEnabled}
                  availableBuildings={availableBuildings}
                />
              </div>
              <div className="w-1/2 flex flex-col h-full">
                <MapView
                  buildings={buildings}
                  availableBuildings={availableBuildings}
                  setBuildings={setBuildings}
                  setResources={setResources}
                  locations={locations}
                  showAttackedAnimation={showAttackedAnimation}
                />
              </div>
            </div>
          )}
        </>
      )}

      {!isGameOver && !isFirstTimeUser && (
        <button
          onClick={() => setShowHowToPlay(true)}
          className="fixed bottom-4 right-4 px-6 py-3 rounded-lg text-lg font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 shadow-md bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white z-40"
        >
          How to Play
        </button>
      )}

      {(showRadialMenu || showDisaster || scavengeResult || showAttackResult || showAIAttack || isGameOver || isFirstTimeUser || showHowToPlay) && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center pointer-events-auto" 
          onClick={(e) => { 
            if (e.target === e.currentTarget) {
              setShowRadialMenu(false);
              setShowDisaster(null);
              setScavengeResult(null);
              setShowAttackResult(null);
              setShowAIAttack(null);
              setShowHowToPlay(false);
            }
          }}
        >
          <RadialMenu />
          <DisasterPopup />
          <ScavengePopup />
          <AttackResultPopup />
          <AIAttackPopup />
          <GameOver />
          <NewGame />
          <HowToPlay />
        </div>
      )}
    </div>
  );
};

export default ApocalypticGame;