
import Phaser from "phaser";
import GameScene from "./scenes/GameScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,

  width: 960,
  height: 600,

  backgroundColor: "#080414",

  parent: "game-container",

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 600,
  },

  render: {
    antialias: true,
    pixelArt: false,
  },

  input: {
    keyboard: true,
    mouse: true,
    touch: true,
  },

  scene: [GameScene],
};
