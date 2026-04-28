# vibe-game

Koop Tower Defense für 3 Spieler — gemeinsam gegen Gegnerwellen, jede:r verteidigt eine eigene Lane.

## Stack

- **TypeScript** end-to-end
- **Phaser 3** (Game-Client)
- **Colyseus** (authoritative Multiplayer-Server)
- **React + Vite** (UI-Overlay, Lobby, HUD)
- **pnpm workspaces** (Monorepo)

## Voraussetzungen

- Node.js ≥ 20 (geprüft mit Node 25)
- pnpm ≥ 9 (`npm install -g pnpm`)

## Schnellstart

```bash
git clone https://github.com/danielschm/vibe-game.git
cd vibe-game
pnpm install
pnpm dev:all     # startet Server + Client + UI parallel
```

Danach:
- Server läuft auf `ws://localhost:2567`
- UI läuft auf `http://localhost:5173`

## Repo-Struktur

```
packages/
├── shared/   # Verträge: Schema, Messages, Konstanten, Tower-/Enemy-/Level-Registries
├── server/   # Colyseus Game Server, authoritative Spiel-Logik
├── client/   # Phaser-Game als Modul (wird vom UI eingebunden)
└── ui/       # React-App: Main-Menu, Lobby, HUD — mountet das Phaser-Game
```

## Wer macht was — Phase 2 Feature-Achsen

Sobald das Basis-Game steht, entwickeln drei Personen parallel auf eigenen Branches:

| Person | Achse | Wo? |
|---|---|---|
| **A** | Tower-System (Tower-Typen, Upgrades, Skills) | `*/towers/`-Ordner in shared, server, client |
| **B** | Gegner-System (Gegner-Typen, Bosse, Wave-Mechaniken) | `*/enemies/`-Ordner + `server/systems/WaveSpawner` |
| **C** | Level-System (Maps, Schwierigkeit, Progression, Lobby-Polish) | `*/levels/`-Ordner + `ui/src/LevelSelect.tsx`, `ui/src/Lobby.tsx` |

### Registry-Pattern

Neuer Tower/Gegner/Level = neue Datei + 1 Zeile in der `index.ts`-Registry. Der Rest des Codes liest dynamisch aus der Registry — kein Cross-Cutting nötig.

Beispiel:

```ts
// packages/shared/src/towers/lightning.ts
export const lightning = { id: "lightning", cost: 150, damage: 20, ... } as const;

// packages/shared/src/towers/index.ts
import { archer } from "./archer";
import { lightning } from "./lightning";   // ← einzige Stelle, die du anpasst
export const TOWERS = { archer, lightning } as const;
```

Tower erscheint automatisch im Picker und im Spiel.

## Workflow

- **Branches**: `<name>/<scope>-<thema>`, z.B. `anna/towers-lightning`
- **Pull Requests** gegen `main`, mind. 1 Review
- **`shared`-Änderungen** vorher kurz im Team-Chat ankündigen
- **Conventional Commits**: `feat(server): ...`, `feat(ui): ...`, `chore: ...`, `fix(scope): ...`

## Skripte

```bash
pnpm dev:server      # nur Server starten
pnpm dev:client      # nur Phaser-Client starten (isoliert)
pnpm dev:ui          # nur UI-App starten
pnpm dev:all         # alles parallel — für Multiplayer-Tests
pnpm build           # alles bauen
pnpm typecheck       # alle Packages typchecken
pnpm format          # Prettier auf alle Dateien
```

## Status

🚧 **Phase 1 — Basis-Game in Entwicklung**

Siehe Plan unter `/Users/michelleschm/.claude/plans/unified-sauteeing-parasol.md`.
