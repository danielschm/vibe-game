import {
  GAME_CONSTANTS,
  getEnemy,
  getTower,
  getEffectiveTowerStats,
  type Enemy,
  type GameState,
  type Tower,
  type TowerDefinition,
  type TowerEffect,
  type EffectiveTowerStats,
} from "@vibe-game/shared";

type FireTarget = { id: string; progress: number; laneIndex: number };
export type OnFireCallback = (towerId: string, targets: FireTarget[]) => void;

export function towerLaneX(slotIndex: number): number {
  return (
    ((slotIndex + 0.5) / GAME_CONSTANTS.TOWER_SLOTS_PER_LANE) * GAME_CONSTANTS.LANE_LENGTH
  );
}

export function updateTowerCombat(state: GameState, dt: number, onFire?: OnFireCallback): void {
  updateStatusEffects(state, dt);

  for (const tower of state.towers.values()) {
    const def = getTower(tower.towerType);
    if (!def) continue;

    if (tower.cooldownTimer > 0) {
      tower.cooldownTimer = Math.max(0, tower.cooldownTimer - dt);
      continue;
    }

    const stats = getEffectiveTowerStats(def, tower.level);
    const target = findTarget(state, tower, stats.range);
    if (!target) continue;

    processShot(state, tower, def, target, stats, onFire);
    tower.cooldownTimer = 1 / stats.fireRate;
  }
}

function processShot(
  state: GameState,
  tower: Tower,
  def: TowerDefinition,
  target: Enemy,
  stats: EffectiveTowerStats,
  onFire?: OnFireCallback,
): void {
  if (!state.enemies.has(target.id)) return;

  const resMult = getResistanceMultiplier(def, target);
  const damage = stats.damage * resMult;

  // Positionen vor dem Schaden einsammeln, damit der Client sie animieren kann
  onFire?.(tower.id, collectFireTargets(state, tower, target, stats));

  if (stats.effect?.type === "chain") {
    applyChain(state, tower, target, damage, stats.effect);
  } else {
    dealDamage(state, tower, target, damage);

    if (stats.effect?.type === "splash") {
      applySplash(state, tower, target, damage, stats.effect.radius);
    }

    if (state.enemies.has(target.id)) {
      applyStatusEffect(target, stats.effect, tower.ownerId);
    }
  }
}

function collectFireTargets(
  state: GameState,
  tower: Tower,
  primary: Enemy,
  stats: EffectiveTowerStats,
): FireTarget[] {
  const result: FireTarget[] = [
    { id: primary.id, progress: primary.progress, laneIndex: primary.laneIndex },
  ];
  if (stats.effect?.type !== "chain") return result;

  const hit = new Set([primary.id]);
  let current: Enemy = primary;
  for (let i = 1; i < stats.effect.maxTargets; i++) {
    const next = findChainNext(state, current, hit, tower.laneIndex);
    if (!next) break;
    hit.add(next.id);
    result.push({ id: next.id, progress: next.progress, laneIndex: next.laneIndex });
    current = next;
  }
  return result;
}

function dealDamage(state: GameState, tower: Tower, enemy: Enemy, damage: number): void {
  if (!state.enemies.has(enemy.id)) return;
  enemy.hp = Math.max(0, enemy.hp - damage);
  if (enemy.hp <= 0) {
    state.enemiesKilled += 1;
    const enemyDef = getEnemy(enemy.enemyType);
    if (enemyDef) {
      const owner = state.players.get(tower.ownerId);
      if (owner) owner.gold += enemyDef.reward;
    }
    state.enemies.delete(enemy.id);
  }
}

function applySplash(
  state: GameState,
  tower: Tower,
  origin: Enemy,
  damage: number,
  radius: number,
): void {
  const originX = origin.progress * GAME_CONSTANTS.LANE_LENGTH;
  for (const other of state.enemies.values()) {
    if (other.id === origin.id) continue;
    if (other.laneIndex !== tower.laneIndex) continue;
    const otherX = other.progress * GAME_CONSTANTS.LANE_LENGTH;
    if (Math.abs(otherX - originX) <= radius) {
      dealDamage(state, tower, other, damage);
    }
  }
}

