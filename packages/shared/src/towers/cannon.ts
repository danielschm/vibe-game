import type { TowerDefinition } from "./types";

export const cannon: TowerDefinition = {
  id: "cannon",
  name: "Kanone",
  description: "Langsamer Schuss mit Flächenschaden um den Auftreffpunkt.",
  element: "fire",
  cost: 100,
  unlockAfterKills: 10,
  damage: 30,
  range: 120,
  fireRate: 0.4,
  color: 0xef4444,
  shootAnim: { style: "cannonball", speed: 250 },
  effect: { type: "splash", radius: 60 },
  upgrades: [
    {
      cost: 80,
      label: "Sprengladung",
      unlockAfterKills: 20,
      effect: { type: "splash", radius: 100 },
    },
    {
      cost: 100,
      label: "Brandladung",
      unlockAfterKills: 35,
      damage: 45,
      effect: { type: "burn", dpsPercent: 5, duration: 3 },
    },
    {
      cost: 120,
      label: "Infernokern",
      unlockAfterKills: 55,
      damage: 60,
      effect: { type: "burn", dpsPercent: 15, duration: 4 },
    },
  ],
};
