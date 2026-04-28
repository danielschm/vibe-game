import { Client, Room } from "colyseus.js";
import type { GameState } from "@vibe-game/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";
const HTTP_URL = SERVER_URL.replace(/^ws/, "http");

export const colyseusClient = new Client(SERVER_URL);

export async function createLobby(playerName: string): Promise<Room<GameState>> {
  return await colyseusClient.create<GameState>("game", { playerName });
}

export async function joinLobby(
  joinCode: string,
  playerName: string,
): Promise<Room<GameState>> {
  const trimmedCode = joinCode.trim().toUpperCase();
  const res = await fetch(`${HTTP_URL}/api/lobbies/${trimmedCode}`);
  if (res.status === 404) {
    throw new Error(`Lobby mit Code "${trimmedCode}" nicht gefunden.`);
  }
  if (!res.ok) {
    throw new Error(`Server-Fehler: ${res.status}`);
  }
  const { roomId } = (await res.json()) as { roomId: string };
  return await colyseusClient.joinById<GameState>(roomId, { playerName });
}
