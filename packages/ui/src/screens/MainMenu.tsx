import { useState } from "react";
import { LOBBY } from "@vibe-game/shared";

interface MainMenuProps {
  onCreate: (playerName: string) => Promise<void> | void;
  onJoin: (playerName: string, joinCode: string) => Promise<void> | void;
  errorMessage?: string;
}

export function MainMenu({ onCreate, onJoin, errorMessage }: MainMenuProps) {
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  const isNameValid = playerName.trim().length >= 2;
  const isCodeValid = joinCode.trim().length === LOBBY.CODE_LENGTH;

  async function handleCreate() {
    if (!isNameValid || busy) return;
    setBusy(true);
    try {
      await onCreate(playerName.trim());
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!isNameValid || !isCodeValid || busy) return;
    setBusy(true);
    try {
      await onJoin(playerName.trim(), joinCode.trim().toUpperCase());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen menu">
      <h2>🏰 vibe-game</h2>
      <p className="muted">Koop Tower Defense für 3 Spieler</p>

      <label className="field">
        <span>Dein Name</span>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="z.B. Anna"
          maxLength={20}
        />
      </label>

      <div className="actions">
        <button
          className="primary"
          onClick={handleCreate}
          disabled={!isNameValid || busy}
        >
          Neue Lobby erstellen
        </button>
      </div>

      <div className="divider"><span>oder</span></div>

      <label className="field">
        <span>Lobby-Code</span>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="z.B. AB7K"
          maxLength={LOBBY.CODE_LENGTH}
          autoCapitalize="characters"
        />
      </label>

      <div className="actions">
        <button onClick={handleJoin} disabled={!isNameValid || !isCodeValid || busy}>
          Lobby beitreten
        </button>
      </div>

      {errorMessage && <p className="error">{errorMessage}</p>}
    </div>
  );
}
