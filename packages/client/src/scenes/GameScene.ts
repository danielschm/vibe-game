import Phaser from "phaser";
import type { Room } from "colyseus.js";
import {
  GAME_CONSTANTS,
  getEnemy,
  getLevel,
  type Enemy,
  type GameState,
} from "@vibe-game/shared";
import { GAME_VIEWPORT } from "../game";

interface LaneLayout {
  spawnX: number;
  baseX: number;
  y: number;
}

export class GameScene extends Phaser.Scene {
  private room: Room<GameState> | null = null;
  private lanes: LaneLayout[] = [];
  private enemySprites = new Map<string, Phaser.GameObjects.Arc>();
  private hpTexts = new Map<string, Phaser.GameObjects.Text>();

  constructor() {
    super({ key: "Game" });
  }

  create(): void {
    this.room = this.game.registry.get("room") as Room<GameState> | undefined ?? null;

    this.lanes = this.computeLaneLayout();
    this.drawBackground();
    this.drawLanes();

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
  }

  override update(): void {
    if (!this.room) return;
    for (const [id, enemy] of this.room.state.enemies as unknown as Map<string, Enemy>) {
      const sprite = this.enemySprites.get(id);
      const text = this.hpTexts.get(id);
      if (!sprite) continue;

      const lane = this.lanes[enemy.laneIndex];
      if (!lane) continue;

      const x = lane.spawnX + enemy.progress * (lane.baseX - lane.spawnX);
      sprite.setPosition(x, lane.y);
      if (text) text.setPosition(x, lane.y - 18);

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
      layouts.push({
        spawnX: margin,
        baseX: GAME_VIEWPORT.width - baseMargin,
        y,
      });
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
      const length = lane.baseX - lane.spawnX;

      // Lane-Track als Rechteck
      this.add.rectangle(
        lane.spawnX + length / 2,
        lane.y,
        length,
        14,
        trackColor,
      ).setOrigin(0.5);

      // Lane-Label links
      this.add
        .text(lane.spawnX - 20, lane.y, `${i + 1}`, {
          fontSize: "20px",
          color: "#9bbcff",
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5);

      // Basis rechts
      this.add.rectangle(lane.baseX + 20, lane.y, 22, 30, baseColor).setOrigin(0.5);
    }

    // Sammelbasis-Box rechts (visuell die "gemeinsame Basis")
    const baseCenterY = (this.lanes[0].y + this.lanes[this.lanes.length - 1].y) / 2;
    const baseHeight = this.lanes[this.lanes.length - 1].y - this.lanes[0].y + 60;
    this.add
      .rectangle(this.lanes[0].baseX + 30, baseCenterY, 6, baseHeight, baseColor, 0.3)
      .setOrigin(0.5);
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

      const text = this.add
        .text(0, 0, "", {
          fontSize: "12px",
          color: "#ffffff",
        })
        .setOrigin(0.5, 1);
      this.hpTexts.set(key, text);
    });

    enemies.onRemove((_enemy, key) => {
      this.enemySprites.get(key)?.destroy();
      this.hpTexts.get(key)?.destroy();
      this.enemySprites.delete(key);
      this.hpTexts.delete(key);
    });
  }
}
