export default class DifficultyScene extends Phaser.Scene {
  constructor() {
    super("DifficultyScene");
  }

  create(data) {
    this.mode = data.mode;

    const { width, height } = this.scale;

    // ==================================================
    //  LOOPING VIDEO BACKGROUND (same as MenuScene)
    // ==================================================
    const video = this.add.video(width / 2, height / 2, "menuVid");

    video.setMute(true);
    video.setLoop(true);
    video.play(true);

    video.on("play", () => {
      const realW = video.video.videoWidth;
      const realH = video.video.videoHeight;

      video.setDisplaySize(realW, realH);

      const scale = Math.max(
        width / realW,
        height / realH
      );

      video.setScale(scale);
      video.setPosition(width / 2, height / 2);
    });

    // ==================================================
    //  CONTINUE MUSIC (same logic as MenuScene)
    // ==================================================
    if (!this.sound.get("menuMusic")) {
      this.music = this.sound.add("menuMusic", { loop: true, volume: 0 });
      this.music.play();

      this.tweens.add({
        targets: this.music,
        volume: 0.45,
        duration: 1500
      });
    } else {
      this.music = this.sound.get("menuMusic");
    }

    // ==================================================
    //  TITLE IMAGE: SELECT DIFFICULTY
    // ==================================================
    const title = this.add.image(
      width / 2,
      height * 0.18,
      "selectdifficulty"
    ).setScale(0.25);

    // ==================================================
    //  IMAGE BUTTON CREATOR (same feel as MenuScene)
    // ==================================================
    const createImgButton = (key, y, difficulty) => {
      const btn = this.add.image(width / 2, y, key)
        .setScale(0.12)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });

      // Fade-in
      this.tweens.add({
        targets: btn,
        alpha: 1,
        duration: 600
      });

      // Hover
      btn.on("pointerover", () => {
        this.tweens.add({
          targets: btn,
          scale: 0.16,
          duration: 150
        });
      });

      btn.on("pointerout", () => {
        this.tweens.add({
          targets: btn,
          scale: 0.12,
          duration: 150
        });
      });

      // Click
      btn.on("pointerdown", () => {
        this.tweens.add({
          targets: btn,
          scale: 0.12,
          duration: 100,
          yoyo: true,
          onComplete: () => {
            this.cameras.main.fadeOut(600, 0, 0, 0);
            this.cameras.main.once("camerafadeoutcomplete", () => {
              this.scene.start("GameScene", {
                mode: this.mode,
                difficulty,
                reset: true
              });
            });
          }
        });
      });
    };

    // ==================================================
    //  DIFFICULTY BUTTONS
    // ==================================================
    const startY = height * 0.38;
    const spacing = 105;

    createImgButton("easymode", startY, "easy");
    createImgButton("mediummode", startY + spacing, "medium");
    createImgButton("hardmode", startY + spacing * 2, "hard");

    // ==================================================
    //  HIGHEST SCORE BUTTON
    // ==================================================
    const highScoreBtn = this.add.image(
      width / 2,
      height * 0.84,
      "highestscore"
    )
      .setScale(0.12)
      .setInteractive({ useHandCursor: true });

    highScoreBtn.on("pointerover", () => {
      this.tweens.add({ targets: highScoreBtn, scale: 0.16, duration: 150 });
    });

    highScoreBtn.on("pointerout", () => {
      this.tweens.add({ targets: highScoreBtn, scale: 0.12, duration: 150 });
    });

    highScoreBtn.on("pointerdown", () => {
      this.showHighestScores();
    });
  }

  showHighestScores() {
    const { width, height } = this.scale;

    const popup = this.add.container(width / 2, height / 2).setDepth(9999);

    // Dark background
    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setInteractive();

    // Panel (BACKGROUND FIRST)
    const panel = this.add.rectangle(0, 0, 460, 520, 0x000000, 0.6)
      .setStrokeStyle(3, 0xffffff);

    popup.add([dim, panel]);

    // Title
    const title = this.add.text(0, -220, "Highest Scores", {
      fontSize: "36px",
      fill: "#ffffff"
    }).setOrigin(0.5);

    popup.add(title);

    const getScores = (diff) => this.getOrInitScores(diff);

    const makeBlock = (label, scores, y) => {
      const filled = scores.length === 0
        ? [0, 0, 0]
        : [...scores, 0, 0, 0].slice(0, 3);

      const text = filled
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n");

      popup.add(
        this.add.text(0, y, `${label}\n${text}`, {
          fontSize: "22px",
          fill: "#ffdd88",
          align: "center"
        }).setOrigin(0.5)
      );
    };

    makeBlock("Easy", getScores("easy"), -120);
    makeBlock("Medium", getScores("medium"), 0);
    makeBlock("Hard", getScores("hard"), 120);

    const close = this.add.text(0, 220, "Click anywhere to close", {
      fontSize: "18px",
      fill: "#cccccc"
    }).setOrigin(0.5);

    popup.add(close);

    dim.on("pointerdown", () => popup.destroy());
  }

  getOrInitScores(diff) {
    const key = `magicCircleScores_${diff}`;
    let scores = JSON.parse(localStorage.getItem(key));

    if (!Array.isArray(scores) || scores.length === 0) {
      scores = [0, 0, 0];
      localStorage.setItem(key, JSON.stringify(scores));
    }

    return scores;
  }
}
