// @vibe-game/client — Phaser-Game-Modul
// Wird vom UI-Package genutzt: ui mountet das Game in ein DOM-Element.
export { createGame, GAME_VIEWPORT, type GameOptions } from "./game";
export { BootScene } from "./scenes/BootScene";
export { GameScene } from "./scenes/GameScene";
export const CLIENT_VERSION = "0.1.0";
