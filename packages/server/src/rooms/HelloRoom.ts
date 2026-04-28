import { Room, type Client } from "@colyseus/core";

export class HelloRoom extends Room {
  override onCreate(): void {
    console.log("[HelloRoom] created");
  }

  override onJoin(client: Client): void {
    console.log(`[HelloRoom] ${client.sessionId} joined`);
  }

  override onLeave(client: Client): void {
    console.log(`[HelloRoom] ${client.sessionId} left`);
  }
}
