/**
 * Gegner-Registry.
 *
 * Person B: Neuen Gegner hinzufügen?
 *   1. Datei `<id>.ts` mit EnemyDefinition erstellen
 *   2. Hier importieren und in ENEMIES eintragen
 */

import { grunt } from "./grunt";
import { brute } from "./brute";
import { ravager } from "./ravager";
import type { EnemyDefinition } from "./types";

export const ENEMIES = {
  grunt,
  brute,
  ravager,
} as const;

export type EnemyId = keyof typeof ENEMIES;

export function isEnemyId(value: string): value is EnemyId {
  return value in ENEMIES;
}

export function getEnemy(id: string): EnemyDefinition | undefined {
  return (ENEMIES as Record<string, EnemyDefinition>)[id];
}

export function listEnemies(): EnemyDefinition[] {
  return Object.values(ENEMIES);
}

export type { EnemyDefinition };
export { grunt, brute, ravager };
