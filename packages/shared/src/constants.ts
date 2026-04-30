export const GAME_CONSTANTS = {
  /** Anzahl Lanes — fest auf 3 für 3-Spieler-Koop. */
  LANE_COUNT: 3,
  /** Länge einer Lane in In-Game-Pixeln. */
  LANE_LENGTH: 800,
  /** Höhe einer Lane in In-Game-Pixeln. */
  LANE_HEIGHT: 100,
  /** Kollisionsradius eines Towers in Canvas-Pixeln. */
  TOWER_RADIUS: 20,
  /** Maximale gemeinsame Basis-HP. */
  BASE_HP_MAX: 100,
  /** Start-Gold pro Spieler — reicht für 3 Bogenschützen zum Start. */
  STARTING_GOLD: 150,
  /** Wellen, die geschafft werden müssen, um zu gewinnen (MVP-Scope). */
  WAVES_TO_WIN: 3,
  /** Server-Logik-Tick pro Sekunde. */
  TICK_RATE_HZ: 60,
  /** State-Sync zum Client pro Sekunde. */
  STATE_SYNC_HZ: 20,
  /** Pause zwischen den Wellen in Sekunden. */
  WAVE_BREAK_SECONDS: 5,
} as const;

export const LOBBY = {
  /** Maximale Spieler pro Lobby. */
  MAX_PLAYERS: 3,
  /** Mindest-Spieler, um starten zu dürfen. */
  MIN_PLAYERS: 1,
  /** Länge des Join-Codes. */
  CODE_LENGTH: 4,
} as const;
