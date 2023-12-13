import "phaser";
import { BootScene } from "./scenes/BootScene";
import { BattleScene } from "./scenes/BattleScene";
import { UIScene } from "./scenes/UIScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { WorldScene } from "./scenes/WorldScene";
import screenfull from "screenfull";

const config = {
  type: Phaser.AUTO,
  pixelArt: true,
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    parent: "game",
    width: 930, // xiaomi mi a3 : 19.5:9 ratio
    height: 430,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, WorldScene, BattleScene, UIScene, GameOverScene],
};
export class RpgGame extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
  }
}
window.onload = () => {
  const gameDiv = document.getElementById("game");
  const fullscreenButton = document.getElementById("fullscreen-button");
  const fullscreenButtonDiv = document.getElementById("fullscreenButton-div");
  fullscreenButton.addEventListener("click", () => {
    if (screenfull.isEnabled) {
      screenfull.request(gameDiv);
      gameDiv.hidden = false;
      fullscreenButton.hidden = true;
      fullscreenButtonDiv.hidden = true;
      window.screen.orientation["lock"]("landscape");
    } else {
      alert("Error ! Please refresh your navigator.");
    }
  });

  var game = new RpgGame(config);
};
