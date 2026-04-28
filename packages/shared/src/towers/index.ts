/**
 * Tower-Registry.
 *
 * Person A: Neuen Tower hinzufügen?
 *   1. Datei `<id>.ts` neben dieser Datei erstellen, `TowerDefinition` exportieren
 *   2. Hier importieren und in TOWERS eintragen — fertig.
 *
 * Server, Client und UI lesen dynamisch aus TOWERS — keine weiteren Edits nötig.
 */

import { archer } from "./archer";
import type { TowerDefinition } from "./types";

export const TOWERS = {
  archer,
} as const;

export type TowerId = keyof typeof TOWERS;

export function isTowerId(value: string): value is TowerId {
  return value in TOWERS;
}

export function getTower(id: string): TowerDefinition | undefined {
  return (TOWERS as Record<string, TowerDefinition>)[id];
}

export function listTowers(): TowerDefinition[] {
  return Object.values(TOWERS);
}

export type { TowerDefinition };
export { archer };
