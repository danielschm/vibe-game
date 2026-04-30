/**
 * Nachrichten, die der Client an den Server schickt.
 * Server validiert immer authoritativ — Client schlägt nur vor.
 */

export const MessageType = {
  BUY_TOWER: "BUY_TOWER",
  UPGRADE_TOWER: "UPGRADE_TOWER",
  TOWER_FIRED: "TOWER_FIRED",
  READY: "READY",
  START_GAME: "START_GAME",
  RESTART: "RESTART",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface BuyTowerMessage {
  laneIndex: number;
  /** Canvas-Pixel-Koordinaten des gewählten Platzes. */
  px: number;
  py: number;
  /** Pfad-Fortschritt 0–1 — vom Client berechnet, für Server-Range-Checks. */
  laneProgress: number;
  towerType: string;
}

export interface UpgradeTowerMessage {
  towerId: string;
}

export interface ReadyMessage {
  ready: boolean;
}

export interface StartGameMessage {
  // keine zusätzlichen Felder — Host startet das Spiel
  _empty?: never;
}

export interface RestartMessage {
  // keine zusätzlichen Felder — zurück zur Lobby
  _empty?: never;
}

/** Server → Client: Tower hat geschossen (für Schieß-Animation). */
export interface TowerFiredEvent {
  towerId: string;
  /** Primäres Ziel + Kettenziele (Lightning). Positionen zum Feuerzeitpunkt. */
  targets: Array<{ id: string; progress: number; laneIndex: number }>;
}

/** Mapping von MessageType-Konstante auf Payload-Typ. */
export interface MessagePayloads {
  BUY_TOWER: BuyTowerMessage;
  UPGRADE_TOWER: UpgradeTowerMessage;
  TOWER_FIRED: TowerFiredEvent;
  READY: ReadyMessage;
  START_GAME: StartGameMessage;
  RESTART: RestartMessage;
}
