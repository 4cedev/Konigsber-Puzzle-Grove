export default class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
    }

    fadeOutAudio(callback) {
        if (!this.sound || this.sound.sounds.length === 0) {
            callback?.();
            return;
        }

        const activeSound = this.sound.sounds.find(s => s.isPlaying);

        if (!activeSound) {
            callback?.();
            return;
        }

        this.tweens.add({
            targets: activeSound,
            volume: 0,
            duration: 1200,
            onComplete: () => {
                activeSound.stop();
                callback?.();
            }
        });
    }

    create() {
        // Create looping background video
        const video = this.add.video(
            this.scale.width / 2,
            this.scale.height / 2,
            "menuVid"
        );

        video.setMute(true);
        video.setLoop(true);
        video.play(true);

        // Scale properly after data loads
        // Wait until Phaser knows real video width/height
        video.on("play", () => {

            const realW = video.video.videoWidth;
            const realH = video.video.videoHeight;

            // Force Phaser to use correct texture size
            video.setDisplaySize(realW, realH);

            const scaleX = this.scale.width / realW;
            const scaleY = this.scale.height / realH;

            const ZOOM_OUT = 1.20;

            const scale = Math.min(scaleX, scaleY) * ZOOM_OUT;

            video.setScale(scale);
            video.setPosition(this.scale.width / 2, this.scale.height / 2);

            console.log(`Video scaled → ${scale.toFixed(2)} from native ${realW}x${realH}`);
        });

        // ================================
        // Ambient Menu SFX
        // ================================
        // Play background music
        if (!this.sound.get("menuMusic")) {
            this.music = this.sound.add("menuMusic", { loop: true, volume: 0 });
            this.music.play();

            // Smooth fade-in
            this.tweens.add({
                targets: this.music,
                volume: 0.45,
                duration: 1500
            });
        } else {
            this.music = this.sound.get("menuMusic");
        }

        // =====================================
        //  IMAGE MENU BUTTONS START HERE
        // =====================================

        const buttonY = this.scale.height * 0.25;
        const spacing = 120;

        const createImgButton = (key, y, action) => {

            const btn = this.add.image(this.scale.width / 2, y, key)
                .setInteractive({ useHandCursor: true })
                .setScale(0.20)
                .setAlpha(0);

            // Fade in
            this.tweens.add({
                targets: btn,
                alpha: 1,
                duration: 600,
            });

            // Hover animation
            btn.on("pointerover", () => {
                this.tweens.add({
                    targets: btn,
                    scale: 0.25,
                    duration: 150,
                });
            });

            btn.on("pointerout", () => {
                this.tweens.add({
                    targets: btn,
                    scale: 0.20,
                    duration: 150,
                });
            });

            // Click behavior
            btn.on("pointerdown", () => {
                this.tweens.add({
                    targets: btn,
                    scale: 0.25,
                    duration: 100,
                    yoyo: true,
                        onComplete: () => {
                            this.fadeOutAudio(() => action());
                        }
                });
            });
        };


        // Assign each image button to a mode
        createImgButton("menu1", buttonY, () => {
            this.scene.start("DifficultyScene", { mode: "path" });
        });

        createImgButton("menu2", buttonY + spacing, () => {
            this.scene.start("DifficultyScene", { mode: "timed" });
        });

        createImgButton("menu3", buttonY + spacing * 2, () => {
            this.fadeOutAudio(() => {
                this.scene.start("BuilderScene", { customMode: true });
            });
        });

    }
}
