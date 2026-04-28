import {
  Enemy,
  GAME_CONSTANTS,
  getEnemy,
  type GameState,
  type LevelDefinition,
  type Player,
  type WaveSpawnGroup,
} from "@vibe-game/shared";

interface ActiveSpawn {
  group: WaveSpawnGroup;
  remaining: number;
  nextSpawnIn: number;
}

/**
 * Verarbeitet das Spawnen einer Welle.
 *
 * Wird vom GameManager pro Welle einmal mit `startWave()` initialisiert,
 * dann bei jedem Tick aufgerufen. `isFinished()` zeigt an, ob die Welle
 * komplett gespawnt UND alle Gegner besiegt/an der Basis angekommen sind.
 */
export class WaveSpawner {
  private active: ActiveSpawn[] = [];
  private idCounter = 0;

  /** Setzt die Spawns für die übergebene Welle (1-basiert) auf. */
  startWave(level: LevelDefinition, waveIndex: number): void {
    const wave = level.waves[waveIndex - 1];
    if (!wave) {
      this.active = [];
      return;
    }
    this.active = wave.spawns.map((group) => ({
      group,
      remaining: group.count,
      nextSpawnIn: 0,
    }));
  }

  /** Verarbeitet einen Tick — spawnt fällige Gegner. */
  tick(dt: number, state: GameState): void {
    if (this.active.length === 0) return;

    for (const slot of this.active) {
      slot.nextSpawnIn -= dt;
      while (slot.nextSpawnIn <= 0 && slot.remaining > 0) {
        this.spawnEnemyForGroup(state, slot.group);
        slot.remaining -= 1;
        slot.nextSpawnIn += slot.group.intervalSeconds;
      }
    }

    this.active = this.active.filter((slot) => slot.remaining > 0);
  }

  /** Welle abgeschlossen, wenn nichts mehr zu spawnen ist UND keine Gegner mehr leben. */
  isFinished(state: GameState): boolean {
    return this.active.length === 0 && state.enemies.size === 0;
  }

  reset(): void {
    this.active = [];
  }

  private getOccupiedLanes(state: GameState): number[] {
    const occupied = new Set<number>();
    for (const p of state.players.values() as IterableIterator<Player>) {
      if (p.laneIndex >= 0) occupied.add(p.laneIndex);
    }
    return occupied.size > 0 ? Array.from(occupied) : this.allLanes();
  }

  private spawnEnemyForGroup(state: GameState, group: WaveSpawnGroup): void {
    const def = getEnemy(group.enemy);
    if (!def) {
      console.warn(`[WaveSpawner] unknown enemy id "${group.enemy}"`);
      return;
    }

    const lanes =
      group.laneIndex === undefined || group.laneIndex < 0
        ? this.getOccupiedLanes(state)
        : [group.laneIndex];

    for (const lane of lanes) {
      const enemy = new Enemy();
      enemy.id = `e_${++this.idCounter}`;
      enemy.enemyType = def.id;
      enemy.laneIndex = lane;
      enemy.progress = 0;
      enemy.hp = def.hp;
      enemy.hpMax = def.hp;
      state.enemies.set(enemy.id, enemy);
    }
  }

  private allLanes(): number[] {
    const out: number[] = [];
    for (let i = 0; i < GAME_CONSTANTS.LANE_COUNT; i++) out.push(i);
    return out;
  }
}
