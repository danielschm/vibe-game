import { useEffect, useState } from "react";
import type { Room } from "colyseus.js";
import type { GameState } from "@vibe-game/shared";

/**
 * Re-rendert die Komponente, sobald sich der Server-State ändert.
 * Gibt einen monoton steigenden Tick-Zähler zurück, sodass Konsumenten
 * direkt aus `room.state` lesen können (das ist eine lebende Referenz).
 */
export function useRoomStateTick(room: Room<GameState>): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    room.onStateChange(handler);
  }, [room]);
  return tick;
}
