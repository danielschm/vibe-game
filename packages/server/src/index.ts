import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { createServer } from "node:http";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT) || 2567;

const app = express();
app.use(express.json());

// CORS: Browser-Clients von anderen Origins (z.B. localhost:5173) dürfen
// die HTTP-Endpoints für Lobby-Lookup nutzen. WebSockets (Colyseus) sind
// davon nicht betroffen.
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/", (_req, res) => {
  res.json({ name: "vibe-game server", status: "ok" });
});

/** Lookup einer Lobby anhand des Join-Codes. Antwortet mit roomId für joinById. */
app.get("/api/lobbies/:code", async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const rooms = await matchMaker.query({ name: "game" });
  const match = rooms.find((r) => r.metadata?.joinCode === code);
  if (!match) {
    res.status(404).json({ error: "lobby_not_found", code });
    return;
  }
  res.json({ roomId: match.roomId, joinCode: code });
});

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("game", GameRoom);

gameServer.listen(port).then(() => {
  console.log(`🎮 vibe-game server listening on http://localhost:${port}`);
});
