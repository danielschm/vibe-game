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

interface Vec2 { x: number; y: number }

interface LaneLayout {
  spawnX: number;
  baseX: number;
  laneLength: number;
  y: number;
  waypoints: Vec2[];
  segLengths: number[];
  pathLength: number;
}

// Winding waypoints for 960×540. Each lane stays in its own horizontal band.
const LANE_WAYPOINTS: Vec2[][] = [
  // Lane 0 — top band (y 65–160)
  [{x:55,y:120},{x:150,y:68},{x:255,y:155},{x:385,y:72},{x:510,y:152},{x:640,y:75},{x:760,y:148},{x:885,y:110}],
  // Lane 1 — middle band (y 205–315)
  [{x:55,y:265},{x:180,y:310},{x:310,y:208},{x:450,y:305},{x:580,y:215},{x:710,y:300},{x:835,y:248},{x:885,y:265}],
  // Lane 2 — bottom band (y 355–470)
  [{x:55,y:415},{x:175,y:468},{x:305,y:365},{x:440,y:462},{x:570,y:362},{x:700,y:455},{x:830,y:388},{x:885,y:415}],
];

function buildSegLengths(pts: Vec2[]): number[] {
  const lens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    lens.push(Math.sqrt(dx * dx + dy * dy));
  }
  return lens;
}

function samplePath(layout: LaneLayout, progress: number): Vec2 {
  const { waypoints: pts, segLengths, pathLength } = layout;
  if (progress <= 0) return pts[0];
  if (progress >= 1) return pts[pts.length - 1];
  let target = progress * pathLength;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i]) {
      const t = target / segLengths[i];
      return {
        x: pts[i].x + t * (pts[i + 1].x - pts[i].x),
        y: pts[i].y + t * (pts[i + 1].y - pts[i].y),
      };
    }
    target -= segLengths[i];
  }
  return pts[pts.length - 1];
}

function slotXY(layout: LaneLayout, slotIndex: number): Vec2 {
  const progress = (slotIndex + 0.5) / GAME_CONSTANTS.TOWER_SLOTS_PER_LANE;
  const pt = samplePath(layout, progress);
  return { x: pt.x, y: pt.y - 28 };
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
  private sceneAlive = false;

  constructor() {
    super({ key: "Game" });
  }

  create(): void {
    this.sceneAlive = true;
    this.events.once(Phaser.Scenes.Events.DESTROY, () => { this.sceneAlive = false; });

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
      if (!this.sceneAlive) return;
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
      const { x, y } = samplePath(lane, enemy.progress);
      view.container.setPosition(x, y);
      const hpRatio = enemy.hpMax > 0 ? enemy.hp / enemy.hpMax : 0;
      view.hpFill.scaleX = Math.max(0, hpRatio);
      view.hpFill.fillColor = hpColor(hpRatio);
    }
  }

  private computeLaneLayout(): LaneLayout[] {
    return LANE_WAYPOINTS.map((waypoints) => {
      const segLengths = buildSegLengths(waypoints);
      const pathLength = segLengths.reduce((s, l) => s + l, 0);
      const first = waypoints[0];
      const last = waypoints[waypoints.length - 1];
      return {
        spawnX: first.x,
        baseX: last.x,
        laneLength: GAME_CONSTANTS.LANE_LENGTH,
        y: first.y,
        waypoints,
        segLengths,
        pathLength,
      };
    });
  }

  private drawBackground(): void {
    const level = this.room ? getLevel(this.room.state.levelId) : undefined;
    const color = level?.backgroundColor ?? 0x232347;
    this.cameras.main.setBackgroundColor(color);
  }

  private drawLanes(): void {
    const trackColor = 0x3d3d6b;
    const baseColor = 0x9bbcff;
    const g = this.add.graphics();

    for (let i = 0; i < this.lanes.length; i++) {
      const lane = this.lanes[i];

      // Pfad als breite Polylinie
      g.lineStyle(12, trackColor, 1);
      g.beginPath();
      g.moveTo(lane.waypoints[0].x, lane.waypoints[0].y);
      for (let k = 1; k < lane.waypoints.length; k++) {
        g.lineTo(lane.waypoints[k].x, lane.waypoints[k].y);
      }
      g.strokePath();

      // Lane-Nummer am Start
      this.add
        .text(lane.waypoints[0].x - 18, lane.waypoints[0].y, `${i + 1}`, {
          fontSize: "18px",
          color: "#9bbcff",
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5);

      // Basis-Block am Ende
      const end = lane.waypoints[lane.waypoints.length - 1];
      this.add.rectangle(end.x + 20, end.y, 22, 30, baseColor).setOrigin(0.5);
    }

    // Verbindungsbalken der Basis-Blöcke
    const endPts = this.lanes.map((l) => l.waypoints[l.waypoints.length - 1]);
    const minY = Math.min(...endPts.map((p) => p.y));
    const maxY = Math.max(...endPts.map((p) => p.y));
    this.add
      .rectangle(endPts[0].x + 30, (minY + maxY) / 2, 6, maxY - minY + 60, baseColor, 0.3)
      .setOrigin(0.5);
  }

  private drawSlotZones(): void {
    for (let l = 0; l < this.lanes.length; l++) {
      const lane = this.lanes[l];
      for (let s = 0; s < GAME_CONSTANTS.TOWER_SLOTS_PER_LANE; s++) {
        const { x, y } = slotXY(lane, s);
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
      if (!this.sceneAlive) return;
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
      if (!this.sceneAlive) return;
      this.enemyViews.get(key)?.container.destroy();
      this.enemyViews.delete(key);
    });
  }

  private createTowerSprite(tower: Tower, key: string): void {
    const lane = this.lanes[tower.laneIndex];
    if (!lane) return;
    const { x, y } = slotXY(lane, tower.slotIndex);
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
      if (!this.sceneAlive) return;
      if (!this.towerSprites.has(key)) this.createTowerSprite(tower, key);
    });

    towers.onRemove((_tower, key) => {
      if (!this.sceneAlive) return;
      this.towerSprites.get(key)?.destroy();
      this.towerSprites.delete(key);
    });
  }
}
