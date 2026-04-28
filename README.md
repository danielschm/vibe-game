# vibe-game

Koop Tower Defense für 3 Spieler im Browser — gemeinsam gegen Gegnerwellen, jede:r verteidigt eine eigene Lane.

## Stand

✅ **Phase 1 — Basis-Game** ist spielbar.

- Lobby mit 4-stelligem Join-Code, bis zu 3 Spieler
- 3 Lanes, jeder Spieler bekommt eine eigene
- 1 Tower-Typ (**Bogenschütze**), 1 Gegner-Typ (**Grunt**), 3 Wellen
- Authoritative Server-Logik (Colyseus), 60Hz Tick, 20Hz State-Sync
- HUD mit Wave-Counter, Basis-HP, Spieler-Gold, Tower-Stats
- Sieg/Niederlage-Overlay mit Restart-Button

🚧 **Phase 2** — Feature-Erweiterungen folgen jetzt parallel auf 3 Laptops (siehe unten).

## Stack

- **TypeScript** end-to-end
- **Phaser 3** (Game-Client)
- **Colyseus 0.15** (Multiplayer-Server) + **colyseus.js** (Client)
- **React + Vite** (UI/HUD)
- **pnpm workspaces** (Monorepo)

## Voraussetzungen

- Node.js ≥ 20 (getestet mit Node 25)
- pnpm ≥ 9 (`npm install -g pnpm`)

## Schnellstart

```bash
git clone https://github.com/danielschm/vibe-game.git
cd vibe-game
pnpm install
pnpm dev:all     # startet Server + UI parallel
```

Danach:
- Server: `ws://localhost:2567`
- UI: `http://localhost:5173`

3 Browser-Tabs öffnen, einer hostet ("Neue Lobby erstellen"), die anderen joinen mit dem 4-stelligen Code → "Bereit" → Host startet → Spiel läuft.

## Repo-Struktur

```
packages/
├── shared/   Verträge: Schema, Messages, Konstanten,
│             Tower-/Enemy-/Level-Registries (Phase-2-Erweiterungen)
├── server/   Colyseus Game Server, authoritative Spiel-Logik
│             (GameRoom, GameManager, WaveSpawner, EnemyPath, TowerCombat)
├── client/   Phaser-Game als Modul (BootScene, GameScene)
└── ui/       React-App: MainMenu, Lobby, Hud, EndScreen
              + Smoke-Test-Skripte unter scripts/
```

## Phase-2-Aufteilung

Drei Personen entwickeln parallel auf eigenen Branches. Dank Registry-Pattern berührt niemand Code der anderen.

| Person | Achse | Wo? |
|---|---|---|
| **A** | Tower-System (Tower-Typen, Upgrades, Skills) | `packages/*/src/towers/`, plus optionale Tower-Verhalten in `server/src/systems/TowerCombat.ts` |
| **B** | Gegner-System (Gegner-Typen, Bosse, Wave-Mechaniken) | `packages/*/src/enemies/`, plus `server/src/systems/WaveSpawner.ts` für Sondermechaniken |
| **C** | Level-System (Maps, Schwierigkeit, Progression) | `packages/*/src/levels/`, plus `ui/src/screens/Lobby.tsx` für Map-Auswahl |

### Registry-Pattern

Neue Inhalte = ein neues File + 1 Zeile in der `index.ts`-Registry.

```ts
// packages/shared/src/towers/lightning.ts (NEU)
import type { TowerDefinition } from "./types";
export const lightning: TowerDefinition = {
  id: "lightning",
  name: "Blitzturm",
  description: "Blitz springt zwischen Gegnern.",
  cost: 150,
  damage: 20,
  range: 200,
  fireRate: 0.5,
  color: 0xfbbf24,
};
```

```ts
// packages/shared/src/towers/index.ts (1 Zeile ergänzen)
import { archer } from "./archer";
import { lightning } from "./lightning";  // ← hier

export const TOWERS = { archer, lightning } as const;  // ← hier
```

Tower erscheint automatisch im Picker, kann gekauft werden, schießt mit den definierten Stats. Kein Code in Server, Client oder UI muss angepasst werden.

Das gleiche Muster für `enemies/` und `levels/`.

## Entwickler-Skripte

```bash
pnpm dev:server    # nur Server starten (Port 2567, ts-node + nodemon)
pnpm dev:client    # nur Phaser-Client (Port 5174, Standalone-Test)
pnpm dev:ui        # nur UI-App (Port 5173)
pnpm dev:all       # alles parallel
pnpm build         # alles bauen (für Deployment)
pnpm typecheck     # alle Packages typchecken
pnpm format        # Prettier auf alle Dateien
```

## Smoke-Tests

Ein laufender Server vorausgesetzt (`pnpm dev:server`):

```bash
pnpm --filter @vibe-game/ui exec node scripts/smoke-lobby.mjs       # Lobby-Workflow
pnpm --filter @vibe-game/ui exec node scripts/smoke-game-loop.mjs   # Tick + Wellen-Countdown
pnpm --filter @vibe-game/ui exec node scripts/smoke-spawning.mjs    # Spawn + Pathing + Basis-Schaden
pnpm --filter @vibe-game/ui exec node scripts/smoke-tower.mjs       # Tower-Combat + Gold-Reward
pnpm --filter @vibe-game/ui exec node scripts/smoke-cross-lane.mjs  # Cross-Lane-Schutz
```

## Workflow

- **Branches**: `<name>/<scope>-<thema>`, z.B. `anna/towers-lightning`
- **Pull Requests** gegen `main`, mind. 1 Review
- **`shared/`-Änderungen** vorher kurz im Team-Chat ankündigen
- **Conventional Commits**: `feat(server): ...`, `feat(ui): ...`, `chore: ...`, `fix(scope): ...`
- **CI** (GitHub Actions) prüft typecheck + build bei jedem PR

## Architektur-Highlights

- **Server ist authoritative**: Client schickt Aktionen (BUY_TOWER), Server validiert und aktualisiert State. Alle Damage/Health/Gold-Berechnungen laufen serverseitig — kein Cheating durch manipulierte Clients.
- **Schema-basiertes State-Sync**: Colyseus serialisiert nur die Diff zwischen den Ticks, sehr bandbreiten-effizient.
- **Phaser ↔ React getrennt**: Phaser rendert nur das Spielfeld auf einem `<canvas>`. Alles andere (Menüs, HUD, Overlays) ist HTML/React. Saubere Trennung Person 2 (Game-Client) ↔ Person 3 (UI).
- **Registry-Pattern**: Neuer Content = ein File + ein Registry-Eintrag. Ermöglicht parallele Feature-Entwicklung ohne Merge-Konflikte.

## Plan

Detaillierter Plan unter `/Users/michelleschm/.claude/plans/unified-sauteeing-parasol.md`.
