import { GAME_CONSTANTS, getEnemy, type GameState } from "@vibe-game/shared";

/**
 * Bewegt jeden Gegner entlang seiner Lane vorwärts.
 * Erreicht ein Gegner die Basis (progress >= 1), zieht er Schaden ab und wird entfernt.
 *
 * Combat (Tower → Gegner) kommt in Schritt 7.
 */
export function updateEnemyPath(state: GameState, dt: number): void {
  const reachedBase: string[] = [];

  for (const [id, enemy] of state.enemies) {
    const def = getEnemy(enemy.enemyType);
    if (!def) {
      reachedBase.push(id);
      continue;
    }
    enemy.progress += (def.speed * enemy.speedMultiplier * dt) / GAME_CONSTANTS.LANE_LENGTH;

    if (enemy.progress >= 1.0) {
      state.baseHp = Math.max(0, state.baseHp - def.damage);
      reachedBase.push(id);
    }
  }

  for (const id of reachedBase) {
    state.enemies.delete(id);
  }
}
