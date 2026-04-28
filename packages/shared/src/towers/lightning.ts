import type { TowerDefinition } from "./types";

export const lightning: TowerDefinition = {
  id: "lightning",
  name: "Blitzturm",
  description: "Blitz springt vom Ziel auf weitere Gegner in der Nähe.",
  element: "lightning",
  cost: 120,
  unlockAfterKills: 20,
  damage: 20,
  range: 180,
  fireRate: 0.8,
  color: 0xfbbf24,
  shootAnim: { style: "bolt", speed: 600 },
  effect: { type: "chain", maxTargets: 2, damageFalloff: 0.7 },
  upgrades: [
    {
      cost: 90,
      label: "Verstärkte Spule",
      unlockAfterKills: 30,
      effect: { type: "chain", maxTargets: 3, damageFalloff: 0.8 },
    },
    {
      cost: 110,
      label: "Kettenresonanz",
      unlockAfterKills: 50,
      fireRate: 1.2,
      effect: { type: "chain", maxTargets: 4, damageFalloff: 0.9 },
    },
    {
      cost: 140,
      label: "Kettenblitz",
      unlockAfterKills: 70,
      damage: 30,
      fireRate: 1.4,
      effect: { type: "chain", maxTargets: 5, damageFalloff: 0.95 },
    },
  ],
};
