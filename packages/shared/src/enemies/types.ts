import type { TowerElement } from "../elements";

/**
 * Definition eines Gegner-Typs.
 * Person B erweitert das Spiel über das gleiche Muster wie bei Towern.
 */
export interface EnemyDefinition {
  /** Eindeutige ID, gleich wie der Dateiname. */
  id: string;
  /** Anzeigename. */
  name: string;
  /** Maximale Lebenspunkte. */
  hp: number;
  /** Geschwindigkeit in Pixeln pro Sekunde entlang der Lane. */
  speed: number;
  /** Gold-Belohnung beim Töten. */
  reward: number;
  /** Schaden an der Basis, wenn der Gegner sie erreicht. */
  damage: number;
  /** Hex-Farbe für simple Sprite-Darstellung. */
  color: number;
  /** Optionaler Asset-Schlüssel. */
  sprite?: string;
  /**
   * Element-Resistenzen: Wert < 1 = schwächer gegen dieses Element, > 1 = resistenter.
   * Fehlt ein Element, wird 1.0 (kein Modifikator) angenommen.
   * Person B befüllt diese Werte pro Gegner-Typ.
   */
  elementResistance?: Partial<Record<TowerElement, number>>;
}
