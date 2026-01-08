export default class IntroScene extends Phaser.Scene {
    constructor() {
        super("IntroScene");
    }

    create() {
        // Create looping background video
        const video = this.add.video(
            this.scale.width / 2,
            this.scale.height / 2,
            "startVid"
        );

        video.setMute(true);
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
        this.time.delayedCall(5000, () => {

            this.cameras.main.fadeOut(1000, 0, 0, 0);

            this.cameras.main.once("camerafadeoutcomplete", () => {
                this.scene.stop(); 
                this.scene.start("StoryScene");
            });
        });
    }
}
