// End-to-End Smoke-Test — bis zum Sieg.
// 3 Spieler joinen, Lobby → Game → 3 Wellen → Sieg (genug Tower).
// Aufruf: pnpm --filter @vibe-game/ui exec node scripts/smoke-end-to-end.mjs
import { Client } from "colyseus.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const client = new Client("ws://localhost:2567");

console.log("→ 3 players join...");
const a = await client.create("game", { playerName: "Anna" });
await wait(200);
const lookup = await fetch(`http://localhost:2567/api/lobbies/${a.state.joinCode}`).then(
  (r) => r.json(),
);
const b = await client.joinById(lookup.roomId, { playerName: "Ben" });
const c = await client.joinById(lookup.roomId, { playerName: "Cara" });
await wait(300);
console.log(`  joinCode=${a.state.joinCode}`);

console.log("→ All ready, host starts...");
a.send("READY", { ready: true });
b.send("READY", { ready: true });
c.send("READY", { ready: true });
await wait(200);
a.send("START_GAME", {});
await wait(500);

console.log("→ Each player buys archers on slots 1, 4, 6 of their lane...");
for (const room of [a, b, c]) {
  const me = room.state.players.get(room.sessionId);
  for (const slot of [1, 4, 6]) {
    room.send("BUY_TOWER", {
      laneIndex: me.laneIndex,
      slotIndex: slot,
      towerType: "archer",
    });
  }
}
await wait(500);
console.log(`  towers in state: ${a.state.towers.size} (expected: 9)`);

console.log("→ Watching the game until phase changes (max 90s)...");
const startTime = Date.now();
let lastWave = 0;
while (Date.now() - startTime < 90_000) {
  await wait(1500);
  const t = ((Date.now() - startTime) / 1000).toFixed(1);
  if (a.state.wave !== lastWave) {
    console.log(
      `  t+${t}s  wave=${a.state.wave}/${a.state.wavesTotal} ` +
        `base=${a.state.baseHp} enemies=${a.state.enemies.size}`,
    );
    lastWave = a.state.wave;
  }
  if (a.state.phase !== "playing") break;
}

const finalPhase = a.state.phase;
const finalBase = a.state.baseHp;
const finalWave = a.state.wave;
console.log(
  `\n→ final: phase=${finalPhase} wave=${finalWave}/${a.state.wavesTotal} baseHp=${finalBase}`,
);

if (finalPhase === "won" && (a.state.players.get(a.sessionId)?.isHost ?? false)) {
  console.log("→ Host sends RESTART...");
  a.send("RESTART", {});
  await wait(500);
  console.log(`  phase after restart=${a.state.phase}`);
}

await a.leave();
await b.leave();
await c.leave();

const ok = finalPhase === "won";
console.log(ok ? "✓ end-to-end victory works" : `✗ expected won, got ${finalPhase}`);
process.exit(ok ? 0 : 1);
