import type { LevelDefinition } from "./types";

export const meadow: LevelDefinition = {
  id: "meadow",
  name: "Wiese",
  description: "Die klassische Anfänger-Map mit drei geraden Lanes.",
  backgroundColor: 0x2d5016,
  waves: [
    {
      spawns: [{ enemy: "grunt", count: 5, intervalSeconds: 1.5, laneIndex: -1 }],
    },
    {
      spawns: [{ enemy: "grunt", count: 8, intervalSeconds: 1.0, laneIndex: -1 }],
    },
    {
      spawns: [{ enemy: "grunt", count: 12, intervalSeconds: 0.7, laneIndex: -1 }],
    },
  ],
};
