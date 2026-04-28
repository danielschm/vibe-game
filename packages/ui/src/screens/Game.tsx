import { useEffect, useRef } from "react";
import type { Room } from "colyseus.js";
import { createGame } from "@vibe-game/client";
import type { GameState } from "@vibe-game/shared";
import { Hud } from "./Hud";

interface GameScreenProps {
  room: Room<GameState>;
  onLeave: () => void;
}

export function Game({ room, onLeave }: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const phaser = createGame(containerRef.current, { room });
    return () => {
      phaser.destroy(true);
    };
  }, [room]);

  return (
    <div className="screen game-screen">
      <div className="game-shell">
        <div ref={containerRef} className="game-canvas" />
        <Hud room={room} onLeave={onLeave} />
      </div>
    </div>
  );
}
