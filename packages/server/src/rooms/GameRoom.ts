import { Room, matchMaker, type Client } from "@colyseus/core";
import {
  GAME_CONSTANTS,
  GameState,
  LOBBY,
  MessageType,
  Player,
  isLevelId,
} from "@vibe-game/shared";

interface JoinOptions {
  playerName?: string;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // I, O, 0, 1 ausgespart

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export class GameRoom extends Room<GameState> {
  override maxClients = LOBBY.MAX_PLAYERS;

  override async onCreate(options: { levelId?: string }): Promise<void> {
    this.setState(new GameState());

    if (options.levelId && isLevelId(options.levelId)) {
      this.state.levelId = options.levelId;
    }

    const code = await this.allocateUniqueCode();
    this.state.joinCode = code;
    this.setMetadata({ joinCode: code });

    console.log(`[GameRoom] created room ${this.roomId} with code ${code}`);

    this.registerMessages();
  }

  private registerMessages(): void {
    this.onMessage(MessageType.READY, (client, payload: { ready: boolean }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.ready = Boolean(payload?.ready);
    });

    this.onMessage(MessageType.START_GAME, (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return;
      if (this.state.phase !== "lobby") return;
      if (this.state.players.size < LOBBY.MIN_PLAYERS) return;

      const players = Array.from(this.state.players.values()) as Player[];
      const allReady = players.every((p) => p.ready);
      if (!allReady) return;

      this.state.phase = "playing";
      console.log(`[GameRoom ${this.state.joinCode}] starting game`);
      // Game-Loop wird in Schritt 5 eingehängt.
    });

    this.onMessage(MessageType.RESTART, () => {
      // kommt in Schritt 10 (Game-Over → zurück zur Lobby)
    });
  }

  override onJoin(client: Client, options: JoinOptions): void {
    if (this.state.phase !== "lobby") {
      throw new Error("Lobby ist bereits geschlossen — Spiel läuft.");
    }
    if (this.state.players.size >= LOBBY.MAX_PLAYERS) {
      throw new Error("Lobby ist voll.");
    }

    const player = new Player();
    player.id = client.sessionId;
    player.name = options.playerName?.trim() || `Spieler ${this.state.players.size + 1}`;
    player.isHost = this.state.players.size === 0;
    player.gold = GAME_CONSTANTS.STARTING_GOLD;
    player.laneIndex = this.findFreeLane();
    player.connected = true;
    player.ready = false;
    this.state.players.set(client.sessionId, player);

    console.log(
      `[GameRoom ${this.state.joinCode}] ${player.name} joined ` +
        `(${player.isHost ? "host" : "guest"}, lane ${player.laneIndex})`,
    );
  }

  override onLeave(client: Client, _consented?: boolean): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Während des Spiels nur disconnected markieren — Reconnect später möglich
    if (this.state.phase !== "lobby") {
      player.connected = false;
      console.log(`[GameRoom ${this.state.joinCode}] ${player.name} disconnected`);
      return;
    }

    const wasHost = player.isHost;
    this.state.players.delete(client.sessionId);
    console.log(`[GameRoom ${this.state.joinCode}] ${player.name} left lobby`);

    if (wasHost) {
      for (const next of this.state.players.values()) {
        next.isHost = true;
        break;
      }
    }
  }

  override onDispose(): void {
    console.log(`[GameRoom ${this.state.joinCode}] disposed`);
  }

  private findFreeLane(): number {
    const used = new Set<number>();
    for (const p of this.state.players.values()) {
      if (p.laneIndex >= 0) used.add(p.laneIndex);
    }
    for (let i = 0; i < GAME_CONSTANTS.LANE_COUNT; i++) {
      if (!used.has(i)) return i;
    }
    return -1;
  }

  private async allocateUniqueCode(maxAttempts = 12): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const candidate = randomCode(LOBBY.CODE_LENGTH);
      const rooms = await matchMaker.query({ name: "game" });
      if (!rooms.some((r) => r.metadata?.joinCode === candidate)) {
        return candidate;
      }
    }
    throw new Error("Konnte keinen freien Lobby-Code generieren.");
  }
}
