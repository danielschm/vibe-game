import type { LevelDefinition } from "./types";

export const meadow: LevelDefinition = {
  id: "meadow",
  name: "Wiese",
  description: "Die klassische Anfänger-Map mit drei geraden Lanes.",
  backgroundColor: 0x2d5016,
  waves: [
    {
      // Welle 1 — Grunts: wenig HP, langsam
      spawns: [{ enemy: "grunt", count: 6, intervalSeconds: 1.4, laneIndex: -1 }],
    },
    {
      // Welle 2 — Brutes: zäh und tragen mehr Schaden
      spawns: [{ enemy: "brute", count: 6, intervalSeconds: 1.8, laneIndex: -1 }],
    },
    {
      // Welle 3 — Ravager: viel HP, schnell, gefährlich
      spawns: [{ enemy: "ravager", count: 5, intervalSeconds: 1.2, laneIndex: -1 }],
    },
  ],
};
