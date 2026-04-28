import type { TowerElement } from "../elements";

export type TowerEffect =
  | { type: "slow"; factor: number; duration: number }
  | { type: "splash"; radius: number }
  | { type: "chain"; maxTargets: number; damageFalloff: number }
  | { type: "burn"; dpsPercent: number; duration: number }
  | { type: "freeze"; duration: number };

export type ProjectileStyle = "arrow" | "cannonball" | "bolt" | "orb" | "beam";

export interface ShootAnimation {
  style: ProjectileStyle;
  /** Hex-Tint; fällt auf tower.color zurück wenn nicht gesetzt. */
  color?: number;
  /** Pixel pro Sekunde für die Projektilbewegung im Client. */
  speed?: number;
}

export interface TowerUpgradeLevel {
  cost: number;
  /** Anzeigename des Upgrades im UI. */
  label: string;
  /** Anzahl getöteter Gegner (global), bevor dieses Upgrade freigeschaltet ist. */
  unlockAfterKills?: number;
  damage?: number;
  range?: number;
  fireRate?: number;
  /** Ersetzt den Effekt des vorherigen Levels vollständig. */
  effect?: TowerEffect;
}

export interface TowerDefinition {
  id: string;
  name: string;
  description: string;
  category?: "tower" | "support" | "trap";
  element: TowerElement;
  /** Goldkosten zum Bauen. */
  cost: number;
  /** Anzahl getöteter Gegner (global), bevor dieser Tower kaufbar ist. 0 = sofort verfügbar. */
  unlockAfterKills?: number;
  damage: number;
  range: number;
  fireRate: number;
  color: number;
  sprite?: string;
  targetMode?: "first" | "last" | "strongest" | "weakest";
  effect?: TowerEffect;
  /** Schieß-Animation für den Phaser-Client (nur schießende Tower). */
  shootAnim?: ShootAnimation;
  /** Genau 3 Upgrade-Stufen (Level 2, 3, 4). */
  upgrades?: [TowerUpgradeLevel, TowerUpgradeLevel, TowerUpgradeLevel];
}
