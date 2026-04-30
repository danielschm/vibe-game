/**
 * Colyseus-State-Schema.
 *
 * Wird vom Server authoritativ gepflegt und automatisch zu allen Clients synchronisiert.
 * Verwendet Legacy-Decorators von @colyseus/schema 2.x mit experimentalDecorators.
 */

import { Schema, MapSchema, type } from "@colyseus/schema";

export type GamePhase = "lobby" | "playing" | "won" | "lost";

export class Player extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  /** 0..2 wenn zugewiesen, -1 in der Lobby. */
  @type("number") laneIndex = -1;
  @type("number") gold = 0;
  @type("boolean") ready = false;
  @type("boolean") isHost = false;
  @type("boolean") connected = true;
}

export class Tower extends Schema {
  @type("string") id = "";
  @type("string") towerType = "";
  @type("string") ownerId = "";
  @type("number") laneIndex = 0;
  /** Canvas-Pixel-X des Towers (vom Client geliefert, für Rendering). */
  @type("number") px = 0;
  /** Canvas-Pixel-Y des Towers (vom Client geliefert, für Rendering). */
  @type("number") py = 0;
  /** Fortschritt 0–1 entlang des Pfads — für Server-seitigen Range-Check. */
  @type("number") laneProgress = 0;
  @type("number") level = 1;
  /** Server-only — nicht synchronisiert. */
  cooldownTimer = 0;
}

export class Enemy extends Schema {
  @type("string") id = "";
  @type("string") enemyType = "";
  @type("number") laneIndex = 0;
  /** 0..1 entlang der Lane (0 = Spawn, 1 = Basis). */
  @type("number") progress = 0;
  @type("number") hp = 0;
  @type("number") hpMax = 0;

  // Server-only — nicht synchronisiert
  speedMultiplier = 1.0;
  slowTimer = 0;
  burnDps = 0;
  burnTimer = 0;
  burnOwnerId = "";
  freezeTimer = 0;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Tower }) towers = new MapSchema<Tower>();
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();

  @type("string") phase: GamePhase = "lobby";
  @type("string") joinCode = "";
  @type("string") levelId = "meadow";

  @type("number") wave = 0;
  @type("number") wavesTotal = 3;
  @type("number") baseHp = 100;
  @type("number") baseHpMax = 100;

  /** Sekunden bis zur nächsten Welle. */
  @type("number") nextWaveIn = 0;

  /** Gesamtzahl getöteter Gegner im laufenden Spiel — steuert Tower-/Upgrade-Freischaltungen. */
  @type("number") enemiesKilled = 0;
}
