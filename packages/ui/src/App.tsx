import { useEffect, useRef } from "react";
import { createGame } from "@vibe-game/client";

export function App() {
  const gameContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!gameContainerRef.current) return;
    const game = createGame(gameContainerRef.current);
    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏰 vibe-game</h1>
        <p className="tagline">Koop Tower Defense für 3 Spieler</p>
      </header>
      <main className="game-shell">
        <div ref={gameContainerRef} className="game-canvas" />
        <aside className="hud-placeholder">
          <p>HUD kommt in Schritt 9</p>
        </aside>
      </main>
    </div>
  );
}
