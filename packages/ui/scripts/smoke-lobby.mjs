// Smoke-Test: Lobby-Workflow End-to-End.
// Aufruf: pnpm --filter @vibe-game/ui exec node scripts/smoke-lobby.mjs
import { Client } from "colyseus.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const client = new Client("ws://localhost:2567");

console.log("→ Host creates lobby...");
const hostRoom = await client.create("game", { playerName: "Anna" });
await wait(300);
const code = hostRoom.state.joinCode;
console.log(`  Created roomId=${hostRoom.id} code=${code}`);

console.log("→ Lookup via HTTP /api/lobbies/" + code);
const lookupRes = await fetch(`http://localhost:2567/api/lobbies/${code}`);
const lookup = await lookupRes.json();
console.log(`  Lookup result:`, lookup);

console.log("→ Guest 2 joins via roomId...");
const guestRoom = await client.joinById(lookup.roomId, { playerName: "Ben" });
await wait(400);

console.log("→ Guest 3 joins...");
const thirdRoom = await client.joinById(lookup.roomId, { playerName: "Cara" });
await wait(400);

const players = Array.from(hostRoom.state.players.values()).map(
  (p) => `${p.name} host=${p.isHost} lane=${p.laneIndex} gold=${p.gold} ready=${p.ready}`,
);
console.log("→ State has " + hostRoom.state.players.size + " players:");
players.forEach((p) => console.log("    - " + p));

console.log("→ Anna (host) marks ready...");
hostRoom.send("READY", { ready: true });
await wait(200);
console.log("→ Ben marks ready...");
guestRoom.send("READY", { ready: true });
await wait(200);
console.log("→ Cara marks ready...");
thirdRoom.send("READY", { ready: true });
await wait(200);

console.log("→ Try start game (host)...");
hostRoom.send("START_GAME", {});
await wait(300);
console.log(`  phase=${hostRoom.state.phase} (expected: playing)`);

await hostRoom.leave();
await guestRoom.leave();
await thirdRoom.leave();
console.log("✓ done");
process.exit(0);
