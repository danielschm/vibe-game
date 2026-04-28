import type { TowerDefinition } from "./types";

export const archer: TowerDefinition = {
  id: "archer",
  name: "Bogenschütze",
  description: "Schießt Pfeile auf den nächsten Gegner in Reichweite.",
  element: "neutral",
  cost: 50,
  damage: 10,
  range: 150,
  fireRate: 1.0,
  color: 0x8b5cf6,
  shootAnim: { style: "arrow", speed: 400 },
  upgrades: [
    { cost: 40, label: "Stahlpfeile", unlockAfterKills: 5, damage: 16 },
    {
      cost: 60,
      label: "Vergiftete Pfeile",
      unlockAfterKills: 20,
      damage: 16,
      effect: { type: "slow", factor: 0.2, duration: 1.5 },
    },
    {
      cost: 80,
      label: "Pfeilhagel",
      unlockAfterKills: 40,
      damage: 16,
      fireRate: 2.0,
      effect: { type: "slow", factor: 0.4, duration: 1.5 },
    },
  ],
};
