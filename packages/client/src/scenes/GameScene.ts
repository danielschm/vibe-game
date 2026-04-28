import Phaser from "phaser";
import type { Room } from "colyseus.js";
import {
  GAME_CONSTANTS,
  MessageType,
  getEnemy,
  getLevel,
  getTower,
  type Enemy,
  type GameState,
  type Tower,
} from "@vibe-game/shared";
import { GAME_VIEWPORT } from "../game";

interface LaneLayout {
  spawnX: number;
  baseX: number;
  laneLength: number;
  y: number;
}

interface SlotZone {
  laneIndex: number;
  slotIndex: number;
  rect: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
}

interface EnemyView {
  container: Phaser.GameObjects.Container;
  hpFill: Phaser.GameObjects.Rectangle;
}

const BAR_W = 28;
const BAR_H = 4;
const BAR_Y = -20;

function hpColor(ratio: number): number {
  if (ratio > 0.6) return 0x22c55e;
  if (ratio > 0.3) return 0xeab308;
  return 0xef4444;
}

export class GameScene extends Phaser.Scene {
  private room: Room<GameState> | null = null;
  private lanes: LaneLayout[] = [];
  private slotZones: SlotZone[] = [];
  private enemyViews = new Map<string, EnemyView>();
  private towerSprites = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super({ key: "Game" });
  }

  create(): void {
    this.room = (this.game.registry.get("room") as Room<GameState> | undefined) ?? null;

    this.lanes = this.computeLaneLayout();
    this.drawBackground();
    this.drawLanes();
    this.drawSlotZones();

    if (!this.room) {
      this.add
        .text(GAME_VIEWPORT.width / 2, GAME_VIEWPORT.height / 2, "Kein Server-State", {
          fontSize: "24px",
          color: "#ef4444",
        })
        .setOrigin(0.5);
      return;
    }

    this.subscribeEnemies();
    this.subscribeTowers();
    this.refreshSlotInteractivity();

    this.room.onStateChange(() => {
      this.syncTowerSprites();
      this.refreshSlotInteractivity();
    });
  }

  override update(): void {
    if (!this.room) return;
    for (const [id, enemy] of this.room.state.enemies as unknown as Map<string, Enemy>) {
      const view = this.enemyViews.get(id);
      if (!view) continue;
      const lane = this.lanes[enemy.laneIndex];
      if (!lane) continue;
      const x = lane.spawnX + enemy.progress * lane.laneLength;
      view.container.setPosition(x, lane.y);
      const hpRatio = enemy.hpMax > 0 ? enemy.hp / enemy.hpMax : 0;
      view.hpFill.scaleX = Math.max(0, hpRatio);
      view.hpFill.fillColor = hpColor(hpRatio);
    }
  }

  private computeLaneLayout(): LaneLayout[] {
    const margin = 60;
    const baseMargin = 80;
    const top = 80;
    const usableHeight = GAME_VIEWPORT.height - top - 60;
    const laneCount = GAME_CONSTANTS.LANE_COUNT;
    const layouts: LaneLayout[] = [];
    for (let i = 0; i < laneCount; i++) {
      const y = top + (usableHeight / laneCount) * (i + 0.5);
      const spawnX = margin;
      const baseX = GAME_VIEWPORT.width - baseMargin;
      layouts.push({ spawnX, baseX, laneLength: baseX - spawnX, y });
    }
    return layouts;
  }

  private drawBackground(): void {
    const level = this.room ? getLevel(this.room.state.levelId) : undefined;
    const color = level?.backgroundColor ?? 0x232347;
    this.cameras.main.setBackgroundColor(color);
  }

  private drawLanes(): void {
    const trackColor = 0x3d3d6b;
    const baseColor = 0x9bbcff;

    for (let i = 0; i < this.lanes.length; i++) {
      const lane = this.lanes[i];
      this.add
        .rectangle(
          lane.spawnX + lane.laneLength / 2,
          lane.y,
          lane.laneLength,
          14,
          trackColor,
        )
        .setOrigin(0.5);

      this.add
        .text(lane.spawnX - 20, lane.y, `${i + 1}`, {
          fontSize: "20px",
          color: "#9bbcff",
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5);

      this.add.rectangle(lane.baseX + 20, lane.y, 22, 30, baseColor).setOrigin(0.5);
    }

    const baseCenterY = (this.lanes[0].y + this.lanes[this.lanes.length - 1].y) / 2;
    const baseHeight = this.lanes[this.lanes.length - 1].y - this.lanes[0].y + 60;
    this.add
      .rectangle(this.lanes[0].baseX + 30, baseCenterY, 6, baseHeight, baseColor, 0.3)
      .setOrigin(0.5);
  }

  private drawSlotZones(): void {
    for (let l = 0; l < this.lanes.length; l++) {
      const lane = this.lanes[l];
      for (let s = 0; s < GAME_CONSTANTS.TOWER_SLOTS_PER_LANE; s++) {
        const x =
          lane.spawnX +
          ((s + 0.5) / GAME_CONSTANTS.TOWER_SLOTS_PER_LANE) * lane.laneLength;
        const y = lane.y - 28;

        const rect = this.add
          .rectangle(x, y, 36, 36, 0x9bbcff, 0)
          .setStrokeStyle(1, 0x9bbcff, 0.25);

        rect.on("pointerdown", () => this.onSlotClick(l, s));
        this.slotZones.push({ laneIndex: l, slotIndex: s, rect, x, y });
      }
    }
  }

  private refreshSlotInteractivity(): void {
    if (!this.room) return;
    const myLane = this.getMyLane();
    for (const zone of this.slotZones) {
      const occupied = this.isSlotOccupied(zone.laneIndex, zone.slotIndex);
      const buildable = zone.laneIndex === myLane && !occupied;
      if (buildable) {
        zone.rect.setInteractive({ useHandCursor: true });
        zone.rect.setStrokeStyle(2, 0x9bbcff, 0.7);
        zone.rect.setFillStyle(0x9bbcff, 0.08);
      } else {
        zone.rect.disableInteractive();
        zone.rect.setStrokeStyle(1, 0x9bbcff, 0.15);
        zone.rect.setFillStyle(0x9bbcff, 0);
      }
    }
  }

  private isSlotOccupied(lane: number, slot: number): boolean {
    if (!this.room) return false;
    for (const t of this.room.state.towers.values() as unknown as IterableIterator<Tower>) {
      if (t.laneIndex === lane && t.slotIndex === slot) return true;
    }
    return false;
  }

  private getMyLane(): number {
    if (!this.room) return -1;
    const me = this.room.state.players.get(this.room.sessionId);
    return me?.laneIndex ?? -1;
  }

  private onSlotClick(laneIndex: number, slotIndex: number): void {
    if (!this.room) return;
    if (laneIndex !== this.getMyLane()) return;
    this.room.send(MessageType.BUY_TOWER, {
      laneIndex,
      slotIndex,
      towerType: "archer", // einziger Tower in Phase 1 — Picker kommt in Schritt 9
    });
  }

  private subscribeEnemies(): void {
    if (!this.room) return;
    const enemies = this.room.state.enemies as unknown as {
      onAdd: (cb: (enemy: Enemy, key: string) => void) => void;
      onRemove: (cb: (enemy: Enemy, key: string) => void) => void;
    };

    enemies.onAdd((enemy, key) => {
      const def = getEnemy(enemy.enemyType);
      const color = def?.color ?? 0xef4444;

      const body = this.add.circle(0, 0, 12, color);
      body.setStrokeStyle(2, 0x000000, 0.5);

      const hpBg = this.add.rectangle(0, BAR_Y, BAR_W, BAR_H, 0x1a1a2e);
      const hpFill = this.add.rectangle(-BAR_W / 2, BAR_Y, BAR_W, BAR_H, 0x22c55e);
      hpFill.setOrigin(0, 0.5);

      const container = this.add.container(0, 0, [body, hpBg, hpFill]);
      this.enemyViews.set(key, { container, hpFill });
    });

    enemies.onRemove((_enemy, key) => {
      this.enemyViews.get(key)?.container.destroy();
      this.enemyViews.delete(key);
    });
  }

  private createTowerSprite(tower: Tower, key: string): void {
    const lane = this.lanes[tower.laneIndex];
    if (!lane) return;
    const x =
      lane.spawnX +
      ((tower.slotIndex + 0.5) / GAME_CONSTANTS.TOWER_SLOTS_PER_LANE) * lane.laneLength;
    const y = lane.y - 28;
    const def = getTower(tower.towerType);
    const color = def?.color ?? 0x8b5cf6;
    const base = this.add.rectangle(0, 0, 28, 28, color);
    base.setStrokeStyle(2, 0x000000, 0.5);
    const tip = this.add.triangle(0, -10, 0, -8, -8, 8, 8, 8, 0xffffff, 0.85);
    const container = this.add.container(x, y, [base, tip]);
    this.towerSprites.set(key, container);
  }

  private syncTowerSprites(): void {
    if (!this.room) return;
    const stateTowers = this.room.state.towers as unknown as Map<string, Tower>;
    for (const [key, tower] of stateTowers) {
      if (!this.towerSprites.has(key)) {
        this.createTowerSprite(tower, key);
      }
    }
    for (const key of this.towerSprites.keys()) {
      if (!stateTowers.has(key)) {
        this.towerSprites.get(key)?.destroy();
        this.towerSprites.delete(key);
      }
    }
  }

  private subscribeTowers(): void {
    if (!this.room) return;
    const towers = this.room.state.towers as unknown as {
      onAdd: (cb: (tower: Tower, key: string) => void) => void;
      onRemove: (cb: (tower: Tower, key: string) => void) => void;
    };

    towers.onAdd((tower, key) => {
      if (!this.towerSprites.has(key)) this.createTowerSprite(tower, key);
    });

    towers.onRemove((_tower, key) => {
      this.towerSprites.get(key)?.destroy();
      this.towerSprites.delete(key);
    });
  }
}
