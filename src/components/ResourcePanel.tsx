import React from 'react';
import { BaseIcon, FoodIcon, MaterialsIcon, SurvivorsIcon, WaterIcon } from '../icons';
import { BaseUpgrade, Building, Resources } from '../types';

interface ResourcePanelProps {
  resources: Resources;
  upgrades: BaseUpgrade[];
  autoScavengeEnabled: boolean;
  purchaseUpgrade: (upgrade: BaseUpgrade) => void;
  setAutoScavengeEnabled: (enabled: boolean) => void;
  availableBuildings: Building[];
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({
  resources,
  upgrades,
  autoScavengeEnabled,
  purchaseUpgrade,
  setAutoScavengeEnabled,
  availableBuildings,
}) => {
  return (
    <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-8 shadow-2xl h-full flex flex-col overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-gray-800 before:via-gray-900 before:to-black before:opacity-50 before:rounded-xl">
      <h2 className="relative z-10 text-2xl sm:text-4xl font-black text-white mb-4 sm:mb-8 text-center drop-shadow-md">
        Resources
      </h2>
      <div className="relative z-10 grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <FoodIcon className="w-6 h-6 text-orange-500" />
            <span className="text-lg font-bold">Food</span>
          </div>
          <p className="text-2xl font-bold">{Math.floor(resources.food)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <WaterIcon className="w-6 h-6 text-blue-500" />
            <span className="text-lg font-bold">Water</span>
          </div>
          <p className="text-2xl font-bold">{Math.floor(resources.water)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <MaterialsIcon className="w-6 h-6 text-gray-400" />
            <span className="text-lg font-bold">Materials</span>
          </div>
          <p className="text-2xl font-bold">{Math.floor(resources.materials)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <SurvivorsIcon className="w-6 h-6 text-green-500" />
            <span className="text-lg font-bold">Survivors</span>
          </div>
          <p className="text-2xl font-bold">{Math.floor(resources.survivors)}</p>
        </div>
      </div>

      <div className="relative z-10 space-y-4">
        <h3 className="text-xl font-bold text-white mb-4">Base Upgrades</h3>
        <div className="space-y-4">
          {upgrades.map((upgrade) => (
            <div
              key={upgrade.id}
              className="bg-gray-800 p-4 rounded-lg border border-gray-700"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-lg font-bold text-white">{upgrade.name}</h4>
                  <p className="text-sm text-gray-400">{upgrade.description}</p>
                </div>
                <span className="text-sm text-gray-400">
                  Level {upgrade.level}/{upgrade.maxLevel}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Cost:{" "}
                  {Object.entries(upgrade.cost)
                    .map(([resource, amount]) => `${amount} ${resource}`)
                    .join(", ")}
                </div>
                <button
                  onClick={() => purchaseUpgrade(upgrade)}
                  disabled={upgrade.level >= upgrade.maxLevel}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                    upgrade.level >= upgrade.maxLevel
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {upgrade.level >= upgrade.maxLevel ? "Max Level" : "Upgrade"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-8">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScavengeEnabled}
            onChange={(e) => setAutoScavengeEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">Auto Scavenge</span>
        </label>
      </div>

      <div className="relative z-10 mt-8">
        <h3 className="text-xl font-bold text-white mb-4">Buildings</h3>
        <div className="grid grid-cols-1 gap-4">
          {availableBuildings.map((building) => (
            <div
              key={building.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("buildingId", building.id);
              }}
              className="bg-gray-800 p-4 rounded-lg border border-gray-700 cursor-move hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {building.imageUrl ? (
                  <img
                    src={building.imageUrl}
                    alt={building.name}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <BaseIcon className="w-8 h-8 text-gray-400" />
                )}
                <div>
                  <h4 className="text-lg font-bold text-white">{building.name}</h4>
                  <p className="text-sm text-gray-400">
                    Cost:{" "}
                    {Object.entries(building.cost)
                      .map(([resource, amount]) => `${amount} ${resource}`)
                      .join(", ")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 