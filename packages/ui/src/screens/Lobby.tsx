import { useEffect, useState } from "react";
import type { Room } from "colyseus.js";
import { LOBBY, MessageType, type GameState, type Player } from "@vibe-game/shared";

interface LobbyProps {
  room: Room<GameState>;
  selfId: string;
  onLeave: () => void;
}

interface LobbyView {
  joinCode: string;
  players: Player[];
  selfReady: boolean;
  isHost: boolean;
  canStart: boolean;
}

function snapshot(state: GameState, selfId: string): LobbyView {
  const players = Array.from(state.players.values()) as Player[];
  const self = state.players.get(selfId);
  const allReady = players.length > 0 && players.every((p) => p.ready);
  return {
    joinCode: state.joinCode,
    players,
    selfReady: self?.ready ?? false,
    isHost: self?.isHost ?? false,
    canStart: !!self?.isHost && players.length >= LOBBY.MIN_PLAYERS && allReady,
  };
}

export function Lobby({ room, selfId, onLeave }: LobbyProps) {
  const [view, setView] = useState<LobbyView>(() => snapshot(room.state, selfId));

  useEffect(() => {
    const update = () => setView(snapshot(room.state, selfId));
    room.onStateChange(update);
    return () => {
      // colyseus.js entfernt Listener mit Room.removeAllListeners — wir lassen es beim Leave
    };
  }, [room, selfId]);

  function toggleReady() {
    room.send(MessageType.READY, { ready: !view.selfReady });
  }

  function startGame() {
    room.send(MessageType.START_GAME, {});
  }

  return (
    <div className="screen lobby">
      <div className="lobby-header">
        <h2>Lobby</h2>
        <div className="join-code" title="Teile diesen Code mit deinem Team">
          <span className="muted">Code:</span>
          <span className="code-value">{view.joinCode || "…"}</span>
        </div>
      </div>

      <div className="player-list">
        <h3>
          Spieler{" "}
          <span className="muted">
            ({view.players.length}/{LOBBY.MAX_PLAYERS})
          </span>
        </h3>
        <ul>
          {view.players.map((p) => (
            <li key={p.id} className={p.id === selfId ? "self" : ""}>
              <span className="player-name">
                {p.name} {p.isHost && <span className="badge">Host</span>}
                {p.id === selfId && <span className="badge badge-self">Du</span>}
              </span>
              <span className="player-lane muted">Lane {p.laneIndex + 1}</span>
              <span className={p.ready ? "ready" : "not-ready"}>
                {p.ready ? "✔ bereit" : "… nicht bereit"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="actions">
        <button onClick={toggleReady} className={view.selfReady ? "" : "primary"}>
          {view.selfReady ? "Doch nicht bereit" : "Bereit"}
        </button>
        {view.isHost && (
          <button
            onClick={startGame}
            className="primary"
            disabled={!view.canStart}
            title={!view.canStart ? "Alle müssen bereit sein" : "Spiel starten"}
          >
            Spiel starten
          </button>
        )}
        <button onClick={onLeave} className="ghost">
          Verlassen
        </button>
      </div>
    </div>
  );
}
