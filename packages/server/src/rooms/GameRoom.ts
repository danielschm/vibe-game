import { Room, matchMaker, type Client } from "@colyseus/core";
import {
  GAME_CONSTANTS,
  GameState,
  LOBBY,
  MessageType,
  Player,
  Tower,
  getTower,
  isLevelId,
} from "@vibe-game/shared";
import type { BuyTowerMessage } from "@vibe-game/shared";
import { GameManager } from "../systems/GameManager";

interface JoinOptions {
  playerName?: string;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne ähnlich aussehende
const TICK_INTERVAL_MS = Math.round(1000 / GAME_CONSTANTS.TICK_RATE_HZ);
const PATCH_INTERVAL_MS = Math.round(1000 / GAME_CONSTANTS.STATE_SYNC_HZ);

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export class GameRoom extends Room<GameState> {
  override maxClients = LOBBY.MAX_PLAYERS;
  private manager!: GameManager;
  private towerIdCounter = 0;

  override async onCreate(options: { levelId?: string }): Promise<void> {
    this.setState(new GameState());

    if (options.levelId && isLevelId(options.levelId)) {
      this.state.levelId = options.levelId;
    }

    const code = await this.allocateUniqueCode();
    this.state.joinCode = code;
    this.setMetadata({ joinCode: code });

    this.manager = new GameManager(this.state);

    console.log(`[GameRoom] created room ${this.roomId} with code ${code}`);

    this.setPatchRate(PATCH_INTERVAL_MS);
    this.setSimulationInterval((deltaMs) => this.onTick(deltaMs), TICK_INTERVAL_MS);

    this.registerMessages();
  }

  private onTick(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.manager.tick(dt);
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
      this.manager.startGame();
      console.log(`[GameRoom ${this.state.joinCode}] starting game`);
    });

    this.onMessage(MessageType.RESTART, (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return;
      if (this.state.phase !== "won" && this.state.phase !== "lost") return;
      this.manager.resetToLobby();
      console.log(`[GameRoom ${this.state.joinCode}] reset to lobby`);
    });

    this.onMessage(MessageType.BUY_TOWER, (client, payload: BuyTowerMessage) => {
      this.tryBuyTower(client.sessionId, payload);
    });
  }

  private tryBuyTower(sessionId: string, payload: BuyTowerMessage): void {
    if (this.state.phase !== "playing") return;
    const player = this.state.players.get(sessionId);
    if (!player) return;
    if (!payload || typeof payload.laneIndex !== "number") return;

    if (payload.laneIndex !== player.laneIndex) return; // nur die eigene Lane

    const def = getTower(payload.towerType);
    if (!def) return;

    if (
      payload.slotIndex < 0 ||
      payload.slotIndex >= GAME_CONSTANTS.TOWER_SLOTS_PER_LANE
    ) {
      return;
    }

    for (const t of this.state.towers.values()) {
      if (t.laneIndex === payload.laneIndex && t.slotIndex === payload.slotIndex) {
        return; // Slot belegt
      }
    }

    if (player.gold < def.cost) return;

    player.gold -= def.cost;

    const tower = new Tower();
    tower.id = `t_${++this.towerIdCounter}`;
    tower.towerType = def.id;
    tower.ownerId = sessionId;
    tower.laneIndex = payload.laneIndex;
    tower.slotIndex = payload.slotIndex;
    tower.level = 1;
    tower.cooldownTimer = 0;
    this.state.towers.set(tower.id, tower);

    console.log(
      `[GameRoom ${this.state.joinCode}] ${player.name} bought ${def.name} ` +
        `on lane ${payload.laneIndex} slot ${payload.slotIndex}`,
    );
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
