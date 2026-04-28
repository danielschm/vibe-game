// Smoke-Test: Wave-Spawner spawnt Gegner, sie laufen die Lane entlang,
// erreichen die Basis und ziehen HP ab. Nach 3 Wellen ohne Tower → phase=lost.
// Aufruf: pnpm --filter @vibe-game/ui exec node scripts/smoke-spawning.mjs
import { Client } from "colyseus.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const client = new Client("ws://localhost:2567");

console.log("→ Host creates lobby and starts game...");
const room = await client.create("game", { playerName: "TestHost" });
await wait(300);
room.send("READY", { ready: true });
await wait(150);
room.send("START_GAME", {});
await wait(300);

const samples = [];
let prevEnemyCount = 0;
let totalSeen = 0;
const seenIds = new Set();

const startTime = Date.now();
const maxSeconds = 90;

while (Date.now() - startTime < maxSeconds * 1000) {
  await wait(1000);
  const t = Math.round((Date.now() - startTime) / 1000);
  const enemies = Array.from(room.state.enemies.values());

  for (const e of enemies) {
    if (!seenIds.has(e.id)) {
      seenIds.add(e.id);
      totalSeen += 1;
    }
  }

  samples.push({
    t,
    phase: room.state.phase,
    wave: room.state.wave,
    next: room.state.nextWaveIn.toFixed(1),
    base: room.state.baseHp,
    living: enemies.length,
    seen: totalSeen,
    sample: enemies
      .slice(0, 3)
      .map((e) => `${e.enemyType}@L${e.laneIndex}:${e.progress.toFixed(2)}`)
      .join(","),
  });

  if (room.state.phase === "won" || room.state.phase === "lost") break;
  prevEnemyCount = enemies.length;
}

console.log("→ Timeline (1Hz sampling):");
for (const s of samples) {
  console.log(
    `    t+${String(s.t).padStart(2)}s phase=${s.phase} wave=${s.wave}/${room.state.wavesTotal} ` +
      `next=${s.next} base=${String(s.base).padStart(3)} living=${s.living} seen=${s.seen} [${s.sample}]`,
  );
}

console.log(
  `\n→ final: phase=${room.state.phase} wave=${room.state.wave} totalEnemiesSpawned=${totalSeen} baseHp=${room.state.baseHp}`,
);

await room.leave();

const ok =
  totalSeen >= 5 &&
  (room.state.phase === "lost" || room.state.phase === "won") &&
  room.state.baseHp < 100;
console.log(ok ? "✓ spawning + path + base damage works" : "✗ verification failed");
process.exit(ok ? 0 : 1);
