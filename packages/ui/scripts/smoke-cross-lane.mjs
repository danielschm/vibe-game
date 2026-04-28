// Smoke-Test: Server erlaubt Spielern nur den Bau auf der eigenen Lane.
// Aufruf: pnpm --filter @vibe-game/ui exec node scripts/smoke-cross-lane.mjs
import { Client } from "colyseus.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const client = new Client("ws://localhost:2567");

const a = await client.create("game", { playerName: "Anna" });
await wait(200);
const lookup = await fetch(`http://localhost:2567/api/lobbies/${a.state.joinCode}`).then(
  (r) => r.json(),
);
const b = await client.joinById(lookup.roomId, { playerName: "Ben" });
const c = await client.joinById(lookup.roomId, { playerName: "Cara" });
await wait(300);

a.send("READY", { ready: true });
b.send("READY", { ready: true });
c.send("READY", { ready: true });
await wait(200);
a.send("START_GAME", {});
await wait(400);

const aPlayer = a.state.players.get(a.sessionId);
const bPlayer = a.state.players.get(b.sessionId);

console.log(`Anna lane=${aPlayer.laneIndex}, Ben lane=${bPlayer.laneIndex}`);

console.log(`→ Ben tries to build on Anna's lane (${aPlayer.laneIndex}, slot 1)...`);
b.send("BUY_TOWER", {
  laneIndex: aPlayer.laneIndex,
  slotIndex: 1,
  towerType: "archer",
});
await wait(300);
const towersAfterIllegal = a.state.towers.size;
console.log(`  towers in state: ${towersAfterIllegal} (expected: 0)`);

console.log(`→ Ben builds on his own lane (${bPlayer.laneIndex}, slot 1)...`);
b.send("BUY_TOWER", {
  laneIndex: bPlayer.laneIndex,
  slotIndex: 1,
  towerType: "archer",
});
await wait(300);
const towersAfterLegal = a.state.towers.size;
console.log(`  towers in state: ${towersAfterLegal} (expected: 1)`);

const tower = Array.from(a.state.towers.values())[0];
const ownerCorrect = tower?.ownerId === b.sessionId && tower?.laneIndex === bPlayer.laneIndex;
console.log(
  `  tower owner=${tower?.ownerId === b.sessionId ? "Ben ✓" : "WRONG"} lane=${tower?.laneIndex}`,
);

await a.leave();
await b.leave();
await c.leave();

const ok = towersAfterIllegal === 0 && towersAfterLegal === 1 && ownerCorrect;
console.log(ok ? "✓ cross-lane build prevented, own-lane build accepted" : "✗ validation failed");
process.exit(ok ? 0 : 1);
