import { useEffect, useRef } from "react";
import type { Room } from "colyseus.js";
import { createGame } from "@vibe-game/client";
import type { GameState } from "@vibe-game/shared";

interface GameScreenProps {
  room: Room<GameState>;
  onLeave: () => void;
}

export function Game({ room, onLeave }: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const phaser = createGame(containerRef.current);
    return () => {
      phaser.destroy(true);
    };
  }, []);

  return (
    <div className="screen game-screen">
      <div className="game-shell">
        <div ref={containerRef} className="game-canvas" />
        <aside className="hud-placeholder">
          <p className="muted">HUD kommt in Schritt 9.</p>
          <p className="muted">Server-State synchronisiert: {room.state.players.size} Spieler</p>
          <button onClick={onLeave} className="ghost">
            Lobby verlassen
          </button>
        </aside>
      </div>
    </div>
  );
}
