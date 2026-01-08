const fairyImg = new URL("../assets/fairy.png", import.meta.url).href;
const bgImg = new URL("../assets/forest-bg.jpg", import.meta.url).href;
const forestImg = new URL("../assets/forest.png", import.meta.url).href;
const startVideo = new URL("../assets/start-bg.mp4", import.meta.url).href;
const menuVideo = new URL("../assets/menu-bg.mp4", import.meta.url).href;
const menu1Img = new URL("../assets/Menu1.png", import.meta.url).href;
const menu2Img = new URL("../assets/Menu2.png", import.meta.url).href;
const menu3Img = new URL("../assets/Menu3.png", import.meta.url).href;
const musicFile = new URL("../assets/sounds/menu-theme.mp3", import.meta.url).href;
const MenuTitle = new URL("../assets/icons/MenuTitle.png", import.meta.url).href;
const continueBtnImg = new URL("../assets/icons/Menu-Continue.png", import.meta.url).href;
const restartBtnImg = new URL("../assets/icons/Menu-Restart.png", import.meta.url).href;
const settingsBtnImg = new URL("../assets/icons/Menu-Settings.png", import.meta.url).href;
const exitBtnImg = new URL("../assets/icons/Menu-Exit.png", import.meta.url).href;
const MenuIconBtnImg = new URL("../assets/icons/MenuIcon.png", import.meta.url).href;
const HintIconBtnImg = new URL("../assets/icons/HintButton.png", import.meta.url).href;
const AiSolverIconBtnImg = new URL("../assets/icons/AiSolver.png", import.meta.url).href;
const popupComplete = new URL("../assets/icons/completed.png", import.meta.url).href;
const nextButton = new URL("../assets/icons/Next.png", import.meta.url).href;
const exitButton = new URL("../assets/icons/Exit.png", import.meta.url).href;
const timesUp = new URL("../assets/icons/TimeUp.png", import.meta.url).href;
const newGameBtnImg = new URL("../assets/icons/NewGame.png", import.meta.url).href;
const noMove = new URL("../assets/icons/noPossibleMove.png", import.meta.url).href;
const mushRoom1 = new URL("../assets/mushroom1.png", import.meta.url).href;
const mushRoom2 = new URL("../assets/mushroom2.png", import.meta.url).href;
const mushRoom3 = new URL("../assets/mushroom3.png", import.meta.url).href;
const mushRoom4 = new URL("../assets/mushroom4.png", import.meta.url).href;
const mushRoom5 = new URL("../assets/mushroom5.png", import.meta.url).href;
const mushRoom6 = new URL("../assets/mushroom6.png", import.meta.url).href;
const mushRoom7 = new URL("../assets/mushroom7.png", import.meta.url).href;
const story = new URL("../assets/story.png", import.meta.url).href;
const selectDifficulty = new URL("../assets/selectdifficulty.png", import.meta.url).href;
const easy = new URL("../assets/easy.png", import.meta.url).href;
const medium = new URL("../assets/medium.png", import.meta.url).href;
const hard = new URL("../assets/hard.png", import.meta.url).href;
const highest = new URL("../assets/highestscore.png", import.meta.url).href;
const forgeButton = new URL("../assets/forge.png", import.meta.url).href;

export default class BootScene extends Phaser.Scene {
    constructor() {
        super("BootScene");
    }

    preload() {
        this.load.video("startVid", startVideo, "loadeddata", false, true);
        this.load.video("menuVid", menuVideo, "loadeddata", false, true);
        this.load.image("mushroom", mushroomImg);
        this.load.image("fairy", fairyImg);
        this.load.image("bg", bgImg);
        this.load.image("forestBg", forestImg);

        this.load.image("menu1", menu1Img);
        this.load.image("menu2", menu2Img);
        this.load.image("menu3", menu3Img);

        // Game Menu Options
        this.load.image("menuTitle", MenuTitle);
        this.load.image("menuContinue", continueBtnImg);
        this.load.image("menuRestart", restartBtnImg);
        this.load.image("menuSettings", settingsBtnImg);
        this.load.image("menuExit", exitBtnImg);
        this.load.image("menuIcon", MenuIconBtnImg);

        this.load.image("hintButton", HintIconBtnImg);
        this.load.image("AiSolverButton", AiSolverIconBtnImg);
        
        // Load music
        this.load.audio("menuMusic", musicFile);

        // Completed UI
        this.load.image("completed", popupComplete);
        this.load.image("btnNext", nextButton);
        this.load.image("btnExit", exitButton);
        this.load.image("btnForge", forgeButton);

        this.load.image("btnNewGame", newGameBtnImg);
        this.load.image("TimesUp", timesUp);

        this.load.image("noPossibleMove", noMove);

        this.load.image("mush1", mushRoom1);
        this.load.image("mush2", mushRoom2);
        this.load.image("mush3", mushRoom3);
        this.load.image("mush4", mushRoom4);
        this.load.image("mush5", mushRoom5);
        this.load.image("mush6", mushRoom6);
        this.load.image("mush7", mushRoom7);

        this.load.image("storyvisual", story);

        this.load.image("selectdifficulty", selectDifficulty);
        this.load.image("easymode", easy);
        this.load.image("mediummode", medium);
        this.load.image("hardmode", hard);
        this.load.image("highestscore", highest);

    }

    create() {
        this.scene.start("IntroScene");
    }
}
