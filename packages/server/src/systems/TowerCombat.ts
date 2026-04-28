import {
  GAME_CONSTANTS,
  getEnemy,
  getTower,
  type Enemy,
  type GameState,
  type Tower,
} from "@vibe-game/shared";

/** Berechnet die x-Position eines Towers in In-Game-Pixeln entlang seiner Lane. */
export function towerLaneX(slotIndex: number): number {
  return (
    ((slotIndex + 0.5) / GAME_CONSTANTS.TOWER_SLOTS_PER_LANE) * GAME_CONSTANTS.LANE_LENGTH
  );
}

/**
 * Pro Tick:
 *  - Cooldown jedes Towers reduzieren
 *  - Wenn Cooldown abgelaufen: nächstes Ziel suchen (gleiche Lane, in Range,
 *    am weitesten in Richtung Basis), Schaden zufügen, Cooldown neu setzen
 *  - Stirbt der Gegner durch den Schuss: Owner bekommt das Reward-Gold
 */
export function updateTowerCombat(state: GameState, dt: number): void {
  for (const tower of state.towers.values()) {
    const def = getTower(tower.towerType);
    if (!def) continue;

    if (tower.cooldownTimer > 0) {
      tower.cooldownTimer = Math.max(0, tower.cooldownTimer - dt);
      continue;
    }

    const target = findTarget(state, tower, def.range);
    if (!target) continue;

    target.hp = Math.max(0, target.hp - def.damage);
    tower.cooldownTimer = 1 / def.fireRate;

    if (target.hp <= 0) {
      const enemyDef = getEnemy(target.enemyType);
      if (enemyDef) {
        const owner = state.players.get(tower.ownerId);
        if (owner) owner.gold += enemyDef.reward;
      }
      state.enemies.delete(target.id);
    }
  }
}

function findTarget(state: GameState, tower: Tower, range: number): Enemy | null {
  const towerX = towerLaneX(tower.slotIndex);
  let best: Enemy | null = null;
  let bestProgress = -1;

  for (const enemy of state.enemies.values()) {
    if (enemy.laneIndex !== tower.laneIndex) continue;
    const enemyX = enemy.progress * GAME_CONSTANTS.LANE_LENGTH;
    if (Math.abs(enemyX - towerX) > range) continue;
    if (enemy.progress > bestProgress) {
      best = enemy;
      bestProgress = enemy.progress;
    }
  }

  return best;
}
