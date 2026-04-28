import type { TowerDefinition } from "./types";

export const archer: TowerDefinition = {
  id: "archer",
  name: "Bogenschütze",
  description: "Schießt einzelne Pfeile auf den nächsten Gegner in Reichweite.",
  cost: 50,
  damage: 10,
  range: 150,
  fireRate: 1.0,
  color: 0x8b5cf6,
};
