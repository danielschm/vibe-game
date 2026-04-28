import {
  GAME_CONSTANTS,
  getLevel,
  type GameState,
  type LevelDefinition,
} from "@vibe-game/shared";
import { WaveSpawner } from "./WaveSpawner";
import { updateEnemyPath } from "./EnemyPath";

/**
 * Authoritative Spiel-Logik im Server-Tick.
 *
 * Phasen:
 *  - lobby      → kein Tick aktiv
 *  - playing    → Tick durchläuft Wave-Pause oder aktive Welle
 *  - won / lost → Tick ist no-op, RESTART führt zurück nach lobby
 *
 * In "playing":
 *  - state.nextWaveIn > 0  → Pause-Countdown vor nächster Welle
 *  - state.nextWaveIn = 0  → Welle aktiv (Spawner spawnt, Enemies laufen)
 */
export class GameManager {
  private waveSpawner = new WaveSpawner();
  private level: LevelDefinition | undefined;

  constructor(private state: GameState) {}

  /** Wird vom GameRoom aufgerufen, wenn die Phase auf "playing" wechselt. */
  startGame(): void {
    this.state.wave = 0;
    this.state.baseHp = this.state.baseHpMax;
    this.state.nextWaveIn = GAME_CONSTANTS.WAVE_BREAK_SECONDS;
    this.state.enemies.clear();
    this.state.towers.clear();

    this.level = getLevel(this.state.levelId);
    this.state.wavesTotal = this.level?.waves.length ?? GAME_CONSTANTS.WAVES_TO_WIN;
    this.waveSpawner.reset();

    console.log(
      `[GameManager] start — level=${this.state.levelId} wavesTotal=${this.state.wavesTotal}`,
    );
  }

  /** Setzt den State zurück in die Lobby (nach won/lost). */
  resetToLobby(): void {
    this.state.phase = "lobby";
    this.state.wave = 0;
    this.state.baseHp = this.state.baseHpMax;
    this.state.nextWaveIn = 0;
    this.state.enemies.clear();
    this.state.towers.clear();
    this.waveSpawner.reset();
    for (const player of this.state.players.values()) {
      player.ready = false;
      player.gold = GAME_CONSTANTS.STARTING_GOLD;
    }
  }

  /** Server-Tick — wird mit dt (Sekunden seit letztem Tick) aufgerufen. */
  tick(dt: number): void {
    if (this.state.phase !== "playing") return;

    if (this.state.baseHp <= 0) {
      this.state.phase = "lost";
      this.waveSpawner.reset();
      this.state.enemies.clear();
      console.log(`[GameManager] base destroyed — phase=lost`);
      return;
    }

    if (this.state.nextWaveIn > 0) {
      // Pause-Phase
      this.state.nextWaveIn = Math.max(0, this.state.nextWaveIn - dt);
      if (this.state.nextWaveIn === 0) {
        this.beginNextWave();
      }
      return;
    }

    // Aktive Welle
    this.waveSpawner.tick(dt, this.state);
    updateEnemyPath(this.state, dt);

    if (this.waveSpawner.isFinished(this.state)) {
      this.onWaveCleared();
    }
  }

  private beginNextWave(): void {
    this.state.wave += 1;
    if (!this.level || this.state.wave > this.state.wavesTotal) {
      // Sollte normal nicht passieren — onWaveCleared kümmert sich um won.
      this.state.phase = "won";
      return;
    }
    console.log(`[GameManager] starting wave ${this.state.wave}/${this.state.wavesTotal}`);
    this.waveSpawner.startWave(this.level, this.state.wave);
  }

  private onWaveCleared(): void {
    if (this.state.wave >= this.state.wavesTotal) {
      this.state.phase = "won";
      console.log(`[GameManager] all waves cleared — phase=won`);
      return;
    }
    this.state.nextWaveIn = GAME_CONSTANTS.WAVE_BREAK_SECONDS;
    console.log(
      `[GameManager] wave ${this.state.wave} cleared — break ${GAME_CONSTANTS.WAVE_BREAK_SECONDS}s`,
    );
  }
}