function applyChain(
  state: GameState,
  tower: Tower,
  firstTarget: Enemy,
  damage: number,
  effect: Extract<TowerEffect, { type: "chain" }>,
): void {
  const hit = new Set<string>();
  let current: Enemy | null = firstTarget;
  let currentDamage = damage;

  for (let i = 0; i < effect.maxTargets && current; i++) {
    hit.add(current.id);
    dealDamage(state, tower, current, currentDamage);
    currentDamage *= effect.damageFalloff;
    current = findChainNext(state, current, hit, tower.laneIndex);
  }
}

function findChainNext(
  state: GameState,
  from: Enemy,
  already: Set<string>,
  laneIndex: number,
): Enemy | null {
  const fromX = from.progress * GAME_CONSTANTS.LANE_LENGTH;
  const searchRadius = GAME_CONSTANTS.LANE_LENGTH * 0.2;
  let best: Enemy | null = null;
  let bestDist = Infinity;

  for (const enemy of state.enemies.values()) {
    if (already.has(enemy.id)) continue;
    if (enemy.laneIndex !== laneIndex) continue;
    const dist = Math.abs(enemy.progress * GAME_CONSTANTS.LANE_LENGTH - fromX);
    if (dist <= searchRadius && dist < bestDist) {
      best = enemy;
      bestDist = dist;
    }
  }

  return best;
}

function applyStatusEffect(enemy: Enemy, effect: TowerEffect | undefined, ownerId: string): void {
  if (!effect) return;
  switch (effect.type) {
    case "slow":
      enemy.speedMultiplier = Math.min(enemy.speedMultiplier, 1 - effect.factor);
      enemy.slowTimer = Math.max(enemy.slowTimer, effect.duration);
      break;
    case "freeze":
      enemy.speedMultiplier = 0;
      enemy.freezeTimer = Math.max(enemy.freezeTimer, effect.duration);
      break;
    case "burn": {
      const dps = enemy.hpMax * (effect.dpsPercent / 100);
      if (dps > enemy.burnDps) {
        enemy.burnDps = dps;
        enemy.burnOwnerId = ownerId;
      }
      enemy.burnTimer = Math.max(enemy.burnTimer, effect.duration);
      break;
    }
  }
}

function updateStatusEffects(state: GameState, dt: number): void {
  const toRemove: string[] = [];

  for (const [id, enemy] of state.enemies) {
    if (enemy.burnTimer > 0) {
      enemy.burnTimer = Math.max(0, enemy.burnTimer - dt);
      enemy.hp = Math.max(0, enemy.hp - enemy.burnDps * dt);
      if (enemy.hp <= 0) {
        state.enemiesKilled += 1;
        const enemyDef = getEnemy(enemy.enemyType);
        if (enemyDef && enemy.burnOwnerId) {
          const owner = state.players.get(enemy.burnOwnerId);
          if (owner) owner.gold += enemyDef.reward;
        }
        toRemove.push(id);
        continue;
      }
      if (enemy.burnTimer === 0) {
        enemy.burnDps = 0;
        enemy.burnOwnerId = "";
      }
    }

    if (enemy.freezeTimer > 0) {
      enemy.freezeTimer = Math.max(0, enemy.freezeTimer - dt);
      if (enemy.freezeTimer === 0) enemy.speedMultiplier = 1.0;
    } else if (enemy.slowTimer > 0) {
      enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
      if (enemy.slowTimer === 0) enemy.speedMultiplier = 1.0;
    }
  }

  for (const id of toRemove) {
    state.enemies.delete(id);
  }
}

function findTarget(state: GameState, tower: Tower, range: number): Enemy | null {
  const towerX = towerLaneX(tower.slotIndex);
  let best: Enemy | null = null;
  let bestProgress = -1;

  for (const enemy of state.enemies.values()) {
    if (enemy.laneIndex !== tower.laneIndex) continue;
    const enemyX = enemy.progress * GAME_CONSTANTS.LANE_LENGTH;
    if (Math.abs(enemyX - towerX) > range) continue;
    if (enemy.progress > bestProgress) {
      best = enemy;
      bestProgress = enemy.progress;
    }
  }

  return best;
}

function getResistanceMultiplier(def: TowerDefinition, enemy: Enemy): number {
  const enemyDef = getEnemy(enemy.enemyType);
  return enemyDef?.elementResistance?.[def.element] ?? 1.0;
}
