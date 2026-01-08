export default class StoryScene extends Phaser.Scene {
  constructor() {
    super("StoryScene");
  }

  create() {
    const { width, height } = this.scale;

    // ==================================================
    // CONTINUE MUSIC FROM INTRO (do not restart)
    // ==================================================
    if (!this.sound.get("menuMusic")) {
      this.music = this.sound.add("menuMusic", { loop: true, volume: 0 });
      this.music.play();

      // smooth fade-in
      this.tweens.add({
        targets: this.music,
        volume: 0.45,
        duration: 1500
      });
    } else {
      this.music = this.sound.get("menuMusic");
    }

    // ==================================================
    // LOOPING VIDEO BACKGROUND
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
    // STORY TEXT IMAGE
    // ==================================================
    const storyImg = this.add.image(
      width * 0.5,
      height / 2,
      "storyvisual"
    ).setScale(0.17);

    // ==================================================
    // FAIRY SPRITE
    // ==================================================
    const fairy = this.add.image(
      width * 0.8,
      height / 2,
      "fairy"
    )
      .setScale(0.055)
      .setDepth(5);

    this.tweens.add({
      targets: fairy,
      y: fairy.y + 15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut"
    });

    fairy.preFX.addGlow(0xffc9ff, 0.5, 0.8, false);

    // ==================================================
    // CLICK TO CONTINUE
    // ==================================================
    this.add.text(
      width / 2,
      height - 70,
      "Click to continue",
      {
        fontSize: "18px",
        fill: "#dddddd"
      }
    ).setOrigin(0.5);

    // ==================================================
    // FADE TRANSITION TO MENU
    // ==================================================
    this.input.once("pointerdown", () => {
      this.cameras.main.fadeOut(800, 0, 0, 0);

      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("MenuScene");
      });
    });
  }
}