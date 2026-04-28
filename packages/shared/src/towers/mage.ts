import type { TowerDefinition } from "./types";

export const mage: TowerDefinition = {
  id: "mage",
  name: "Frostmagier",
  description: "Frostzauber verlangsamen Gegner dauerhaft.",
  element: "ice",
  cost: 90,
  unlockAfterKills: 15,
  damage: 12,
  range: 160,
  fireRate: 0.7,
  color: 0x60a5fa,
  shootAnim: { style: "orb", color: 0x60a5fa, speed: 300 },
  effect: { type: "slow", factor: 0.3, duration: 1.5 },
  upgrades: [
    {
      cost: 70,
      label: "Tiefeneis",
      unlockAfterKills: 25,
      effect: { type: "slow", factor: 0.5, duration: 2 },
    },
    {
      cost: 90,
      label: "Eissturm",
      unlockAfterKills: 40,
      damage: 20,
      effect: { type: "freeze", duration: 1 },
    },
    {
      cost: 120,
      label: "Blizzard",
      unlockAfterKills: 60,
      damage: 25,
      fireRate: 1.0,
      effect: { type: "freeze", duration: 2 },
    },
  ],
};
