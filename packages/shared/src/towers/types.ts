/**
 * Definition eines Tower-Typs.
 * Person A erweitert das Spiel, indem sie pro neuem Tower
 * eine Datei in diesem Verzeichnis anlegt und im index.ts registriert.
 */
export interface TowerDefinition {
  /** Eindeutige ID, gleich wie der Dateiname. */
  id: string;
  /** Anzeigename im UI. */
  name: string;
  /** Kurze Beschreibung für Tower-Picker / Tooltip. */
  description: string;
  /** Goldkosten zum Bauen. */
  cost: number;
  /** Schaden pro Schuss. */
  damage: number;
  /** Reichweite in In-Game-Pixeln. */
  range: number;
  /** Schüsse pro Sekunde. */
  fireRate: number;
  /** Hex-Farbe für simple Sprite-Darstellung (bis Assets vorhanden). */
  color: number;
  /** Optionaler Asset-Schlüssel, den der Phaser-Client lädt. */
  sprite?: string;
}
