import Phaser from "phaser";
import type { Room } from "colyseus.js";
import {
  GAME_CONSTANTS,
  MessageType,
  getEnemy,
  getEffectiveTowerStats,
  getLevel,
  getTower,
  type Enemy,
  type GameState,
  type Player,
  type Tower,
  type TowerFiredEvent,
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

// ─── Placement-Konstanten ────────────────────────────────────────────────────

const TOWER_RADIUS = GAME_CONSTANTS.TOWER_RADIUS;
// Mindestabstand vom Pfad-Mittelpunkt (halbe Strichbreite 6 + Turm-Radius + Puffer)
const PATH_CLEARANCE = 6 + TOWER_RADIUS + 4;

// Y-Grenzen der Lane-Bänder (basierend auf Waypoint-Bereichen + Puffer)
const LANE_Y_BOUNDS = [
  { min: 40, max: 181 },   // Lane 0
  { min: 181, max: 336 },  // Lane 1
  { min: 336, max: 490 },  // Lane 2
] as const;
const LANE_X_MIN = 60;
const LANE_X_MAX = 880;

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax; const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.sqrt((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2);
}

function nearestPathInfo(layout: LaneLayout, px: number, py: number): { progress: number; dist: number } {
  let bestProgress = 0;
  let bestDist = Infinity;
  let accumulated = 0;
  const { waypoints, segLengths, pathLength } = layout;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const ax = waypoints[i].x; const ay = waypoints[i].y;
    const bx = waypoints[i + 1].x; const by = waypoints[i + 1].y;
    const segLen = segLengths[i];
    const dx = bx - ax; const dy = by - ay;
    const t = lenSq(dx, dy) === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq(dx, dy)));
    const dist = Math.sqrt((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2);
    if (dist < bestDist) { bestDist = dist; bestProgress = (accumulated + t * segLen) / pathLength; }
    accumulated += segLen;
  }
  return { progress: Math.max(0, Math.min(1, bestProgress)), dist: bestDist };
}

