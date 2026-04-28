import type { Room } from "colyseus.js";
import { MessageType, type GameState, type Player } from "@vibe-game/shared";
import { useRoomStateTick } from "../hooks/useRoomState";

interface EndScreenProps {
  room: Room<GameState>;
}

export function EndScreen({ room }: EndScreenProps) {
  useRoomStateTick(room);
  const state = room.state;
  if (state.phase !== "won" && state.phase !== "lost") return null;

  const me = state.players.get(room.sessionId);
  const isWon = state.phase === "won";
  const players = Array.from(state.players.values()) as Player[];

  return (
    <div className={`end-overlay ${isWon ? "end-won" : "end-lost"}`}>
      <div className="end-card">
        <h2>{isWon ? "🏆 Sieg!" : "💀 Niederlage"}</h2>
        <p className="end-subtitle">
          {isWon
            ? `Alle ${state.wavesTotal} Wellen abgewehrt — Basis bei ${state.baseHp} HP gehalten.`
            : `Eure Basis ist gefallen in Welle ${state.wave}.`}
        </p>

        <ul className="end-stats">
          {players.map((p) => (
            <li key={p.id}>
              <span className="pml-name">
                {p.name} {p.isHost && <span className="badge small">H</span>}
              </span>
              <span className="muted">Lane {p.laneIndex + 1}</span>
              <span className="gold">🪙 {p.gold}</span>
            </li>
          ))}
        </ul>

        {me?.isHost ? (
          <button
            className="primary large"
            onClick={() => room.send(MessageType.RESTART, {})}
          >
            Zurück zur Lobby
          </button>
        ) : (
          <p className="muted">Warte, bis der Host eine neue Runde startet …</p>
        )}
      </div>
    </div>
  );
}
