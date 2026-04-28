import type { TowerDefinition } from "./types";

export const poisoner: TowerDefinition = {
  id: "poisoner",
  name: "Giftwerfer",
  description: "Vergiftet Gegner mit anhaltendem Schaden über Zeit.",
  element: "poison",
  cost: 110,
  unlockAfterKills: 30,
  damage: 8,
  range: 130,
  fireRate: 0.6,
  color: 0x4ade80,
  shootAnim: { style: "orb", color: 0x4ade80, speed: 280 },
  effect: { type: "burn", dpsPercent: 8, duration: 4 },
  upgrades: [
    {
      cost: 85,
      label: "Konzentrat",
      unlockAfterKills: 40,
      effect: { type: "burn", dpsPercent: 12, duration: 5 },
    },
    {
      cost: 100,
      label: "Seuchenblase",
      unlockAfterKills: 60,
      damage: 12,
      effect: { type: "burn", dpsPercent: 15, duration: 6 },
    },
    {
      cost: 130,
      label: "Seuchenwolke",
      unlockAfterKills: 80,
      damage: 15,
      fireRate: 0.9,
      effect: { type: "burn", dpsPercent: 20, duration: 6 },
    },
  ],
};
