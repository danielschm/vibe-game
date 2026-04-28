import { GAME_CONSTANTS, getLevel, type GameState } from "@vibe-game/shared";

/**
 * Authoritative Spiel-Logik im Server-Tick.
 *
 * Verantwortlich für:
 *  - Phase-Übergänge (lobby → playing → won/lost)
 *  - Wellen-Countdown und Wellen-Wechsel (Spawn-Logik kommt in Schritt 6)
 *  - Sieg/Niederlage-Bedingungen
 */
export class GameManager {
  constructor(private state: GameState) {}

  /** Wird vom GameRoom aufgerufen, wenn die Phase auf "playing" wechselt. */
  startGame(): void {
    this.state.wave = 0;
    this.state.baseHp = this.state.baseHpMax;
    this.state.nextWaveIn = GAME_CONSTANTS.WAVE_BREAK_SECONDS;

    const level = getLevel(this.state.levelId);
    this.state.wavesTotal = level?.waves.length ?? GAME_CONSTANTS.WAVES_TO_WIN;

    // Bestehende Spawns/Türme aufräumen, falls Restart
    this.state.enemies.clear();
    this.state.towers.clear();

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
    for (const player of this.state.players.values()) {
      player.ready = false;
      player.gold = GAME_CONSTANTS.STARTING_GOLD;
    }
  }

  /** Server-Tick — wird mit dt (Sekunden seit letztem Tick) aufgerufen. */
  tick(dt: number): void {
    if (this.state.phase !== "playing") return;

    // Niederlage zuerst prüfen, damit Wave-Logik nicht weiterläuft
    if (this.state.baseHp <= 0) {
      this.state.phase = "lost";
      console.log(`[GameManager] base destroyed — phase=lost`);
      return;
    }

    // Wellen-Pause / -Wechsel
    if (this.state.nextWaveIn > 0) {
      this.state.nextWaveIn = Math.max(0, this.state.nextWaveIn - dt);
      if (this.state.nextWaveIn === 0) {
        this.advanceWave();
      }
    }
  }

  private advanceWave(): void {
    this.state.wave += 1;
    if (this.state.wave > this.state.wavesTotal) {
      this.state.phase = "won";
      console.log(`[GameManager] all waves cleared — phase=won`);
      return;
    }
    console.log(`[GameManager] starting wave ${this.state.wave}/${this.state.wavesTotal}`);
    // Spawn-Logik kommt in Schritt 6 (WaveSpawner).
  }
}
