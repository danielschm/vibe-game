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

export class GameScene extends Phaser.Scene {
  private room: Room<GameState> | null = null;
  private lanes: LaneLayout[] = [];
  private slotZones: SlotZone[] = [];
  private enemySprites = new Map<string, Phaser.GameObjects.Arc>();
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

    // Bei Player-Änderungen Slot-Highlights neu setzen (Lane-Zuweisung)
    this.room.onStateChange(() => this.refreshSlotInteractivity());
  }

  override update(): void {
    if (!this.room) return;
    for (const [id, enemy] of this.room.state.enemies as unknown as Map<string, Enemy>) {
      const sprite = this.enemySprites.get(id);
      if (!sprite) continue;
      const lane = this.lanes[enemy.laneIndex];
      if (!lane) continue;
      const x = lane.spawnX + enemy.progress * lane.laneLength;
      sprite.setPosition(x, lane.y);

      const def = getEnemy(enemy.enemyType);
      if (def) sprite.fillColor = def.color;

      const hpRatio = enemy.hpMax > 0 ? enemy.hp / enemy.hpMax : 0;
      sprite.setScale(0.7 + 0.3 * hpRatio);
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
      const sprite = this.add.circle(0, 0, 12, def?.color ?? 0xef4444);
      sprite.setStrokeStyle(2, 0x000000, 0.4);
      this.enemySprites.set(key, sprite);
    });

    enemies.onRemove((_enemy, key) => {
      this.enemySprites.get(key)?.destroy();
      this.enemySprites.delete(key);
    });
  }

  private subscribeTowers(): void {
    if (!this.room) return;
    const towers = this.room.state.towers as unknown as {
      onAdd: (cb: (tower: Tower, key: string) => void) => void;
      onRemove: (cb: (tower: Tower, key: string) => void) => void;
    };

    towers.onAdd((tower, key) => {
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
      const top = this.add.triangle(0, -10, 0, -8, -8, 8, 8, 8, 0xffffff, 0.85);

      const container = this.add.container(x, y, [base, top]);
      this.towerSprites.set(key, container);

      this.refreshSlotInteractivity();
    });

    towers.onRemove((_tower, key) => {
      this.towerSprites.get(key)?.destroy();
      this.towerSprites.delete(key);
      this.refreshSlotInteractivity();
    });
  }
}
