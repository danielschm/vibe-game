// @vibe-game/shared — Verträge zwischen Server, Client und UI.
//
// Was hier liegt, wird von ALLEN Schichten importiert. Änderungen daher
// nur nach kurzer Team-Absprache.

export * from "./constants";
export * from "./elements";
export * from "./messages";
export * from "./schema";

export {
  TOWERS,
  getTower,
  listTowers,
  isTowerId,
  getEffectiveTowerStats,
  type TowerId,
  type TowerDefinition,
  type TowerEffect,
  type TowerUpgradeLevel,
  type EffectiveTowerStats,
} from "./towers";
export { ENEMIES, getEnemy, listEnemies, isEnemyId, type EnemyId, type EnemyDefinition } from "./enemies";
export {
  LEVELS,
  getLevel,
  listLevels,
  isLevelId,
  type LevelId,
  type LevelDefinition,
  type WaveDefinition,
  type WaveSpawnGroup,
} from "./levels";

export const SHARED_VERSION = "0.1.0";
