import { createGame } from "./game";

const root = document.getElementById("game-root");
if (!root) {
  throw new Error("#game-root not found in DOM");
}

createGame(root);
