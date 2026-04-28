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
import { cannon } from "./cannon";
import { lightning } from "./lightning";
import { mage } from "./mage";
import { poisoner } from "./poisoner";
import type { TowerDefinition, TowerEffect, TowerUpgradeLevel } from "./types";

export const TOWERS = {
  archer,
  cannon,
  lightning,
  mage,
  poisoner,
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

/** Berechnet die effektiven Kampfwerte eines Towers für das angegebene Level (1-basiert). */
export interface EffectiveTowerStats {
  damage: number;
  range: number;
  fireRate: number;
  effect: TowerEffect | undefined;
}

export function getEffectiveTowerStats(def: TowerDefinition, level: number): EffectiveTowerStats {
  let damage = def.damage;
  let range = def.range;
  let fireRate = def.fireRate;
  let effect: TowerEffect | undefined = def.effect;

  const upgradeCount = Math.min(level - 1, def.upgrades?.length ?? 0);
  for (let i = 0; i < upgradeCount; i++) {
    const u = def.upgrades![i] as TowerUpgradeLevel;
    if (u.damage !== undefined) damage = u.damage;
    if (u.range !== undefined) range = u.range;
    if (u.fireRate !== undefined) fireRate = u.fireRate;
    if (u.effect !== undefined) effect = u.effect;
  }

  return { damage, range, fireRate, effect };
}

export type { TowerDefinition, TowerEffect, TowerUpgradeLevel };
export { archer, cannon, lightning, mage, poisoner };
