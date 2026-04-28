import { useEffect, useState } from "react";
import type { Room } from "colyseus.js";
import type { GameState } from "@vibe-game/shared";
import { createLobby, joinLobby } from "./network/colyseus";
import { MainMenu } from "./screens/MainMenu";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";

type View = "menu" | "lobby" | "game";

export function App() {
  const [view, setView] = useState<View>("menu");
  const [room, setRoom] = useState<Room<GameState> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // Phase-Wechsel im State (lobby → playing) verfolgen
  useEffect(() => {
    if (!room) return;
    const handler = () => {
      if (room.state.phase === "playing" && view === "lobby") {
        setView("game");
      } else if (room.state.phase === "lobby" && view === "game") {
        setView("lobby");
      }
    };
    room.onStateChange(handler);
    return () => {
      // listeners werden beim leave aufgeräumt
    };
  }, [room, view]);

  async function handleCreate(playerName: string) {
    setErrorMessage(undefined);
    try {
      const newRoom = await createLobby(playerName);
      attachRoomLifecycle(newRoom);
      setRoom(newRoom);
      setView("lobby");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  }

  async function handleJoin(playerName: string, joinCode: string) {
    setErrorMessage(undefined);
    try {
      const newRoom = await joinLobby(joinCode, playerName);
      attachRoomLifecycle(newRoom);
      setRoom(newRoom);
      setView("lobby");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  }

  function attachRoomLifecycle(r: Room<GameState>) {
    r.onLeave(() => {
      setRoom(null);
      setView("menu");
    });
    r.onError((code, message) => {
      console.error("[room.onError]", code, message);
      setErrorMessage(message ?? `Fehler ${code}`);
    });
  }

  function handleLeave() {
    if (room) {
      room.leave();
    } else {
      setView("menu");
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏰 vibe-game</h1>
        <p className="tagline">Koop Tower Defense für 3 Spieler</p>
      </header>
      <main className="app-main">
        {view === "menu" && (
          <MainMenu onCreate={handleCreate} onJoin={handleJoin} errorMessage={errorMessage} />
        )}
        {view === "lobby" && room && (
          <Lobby room={room} selfId={room.sessionId} onLeave={handleLeave} />
        )}
        {view === "game" && room && <Game room={room} onLeave={handleLeave} />}
      </main>
    </div>
  );
}
