// Smoke-Test: Game-Loop läuft, Wellen-Countdown geht durch, phase wechselt zu "won".
// Aufruf: pnpm --filter @vibe-game/ui exec node scripts/smoke-game-loop.mjs
import { Client } from "colyseus.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const client = new Client("ws://localhost:2567");

console.log("→ Host creates lobby...");
const room = await client.create("game", { playerName: "TestHost" });
await wait(300);
console.log(`  code=${room.state.joinCode}`);

console.log("→ Mark ready and start...");
room.send("READY", { ready: true });
await wait(150);
room.send("START_GAME", {});
await wait(300);
console.log(`  phase=${room.state.phase} wave=${room.state.wave} nextWaveIn=${room.state.nextWaveIn.toFixed(1)}s`);

const expectedWaves = room.state.wavesTotal;
const breakSeconds = 5;
const totalWait = (expectedWaves + 1) * breakSeconds + 2;
console.log(`→ Watching for ${totalWait}s while ${expectedWaves} waves cycle (no spawns yet)...`);

const samples = [];
for (let s = 1; s <= totalWait; s++) {
  await wait(1000);
  samples.push({
    t: s,
    phase: room.state.phase,
    wave: room.state.wave,
    next: room.state.nextWaveIn.toFixed(1),
    base: room.state.baseHp,
  });
  if (room.state.phase !== "playing") break;
}

console.log("→ Timeline:");
for (const s of samples) {
  console.log(`    t+${s.t}s  phase=${s.phase} wave=${s.wave}/${room.state.wavesTotal} next=${s.next} base=${s.base}`);
}

const finalPhase = room.state.phase;
console.log(`\n→ final phase=${finalPhase} wave=${room.state.wave}`);

await room.leave();
process.exit(finalPhase === "won" ? 0 : 1);
