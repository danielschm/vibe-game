import Phaser from "phaser";
import type { Room } from "colyseus.js";
import type { GameState } from "@vibe-game/shared";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

export interface GameOptions {
  width?: number;
  height?: number;
  /** Wenn übergeben, startet das Spiel direkt in der GameScene. */
  room?: Room<GameState>;
}

export const GAME_VIEWPORT = {
  width: 960,
  height: 540,
} as const;

export function createGame(parent: HTMLElement, options: GameOptions = {}): Phaser.Game {
  const { width = GAME_VIEWPORT.width, height = GAME_VIEWPORT.height, room } = options;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#1a1a2e",
    scene: [BootScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  if (room) {
    game.registry.set("room", room);
    // Wir können noch nicht direkt zur GameScene springen — Phaser erwartet einen Tick.
    game.events.once(Phaser.Core.Events.READY, () => {
      game.scene.start("Game");
      game.scene.stop("Boot");
    });
  }

  return game;
}