function lenSq(dx: number, dy: number): number { return dx * dx + dy * dy; }

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
  private enemyViews = new Map<string, EnemyView>();
  private towerSprites = new Map<string, Phaser.GameObjects.Container>();
  private sceneAlive = false;

  private activeMenu: { container: Phaser.GameObjects.Container; towerId: string } | null = null;
  private menuClickConsumed = false;

  private ghost: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: "Game" });
  }

  create(): void {
    this.sceneAlive = true;
    this.menuClickConsumed = false;
    this.events.once(Phaser.Scenes.Events.DESTROY, () => { this.sceneAlive = false; });

    this.room = (this.game.registry.get("room") as Room<GameState> | undefined) ?? null;

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
    this.subscribeTowers();

    this.room.onStateChange(() => {
      if (!this.sceneAlive) return;
      this.syncTowerSprites();
    });

    this.room.onMessage(MessageType.TOWER_FIRED, (data: TowerFiredEvent) => {
      if (this.sceneAlive) this.playShootAnim(data);
    });

    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerdown", this.onPointerDown, this);
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

      g.lineStyle(12, trackColor, 1);
      g.beginPath();
      g.moveTo(lane.waypoints[0].x, lane.waypoints[0].y);
      for (let k = 1; k < lane.waypoints.length; k++) {
        g.lineTo(lane.waypoints[k].x, lane.waypoints[k].y);
      }
      g.strokePath();

      this.add
        .text(lane.waypoints[0].x - 18, lane.waypoints[0].y, `${i + 1}`, {
          fontSize: "18px",
          color: "#9bbcff",
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5);

      const end = lane.waypoints[lane.waypoints.length - 1];
      this.add.rectangle(end.x + 20, end.y, 22, 30, baseColor).setOrigin(0.5);
    }

    const endPts = this.lanes.map((l) => l.waypoints[l.waypoints.length - 1]);
    const minY = Math.min(...endPts.map((p) => p.y));
    const maxY = Math.max(...endPts.map((p) => p.y));
    this.add
      .rectangle(endPts[0].x + 30, (minY + maxY) / 2, 6, maxY - minY + 60, baseColor, 0.3)
      .setOrigin(0.5);
  }

  private getMyLane(): number {
    if (!this.room) return -1;
    const me = this.room.state.players.get(this.room.sessionId);
    return me?.laneIndex ?? -1;
  }

  // ─── Freie Platzierung ───────────────────────────────────────────────────────

  private getLaneForPoint(x: number, y: number): number {
    if (x < LANE_X_MIN || x > LANE_X_MAX) return -1;
    for (let i = 0; i < LANE_Y_BOUNDS.length; i++) {
      if (y >= LANE_Y_BOUNDS[i].min && y < LANE_Y_BOUNDS[i].max) return i;
    }
    return -1;
  }

  private isValidPlacement(x: number, y: number, laneIndex: number): boolean {
    const lane = this.lanes[laneIndex];
    if (!lane) return false;

    // Mindestabstand zum Pfad
    const { waypoints } = lane;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const d = distToSegment(x, y, waypoints[i].x, waypoints[i].y, waypoints[i + 1].x, waypoints[i + 1].y);
      if (d < PATH_CLEARANCE) return false;
    }

    // Kollision mit bestehenden Towers
    if (this.room) {
      for (const t of (this.room.state.towers as unknown as Map<string, Tower>).values()) {
        const dx = t.px - x; const dy = t.py - y;
        if (dx * dx + dy * dy < (TOWER_RADIUS * 2) ** 2) return false;
      }
    }

    return true;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const selectedType = this.game.registry.get("selectedTowerType") as string | null;
    if (!selectedType) { this.clearGhost(); return; }
    const myLane = this.getMyLane();
    const laneIndex = this.getLaneForPoint(pointer.x, pointer.y);
    if (laneIndex !== myLane) { this.clearGhost(); return; }
    const valid = this.isValidPlacement(pointer.x, pointer.y, laneIndex);
    this.updateGhost(pointer.x, pointer.y, selectedType, valid);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.menuClickConsumed) {
      this.menuClickConsumed = false;
      return;
    }
    this.closeTowerMenu();

    const selectedType = this.game.registry.get("selectedTowerType") as string | null;
    if (!selectedType || !this.room) return;

    const myLane = this.getMyLane();
    const laneIndex = this.getLaneForPoint(pointer.x, pointer.y);
    if (laneIndex !== myLane) return;
    if (!this.isValidPlacement(pointer.x, pointer.y, laneIndex)) return;

    const lane = this.lanes[laneIndex];
    const { progress } = nearestPathInfo(lane, pointer.x, pointer.y);

    this.room.send(MessageType.BUY_TOWER, {
      laneIndex,
      px: Math.round(pointer.x),
      py: Math.round(pointer.y),
      laneProgress: progress,
      towerType: selectedType,
    });

    // Auswahl nach dem Setzen aufheben
    this.game.registry.set("selectedTowerType", null);
    this.clearGhost();
    const cb = this.game.registry.get("onTowerPlaced") as (() => void) | undefined;
    cb?.();
  }

  private updateGhost(x: number, y: number, towerType: string, valid: boolean): void {
    if (!this.ghost) {
      this.ghost = this.add.container(0, 0);
      this.ghost.setDepth(5);
    }
    this.ghost.removeAll(true);
    this.ghost.setPosition(x, y);

    const def = getTower(towerType);
    const towerColor = def?.color ?? 0x8b5cf6;
    const color = valid ? towerColor : 0xef4444;
    const alpha = valid ? 0.65 : 0.4;

    const g = this.add.graphics();
    if (valid && def) {
      // Reichweiten-Ring
      g.lineStyle(1, color, 0.2);
      g.strokeCircle(0, 0, def.range);
    }
    g.fillStyle(color, alpha);
    g.fillRect(-14, -14, 28, 28);
    g.lineStyle(2, valid ? 0xffffff : 0xff8888, 0.7);
    g.strokeRect(-14, -14, 28, 28);
    this.ghost.add(g);
  }

  private clearGhost(): void {
    if (this.ghost) { this.ghost.destroy(); this.ghost = null; }
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
      container.setDepth(1);
      this.enemyViews.set(key, { container, hpFill });
    });

    enemies.onRemove((_enemy, key) => {
      if (!this.sceneAlive) return;
      this.enemyViews.get(key)?.container.destroy();
      this.enemyViews.delete(key);
    });
  }

  private createTowerSprite(tower: Tower, key: string): void {
    const def = getTower(tower.towerType);
    const color = def?.color ?? 0x8b5cf6;
    const base = this.add.rectangle(0, 0, 28, 28, color);
    base.setStrokeStyle(2, 0x000000, 0.5);
    const tip = this.add.triangle(0, -10, 0, -8, -8, 8, 8, 8, 0xffffff, 0.85);
    const container = this.add.container(tower.px, tower.py, [base, tip]);
    container.setDepth(2);
    container.setSize(36, 36);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerdown", () => {
      this.menuClickConsumed = true;
      this.onTowerClick(key);
    });
    container.on("pointerover", () => base.setStrokeStyle(3, 0xffffff, 0.8));
    container.on("pointerout", () => base.setStrokeStyle(2, 0x000000, 0.5));
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

  // ─── Tower-Menü ──────────────────────────────────────────────────────────────

  private onTowerClick(key: string): void {
    if (!this.room) return;
    if (this.activeMenu?.towerId === key) {
      this.closeTowerMenu();
      return;
    }
    this.closeTowerMenu();
    const tower = (this.room.state.towers as unknown as Map<string, Tower>).get(key);
    if (!tower) return;
    this.openTowerMenu(tower, key);
  }

  private openTowerMenu(tower: Tower, key: string): void {
    const x = tower.px;
    const y = tower.py;
    const def = getTower(tower.towerType);
    if (!def) return;

    const myId = this.room!.sessionId;
    const isOwn = tower.ownerId === myId;
    const me = (this.room!.state.players as unknown as Map<string, Player>).get(myId);
    const myGold = me?.gold ?? 0;
    const killCount = (this.room!.state as unknown as GameState).enemiesKilled ?? 0;
    const stats = getEffectiveTowerStats(def, tower.level);

    const container = this.add.container(x, y);
    container.setDepth(10);

    // Hintergrund-Kreis
    const bg = this.add.graphics();
    bg.fillStyle(0x080814, 0.93);
    bg.lineStyle(2, def.color, 0.85);
    bg.fillCircle(0, 0, 72);
    bg.strokeCircle(0, 0, 72);
    container.add(bg);

    // Tower-Name
    container.add(
      this.add
        .text(0, -54, def.name, { fontSize: "11px", color: "#ffffff", fontStyle: "bold" })
        .setOrigin(0.5),
    );

    // Level-Anzeige mit Tower-Farbe
    const levelColor = `#${def.color.toString(16).padStart(6, "0")}`;
    container.add(
      this.add
        .text(0, -40, `Level ${tower.level}`, { fontSize: "9px", color: levelColor })
        .setOrigin(0.5),
    );

    // Stats
    container.add(
      this.add
        .text(0, -24, `${stats.damage} Schaden  ·  ${stats.fireRate.toFixed(1)}/s\nReichweite ${stats.range}`, {
          fontSize: "9px",
          color: "#7080a0",
          align: "center",
        })
        .setOrigin(0.5),
    );

    // Effekt-Zeile
    if (stats.effect) {
      const effectLabel = this.effectLabel(stats.effect);
      container.add(
        this.add
          .text(0, -8, effectLabel, { fontSize: "8px", color: "#a0b0c0", align: "center" })
          .setOrigin(0.5),
      );
    }

    // Upgrade-Bereich (nur eigene Türme)
    if (isOwn) {
      const upgradeIdx = tower.level - 1;
      const upgrade = def.upgrades?.[upgradeIdx];

      if (upgrade) {
        const unlockKills = upgrade.unlockAfterKills ?? 0;
        const isUnlocked = unlockKills <= killCount;
        const canAfford = myGold >= upgrade.cost;
        const btnColor = isUnlocked && canAfford ? 0x22c55e : isUnlocked ? 0xeab308 : 0x3a3a5c;

        const btn = this.add.rectangle(0, 38, 124, 22, btnColor, 0.92);
        container.add(btn);

        const label = isUnlocked
          ? `${upgrade.label}  ${upgrade.cost}g`
          : `${upgrade.label}  (${unlockKills} kills)`;
        container.add(
          this.add
            .text(0, 38, label, { fontSize: "9px", color: "#ffffff", align: "center" })
            .setOrigin(0.5),
        );

        if (isUnlocked && canAfford) {
          btn.setInteractive({ useHandCursor: true });
          btn.on("pointerdown", () => {
            this.menuClickConsumed = true;
            this.room!.send(MessageType.UPGRADE_TOWER, { towerId: tower.id });
            this.closeTowerMenu();
          });
          btn.on("pointerover", () => btn.setFillStyle(btnColor, 0.65));
          btn.on("pointerout", () => btn.setFillStyle(btnColor, 0.92));
        }
      } else {
        container.add(
          this.add
            .text(0, 38, "Max Level", { fontSize: "9px", color: "#4a5a7a" })
            .setOrigin(0.5),
        );
      }
    } else {
      // Fremder Tower: nur Info-Zeile
      container.add(
        this.add
          .text(0, 38, `Lane ${tower.laneIndex + 1}`, { fontSize: "9px", color: "#4a5a7a" })
          .setOrigin(0.5),
      );
    }

    // Einblenden
    container.setAlpha(0).setScale(0.65);
    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 140,
      ease: "Back.Out",
    });

    this.activeMenu = { container, towerId: key };
  }

  private closeTowerMenu(): void {
    if (!this.activeMenu) return;
    const c = this.activeMenu.container;
    this.activeMenu = null;
    this.tweens.add({
      targets: c,
      alpha: 0,
      scaleX: 0.7,
      scaleY: 0.7,
      duration: 100,
      ease: "Power2",
      onComplete: () => c.destroy(),
    });
  }

  private effectLabel(effect: NonNullable<ReturnType<typeof getEffectiveTowerStats>["effect"]>): string {
    switch (effect.type) {
      case "slow": return `Slow ${Math.round(effect.factor * 100)}%  ${effect.duration}s`;
      case "freeze": return `Freeze ${effect.duration}s`;
      case "burn": return `Burn ${effect.dpsPercent}%/s  ${effect.duration}s`;
      case "splash": return `Splash r${effect.radius}`;
      case "chain": return `Chain x${effect.maxTargets}  ${Math.round(effect.damageFalloff * 100)}%`;
      default: return "";
    }
  }

  // ─── Schieß-Animationen ───────────────────────────────────────────────────────

  private playShootAnim(data: TowerFiredEvent): void {
    if (!this.room || !data.targets.length) return;
    const sprite = this.towerSprites.get(data.towerId);
    if (!sprite) return;
    const tower = (this.room.state.towers as unknown as Map<string, Tower>).get(data.towerId);
    if (!tower) return;
    const def = getTower(tower.towerType);
    if (!def?.shootAnim) return;

    const from: Vec2 = { x: sprite.x, y: sprite.y };
    const primary = data.targets[0];
    const lane = this.lanes[primary.laneIndex];
    if (!lane) return;
    const to = samplePath(lane, primary.progress);

    const { style, color: animColor, speed = 350 } = def.shootAnim;
    const color = animColor ?? def.color;

    switch (style) {
      case "arrow":      this.spawnArrow(from, to, speed, color); break;
      case "cannonball": this.spawnCannonball(from, to, speed); break;
      case "bolt":       this.spawnBolt(from, data.targets); break;
      case "orb":        this.spawnOrb(from, to, speed, color, def.element); break;
      case "beam":       this.spawnOrb(from, to, speed, color, def.element); break;
    }
  }

  private getTargetPos(t: { progress: number; laneIndex: number }): Vec2 {
    const lane = this.lanes[t.laneIndex];
    return lane ? samplePath(lane, t.progress) : { x: 0, y: 0 };
  }

  // Pfeil (neutral — Bogenschütze)
  private spawnArrow(from: Vec2, to: Vec2, speed: number, color: number): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const g = this.add.graphics();
    g.fillStyle(color, 0.95);
    g.fillRect(-9, -1.5, 11, 3);
    g.fillTriangle(2, -3.5, 7, 0, 2, 3.5);
    g.setPosition(from.x, from.y);
    g.setRotation(Math.atan2(dy, dx));
    g.setDepth(3);

    this.tweens.add({
      targets: g,
      x: to.x,
      y: to.y,
      duration: (dist / speed) * 1000,
      ease: "Linear",
      onComplete: () => {
        g.destroy();
        this.spawnHitFlash(to.x, to.y, color, 7);
      },
    });
  }

  // Kanonenkugel (fire — Kanone)
  private spawnCannonball(from: Vec2, to: Vec2, speed: number): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const g = this.add.graphics();
    g.fillStyle(0xef4444, 1);
    g.fillCircle(0, 0, 6);
    g.fillStyle(0xff8822, 0.7);
    g.fillCircle(-1, -1, 3);
    g.setPosition(from.x, from.y);
    g.setDepth(3);

    this.tweens.add({
      targets: g,
      x: to.x,
      y: to.y,
      duration: (dist / speed) * 1000,
      ease: "Linear",
      onComplete: () => {
        g.destroy();
        this.spawnExplosion(to.x, to.y);
      },
    });
  }

  private spawnExplosion(x: number, y: number): void {
    const g = this.add.graphics();
    g.setPosition(x, y);
    g.setDepth(3);
    g.fillStyle(0xff8822, 0.55);
    g.fillCircle(0, 0, 10);
    g.lineStyle(2, 0xef4444, 0.9);
    g.strokeCircle(0, 0, 10);
    this.tweens.add({
      targets: g,
      scaleX: 3.5,
      scaleY: 3.5,
      alpha: 0,
      duration: 320,
      ease: "Power2",
      onComplete: () => g.destroy(),
    });
  }

  // Blitz (lightning — Blitzturm, sofortige Zickzack-Linie)
  private spawnBolt(from: Vec2, targets: Array<{ progress: number; laneIndex: number }>): void {
    const g = this.add.graphics();
    g.setDepth(3);

    const t0 = this.getTargetPos(targets[0]);
    this.drawZigzag(g, from, t0, 0xfbbf24, 2.5);

    for (let i = 1; i < targets.length; i++) {
      const prev = this.getTargetPos(targets[i - 1]);
      const curr = this.getTargetPos(targets[i]);
      this.drawZigzag(g, prev, curr, 0x93c5fd, 1.5);
    }

    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 220,
      ease: "Linear",
      onComplete: () => g.destroy(),
    });
  }

  private drawZigzag(
    g: Phaser.GameObjects.Graphics,
    from: Vec2,
    to: Vec2,
    color: number,
    lineWidth: number,
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;

    const perpX = -dy / dist;
    const perpY = dx / dist;
    const amp = Math.min(8, dist * 0.1);
    const segs = 5;

    const pts: Vec2[] = [from];
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const sign = i % 2 === 0 ? 1 : -1;
      pts.push({ x: from.x + dx * t + perpX * sign * amp, y: from.y + dy * t + perpY * sign * amp });
    }
    pts.push(to);

    // Glow (breite halbtransparente Linie)
    g.lineStyle(lineWidth * 3, color, 0.2);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
    g.strokePath();

    // Kern-Linie
    g.lineStyle(lineWidth, color, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
    g.strokePath();
  }

  // Orb (ice — Frostmagier / poison — Giftwerfer, fliegt zum Ziel mit Trail)
  private spawnOrb(from: Vec2, to: Vec2, speed: number, color: number, element: string): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const g = this.add.graphics();
    g.fillStyle(color, 0.9);
    g.fillCircle(0, 0, 5);
    g.lineStyle(1, 0xffffff, 0.45);
    g.strokeCircle(0, 0, 5);
    g.setPosition(from.x, from.y);
    g.setDepth(3);

    let lastTX = from.x;
    let lastTY = from.y;

    this.tweens.add({
      targets: g,
      x: to.x,
      y: to.y,
      duration: (dist / speed) * 1000,
      ease: "Linear",
      onUpdate: () => {
        const tdx = g.x - lastTX;
        const tdy = g.y - lastTY;
        if (tdx * tdx + tdy * tdy >= 144) {
          lastTX = g.x;
          lastTY = g.y;
          const trail = this.add.graphics();
          trail.fillStyle(color, 0.32);
          trail.fillCircle(0, 0, 3);
          trail.setPosition(g.x, g.y);
          trail.setDepth(3);
          this.tweens.add({
            targets: trail,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 270,
            ease: "Linear",
            onComplete: () => trail.destroy(),
          });
        }
      },
      onComplete: () => {
        g.destroy();
        if (element === "ice") {
          this.spawnIceCrystal(to.x, to.y, color);
        } else {
          this.spawnHitFlash(to.x, to.y, color, 10);
        }
      },
    });
  }

  private spawnIceCrystal(x: number, y: number, color: number): void {
    const g = this.add.graphics();
    g.setPosition(x, y);
    g.setDepth(3);
    g.lineStyle(1.5, color, 0.9);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI;
      g.lineBetween(
        Math.cos(angle) * -9, Math.sin(angle) * -9,
        Math.cos(angle) * 9,  Math.sin(angle) * 9,
      );
    }
    g.lineStyle(1, color, 0.6);
    g.strokeCircle(0, 0, 5);
    this.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.9,
      scaleY: 1.9,
      duration: 360,
      ease: "Power2",
      onComplete: () => g.destroy(),
    });
  }

  private spawnHitFlash(x: number, y: number, color: number, radius = 10): void {
    const g = this.add.graphics();
    g.fillStyle(color, 0.8);
    g.fillCircle(0, 0, radius);
    g.setPosition(x, y);
    g.setDepth(3);
    this.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.9,
      scaleY: 1.9,
      duration: 200,
      ease: "Power2",
      onComplete: () => g.destroy(),
    });
  }
}
