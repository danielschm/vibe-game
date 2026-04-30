import { useEffect, useRef, useState, useCallback } from "react";
import type { Room } from "colyseus.js";
import { createGame } from "@vibe-game/client";
import type { GameState } from "@vibe-game/shared";
import { Hud } from "./Hud";
import { EndScreen } from "./EndScreen";

interface GameScreenProps {
  room: Room<GameState>;
  onLeave: () => void;
}

export function Game({ room, onLeave }: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const phaserRef = useRef<ReturnType<typeof createGame> | null>(null);
  const [selectedTowerType, setSelectedTowerType] = useState<string | null>(null);

  const handleSelectTower = useCallback((typeId: string | null) => {
    setSelectedTowerType(typeId);
    phaserRef.current?.registry.set("selectedTowerType", typeId);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const phaser = createGame(containerRef.current, { room });
    phaserRef.current = phaser;

    // Callback damit GameScene die React-Auswahl nach dem Setzen leeren kann
    phaser.registry.set("onTowerPlaced", () => setSelectedTowerType(null));

    return () => {
      phaser.destroy(true);
      phaserRef.current = null;
    };
  }, [room]);

  // Registry synchron halten wenn sich selectedTowerType ändert
  useEffect(() => {
    phaserRef.current?.registry.set("selectedTowerType", selectedTowerType);
  }, [selectedTowerType]);

  return (
    <div className="screen game-screen">
      <div className="game-shell">
        <div ref={containerRef} className="game-canvas" />
        <Hud
          room={room}
          onLeave={onLeave}
          selectedTowerType={selectedTowerType}
          onSelectTower={handleSelectTower}
        />
      </div>
      <EndScreen room={room} />
    </div>
  );
}
