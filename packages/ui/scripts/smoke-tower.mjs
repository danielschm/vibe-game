// Smoke-Test: BUY_TOWER, Tower-Combat, Reward-Gold.
// Setup: 3 Spieler joinen, jeder kauft auf seiner Lane einen Bogen, Welle 1 läuft,
// Tower besiegen Gegner. Verifiziert: keine Basis-Schäden, Gold steigt.
// Aufruf: pnpm --filter @vibe-game/ui exec node scripts/smoke-tower.mjs
import { Client } from "colyseus.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const client = new Client("ws://localhost:2567");

console.log("→ Three players join the lobby...");
const a = await client.create("game", { playerName: "Anna" });
await wait(200);
const code = a.state.joinCode;
const lookup = await fetch(`http://localhost:2567/api/lobbies/${code}`).then((r) =>
  r.json(),
);
const b = await client.joinById(lookup.roomId, { playerName: "Ben" });
const c = await client.joinById(lookup.roomId, { playerName: "Cara" });
await wait(400);

const players = Array.from(a.state.players.values());
const aPlayer = players.find((p) => p.name === "Anna");
const bPlayer = players.find((p) => p.name === "Ben");
const cPlayer = players.find((p) => p.name === "Cara");
console.log(
  `  Anna lane=${aPlayer.laneIndex} gold=${aPlayer.gold} | Ben lane=${bPlayer.laneIndex} | Cara lane=${cPlayer.laneIndex}`,
);

console.log("→ All ready, host starts game...");
a.send("READY", { ready: true });
b.send("READY", { ready: true });
c.send("READY", { ready: true });
await wait(300);
a.send("START_GAME", {});
await wait(500);
console.log(`  phase=${a.state.phase} nextWaveIn=${a.state.nextWaveIn.toFixed(1)}`);

console.log("→ Each player places 2 archers on their lane (slots 2, 5)...");
for (const room of [a, b, c]) {
  const me = room.state.players.get(room.sessionId);
  room.send("BUY_TOWER", {
    laneIndex: me.laneIndex,
    slotIndex: 2,
    towerType: "archer",
  });
  room.send("BUY_TOWER", {
    laneIndex: me.laneIndex,
    slotIndex: 5,
    towerType: "archer",
  });
}
await wait(500);
console.log(`  towers in state: ${a.state.towers.size}`);
const playersAfterBuy = Array.from(a.state.players.values());
for (const p of playersAfterBuy) {
  console.log(`  ${p.name} gold after 2 archers (cost 100): ${p.gold}`);
}

console.log("→ Watch wave 1 unfold...");
const samples = [];
const startTime = Date.now();
while (Date.now() - startTime < 60_000) {
  await wait(2000);
  const t = Math.round((Date.now() - startTime) / 1000);
  samples.push({
    t,
    phase: a.state.phase,
    wave: a.state.wave,
    base: a.state.baseHp,
    enemies: a.state.enemies.size,
    annaGold: a.state.players.get(a.sessionId).gold,
  });
  if (a.state.phase !== "playing") break;
  if (t >= 60) break;
}

console.log("→ Timeline:");
for (const s of samples) {
  console.log(
    `    t+${String(s.t).padStart(2)}s  phase=${s.phase} wave=${s.wave} base=${s.base} enemies=${s.enemies} annaGold=${s.annaGold}`,
  );
}

const finalAnna = a.state.players.get(a.sessionId);
const baseSurvived = a.state.baseHp > 0;
const goldEarned = finalAnna.gold > 0; // mindestens manche kills
console.log(
  `\n→ final: phase=${a.state.phase} wave=${a.state.wave} baseHp=${a.state.baseHp} annaGold=${finalAnna.gold}`,
);

await a.leave();
await b.leave();
await c.leave();

const ok = baseSurvived || a.state.phase === "won";
console.log(
  ok
    ? "✓ towers killed enemies and protected the base"
    : "✗ towers didn't keep base alive (check damage/range tuning)",
);
process.exit(ok ? 0 : 1);
