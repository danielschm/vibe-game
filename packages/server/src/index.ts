import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { createServer } from "node:http";
import { HelloRoom } from "./rooms/HelloRoom.js";

const port = Number(process.env.PORT) || 2567;

const app = express();
app.get("/", (_req, res) => {
  res.json({ name: "vibe-game server", status: "ok" });
});

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("hello", HelloRoom);

gameServer.listen(port).then(() => {
  console.log(`🎮 vibe-game server listening on http://localhost:${port}`);
});
