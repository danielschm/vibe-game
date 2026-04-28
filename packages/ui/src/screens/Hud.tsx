import type { Room } from "colyseus.js";
import {
  MessageType,
  listTowers,
  type GameState,
  type Player,
  type TowerDefinition,
} from "@vibe-game/shared";
import { useRoomStateTick } from "../hooks/useRoomState";

interface HudProps {
  room: Room<GameState>;
  onLeave: () => void;
}

export function Hud({ room, onLeave }: HudProps) {
  useRoomStateTick(room);

  const state = room.state;
  const me = state.players.get(room.sessionId);
  const players = Array.from(state.players.values()) as Player[];
  const baseRatio = state.baseHpMax > 0 ? state.baseHp / state.baseHpMax : 0;
  const towers = listTowers();

  const isPaused = state.nextWaveIn > 0;
  const isWon = state.phase === "won";
  const isLost = state.phase === "lost";
  const isPlaying = state.phase === "playing";

  return (
    <aside className="hud">
      <section className="hud-section">
        <div className="hud-row">
          <span className="hud-label">Welle</span>
          <span className="hud-value">
            {state.wave} / {state.wavesTotal}
          </span>
        </div>
        {isPaused && isPlaying && state.wave < state.wavesTotal && (
          <div className="hud-row hud-pause">Nächste Welle in {state.nextWaveIn.toFixed(1)}s</div>
        )}
      </section>

      <section className="hud-section">
        <div className="hud-row">
          <span className="hud-label">Basis</span>
          <span className="hud-value">
            {state.baseHp} / {state.baseHpMax}
          </span>
        </div>
        <div className="hp-bar">
          <div className="hp-fill" style={{ width: `${baseRatio * 100}%` }} />
        </div>
      </section>

      <section className="hud-section">
        <h3 className="hud-heading">Spieler</h3>
        <ul className="player-mini-list">
          {players.map((p) => (
            <li key={p.id} className={p.id === room.sessionId ? "self" : ""}>
              <span className="pml-name">
                {p.name}
                {p.isHost && <span className="badge small">H</span>}
                {!p.connected && <span className="badge small badge-warn">off</span>}
              </span>
              <span className="muted">L{p.laneIndex + 1}</span>
              <span className="gold">🪙 {p.gold}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="hud-section">
        <h3 className="hud-heading">Türme</h3>
        <ul className="tower-list">
          {towers.map((tower) => (
            <TowerEntry key={tower.id} tower={tower} room={room} player={me ?? undefined} />
          ))}
        </ul>
        <p className="muted small">
          Klicke einen freien Slot auf <strong>deiner Lane</strong>, um zu bauen.
        </p>
      </section>

      {(isWon || isLost) && me?.isHost && (
        <button
          className="primary"
          onClick={() => room.send(MessageType.RESTART, {})}
        >
          Zurück zur Lobby
        </button>
      )}
      <button className="ghost" onClick={onLeave}>
        Spiel verlassen
      </button>
    </aside>
  );
}

function TowerEntry({
  tower,
  player,
}: {
  tower: TowerDefinition;
  room: Room<GameState>;
  player: Player | undefined;
}) {
  const affordable = (player?.gold ?? 0) >= tower.cost;
  return (
    <li className={`tower-entry ${affordable ? "" : "broke"}`}>
      <div
        className="tower-swatch"
        style={{ background: `#${tower.color.toString(16).padStart(6, "0")}` }}
      />
      <div className="tower-meta">
        <div className="tower-name">{tower.name}</div>
        <div className="tower-stats muted">
          🪙{tower.cost} · ⚔{tower.damage} · 🎯{tower.range} · {tower.fireRate}/s
        </div>
      </div>
    </li>
  );
}
