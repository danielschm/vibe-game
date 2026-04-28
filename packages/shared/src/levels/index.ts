/**
 * Level-Registry.
 *
 * Person C: Neues Level hinzufügen?
 *   1. Datei `<id>.ts` mit LevelDefinition erstellen
 *   2. Hier importieren und in LEVELS eintragen
 */

import { meadow } from "./meadow";
import type { LevelDefinition } from "./types";

export const LEVELS = {
  meadow,
} as const;

export type LevelId = keyof typeof LEVELS;

export function isLevelId(value: string): value is LevelId {
  return value in LEVELS;
}

export function getLevel(id: string): LevelDefinition | undefined {
  return (LEVELS as Record<string, LevelDefinition>)[id];
}

export function listLevels(): LevelDefinition[] {
  return Object.values(LEVELS);
}

export type { LevelDefinition, WaveDefinition, WaveSpawnGroup } from "./types";
export { meadow };
