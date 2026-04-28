import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "Boot" });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 40, "🏰 vibe-game", {
        fontSize: "56px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 30, "Phaser läuft — Hello-World", {
        fontSize: "24px",
        color: "#9bbcff",
      })
      .setOrigin(0.5);
  }
}
