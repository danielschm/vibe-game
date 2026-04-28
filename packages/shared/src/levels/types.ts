/**
 * Definition einer Welle: was wird wann in welcher Lane gespawnt.
 */
export interface WaveSpawnGroup {
  /** Gegner-ID aus der Enemy-Registry. */
  enemy: string;
  /** Anzahl Gegner in diesem Spawn-Block. */
  count: number;
  /** Zeit zwischen einzelnen Spawns innerhalb des Blocks (Sekunden). */
  intervalSeconds: number;
  /** Zielgruppen: -1 = alle Lanes parallel, sonst Lane-Index. */
  laneIndex?: number;
}

export interface WaveDefinition {
  /** Spawn-Gruppen, die parallel oder hintereinander gestartet werden. */
  spawns: WaveSpawnGroup[];
  /** Optionaler Wartezeit-Override vor Wellenbeginn (sonst GAME_CONSTANTS.WAVE_BREAK_SECONDS). */
  preDelaySeconds?: number;
}

/**
 * Level-Definition. Person C erweitert um neue Maps.
 */
export interface LevelDefinition {
  id: string;
  name: string;
  description: string;
  /** Hex-Farbe für simplen Hintergrund (bis Assets vorhanden). */
  backgroundColor: number;
  /** Wellen, in Reihenfolge — die Länge bestimmt die Sieg-Bedingung. */
  waves: WaveDefinition[];
}
