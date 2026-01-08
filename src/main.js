import Phaser from "phaser";

import BootScene from "./scenes/BootScene.js";
import IntroScene from "./scenes/IntroScene.js";
import StoryScene from "./scenes/StoryScene.js";
import MenuScene from "./scenes/MenuScene.js";
import DifficultyScene from "./scenes/DifficultyScene.js";
import GameScene from "./scenes/GameScene.js";
import BuilderScene from "./scenes/BuilderScene.js";

const config = {
  type: Phaser.AUTO,
  backgroundColor: "#000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  scene: [
    BootScene,
    IntroScene,
    StoryScene,
    MenuScene,
    DifficultyScene,
    GameScene,
    BuilderScene
  ]
};

new Phaser.Game(config);
