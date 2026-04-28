import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";

export interface GameOptions {
  width?: number;
  height?: number;
}

export function createGame(parent: HTMLElement, options: GameOptions = {}): Phaser.Game {
  const { width = 960, height = 540 } = options;

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#1a1a2e",
    scene: [BootScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
}
