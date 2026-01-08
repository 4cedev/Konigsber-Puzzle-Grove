import Graph from "../game/Graph.js";
import EulerianChecker from "../game/EulerianChecker.js";
import HierholzerSolver from "../game/HierholzerSolver.js";
import RandomGraphGenerator from "../game/RandomGraphGenerator.js";
import PlanarityChecker from "../game/PlanarityChecker.js"; 

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        
        this.score = 0;
        this.timeLeft = 0;
        this.timer = null;
        this.timerText = null;
        this.scoreText = null;
        this.lastTimeBonus = 0;
        this.performanceHistory = [];
        this.scoreSaved = false;
        
        this.isMoving = false;
        this.isSolving = false;
        this.isCustomMode = false;
        this.fairyFloatTween = null;
        this.winPopup = null;
        this.menuContainer = null;
        this.hintButton = null;
        this.solveButton = null;
        this.nodeSprites = {};
        this.music = null;

        this.scoreSaved = false;

        this.mushroomImages = [
            "mush1", "mush2", "mush3", "mush4", "mush5", "mush6", "mush7"
        ];

        this.difficultyOrder = [
            "easy", "easy", "easy", "easy", "easy",
            "medium", "medium", "medium",
            "hard", "hard"
        ];

        if (!this.selectedDifficulty) {
            this.difficultyIndex = 0;
        }
    }

    cloneRemainingGraph(edgeToUse) {
        const temp = new Graph();

        // Clone nodes
        this.graph.getNodes().forEach(n => temp.addNode(n));

        // Clone edges except the one we plan to use
        this.graph.edges.forEach(e => {
            if (!e.used && e !== edgeToUse) temp.addEdge(e.a, e.b);
        });

        return temp;
    }

    currentNode = null;
    visitedEdges = [];

    alignSolutionToStart(solution, startNode) {
        const index = solution.indexOf(startNode);
        if (index <= 0) return solution; // already correct

        return [...solution.slice(index), ...solution.slice(0, index)];
    }

    getStartingNode() {

        //  Custom mode → node IDs are strings
        if (this.isCustomMode) {
            const nodes = this.graph.getNodes(); // already strings

            const oddNodes = nodes.filter(
                n => this.graph.getDegree(n) % 2 !== 0
            );

            if (oddNodes.length === 2) {
                return Phaser.Math.RND.pick(oddNodes);
            }

            return Phaser.Math.RND.pick(nodes);
        }

        //  Normal mode (existing behavior)
        const nodes = this.graph.getNodes();

        const oddNodes = nodes.filter(
            n => this.graph.getDegree(n) % 2 !== 0
        );

        if (oddNodes.length === 2) {
            return Phaser.Math.RND.pick(oddNodes);
        }

        return Phaser.Math.RND.pick(nodes);
    }

    generateNodePositions(graph) {
        const nodes = graph.getNodes();
        const positions = {};
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        const MIN_DIST = 240; // ~2.5 inches
        const RADIUS = Math.min(this.scale.width, this.scale.height) * 0.32;

        // 50% chance: circular layout
        const useCircle = Phaser.Math.Between(0, 1) === 0;

        if (useCircle) {
            const step = (Math.PI * 2) / nodes.length;
            nodes.forEach((n, i) => {
            positions[n] = {
                x: centerX + Math.cos(i * step) * RADIUS,
                y: centerY + Math.sin(i * step) * RADIUS
            };
            });
            return positions;
        }

        // Otherwise: spaced random layout
        nodes.forEach(n => {
            let tries = 0;
            let pos;

            do {
            pos = {
                x: Phaser.Math.Between(200, this.scale.width - 200),
                y: Phaser.Math.Between(200, this.scale.height - 200)
            };
            tries++;
            } while (
            Object.values(positions).some(p =>
                Phaser.Math.Distance.Between(p.x, p.y, pos.x, pos.y) < MIN_DIST
            ) && tries < 100
            );

            positions[n] = pos;
        });

        return positions;
    }

    canMoveTo(targetNode) {

        //  Custom mode: allow move if unused edge exists
        if (this.isCustomMode) {
            return this.graph.edges.some(e =>
                !e.used &&
                (
                    (e.a === this.currentNode && e.b === targetNode) ||
                    (e.b === this.currentNode && e.a === targetNode)
                )
            );
        }

        //  Normal mode (unchanged)
        const neighbors = this.graph.getNeighbors(this.currentNode);
        if (!neighbors.includes(targetNode)) return false;

        const used = this.graph.edges.find(
            e =>
                e.used &&
                (
                    (e.a === this.currentNode && e.b === targetNode) ||
                    (e.a === targetNode && e.b === this.currentNode)
                )
        );

        return !used;
    }

    // Returns true if the given node has at least one unused neighbor edge
    nodeHasLegalMoves(node) {
        if (!node || !this.graph) return false;
        return this.graph.edges.some(e =>
            !e.used && (e.a === node || e.b === node)
        );
    }

    moveTo(targetNode) {
        if (this.isMoving) return;
        this.isMoving = true;
        
        // Stop idle floating animation if it exists
        if (this.fairyFloatTween) {
            this.fairyFloatTween.stop();
            this.fairyFloatTween = null;
        }
        
        const previousNode = this.currentNode;
        
        // Mark the edge as used
        let edge = this.graph.edges.find(e =>
            !e.used &&
            (
                (e.a === previousNode && e.b === targetNode) ||
                (e.b === previousNode && e.a === targetNode)
            )
        );
        
        if (!edge) {
            console.warn("⚠ No valid edge:", previousNode, "→", targetNode);
            this.isMoving = false;
            return;
        }
        
        edge.used = true;
        
        // Update current node
        this.currentNode = targetNode;
        
        // CRITICAL: Redraw edges FIRST (remove used edges)
        this.redrawGraph();
        
        // Then update highlights
        this.highlightPossibleMoves();
        this.highlightNode(targetNode);

        const targetPos = this.nodePositions[targetNode];

        this.tweens.add({
            targets: this.fairy,
            x: targetPos.x,
            y: targetPos.y,
            duration: 500,
            ease: "Quad.easeOut",
            onComplete: () => {

                // Resume idle floating animation AFTER reaching target
                this.fairyFloatTween = this.tweens.add({
                    targets: this.fairy,
                    y: this.fairy.y + 12,
                    duration: 1200,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.inOut"
                });

                this.isMoving = false;

                // Win condition: all edges used
                if (this.graph.allEdgesUsed()) {
                    this.showWinMessage();
                    return;
                }

                // If there are no legal moves from the new current node, show popup
                if (!this.nodeHasLegalMoves(this.currentNode)) {
                    // small delay so player sees the fairy arrive + tints updated
                    this.time.delayedCall(180, () => {
                        this.showNoMovePopup();
                    });
                } else {
                    // keep highlighting possible moves for the player
                    this.highlightPossibleMoves();
                }
            }
        });
    }

    playFairyPulse() {
        this.tweens.add({
            targets: this.fairy,
            scaleX: this.fairy.scale * 1.2,
            scaleY: this.fairy.scale * 1.2,
            duration: 300,
            yoyo: true
        });
    }

    highlightNode(node) {
        Object.values(this.nodeSprites).forEach(sprite => sprite.clearTint());
        this.nodeSprites[node].setTint(0x90ee90);
    }

    highlightPossibleMoves() {
        // Clear ALL tints first
        Object.values(this.nodeSprites).forEach(sprite => sprite.clearTint());
        
        // Always highlight current node in green
        this.nodeSprites[this.currentNode]?.setTint(0x90ee90);
        
        // ONLY highlight possible moves if NOT the first move
        // Check if any edges have been used yet
        const hasMoved = this.graph.edges.some(e => e.used);
        
        if (hasMoved) {
            // Highlight possible move nodes in yellow
            this.graph.edges.forEach(e => {
                if (!e.used && e.a === this.currentNode) {
                    this.nodeSprites[e.b]?.setTint(0xffff66);
                }
                if (!e.used && e.b === this.currentNode) {
                    this.nodeSprites[e.a]?.setTint(0xffff66);
                }
            });
        }
    }
    
    async autoSolve() {
        if (this.isSolving) return; // prevent double triggering
        this.isSolving = true;

        while (!this.graph.allEdgesUsed()) {

            // Step 1: Find possible legal edges
            const possibleMoves = this.graph.edges.filter(
                e => !e.used && (e.a === this.currentNode || e.b === this.currentNode)
            );

            if (possibleMoves.length === 0) {
                console.warn("🤖 AI stuck — no valid move from here.");
                break;
            }

            // Step 2: Pick a safe move (same logic as hint system)
            const safeMove = possibleMoves.find(edge => {
                const temp = this.cloneRemainingGraph(edge);
                const type = EulerianChecker.analyze(temp);
                return type === "path" || type === "circuit";
            });

            const chosenEdge = safeMove || possibleMoves[0];
            const nextNode = chosenEdge.a === this.currentNode ? chosenEdge.b : chosenEdge.a;

            // Step 3: Move with animation delay
            await new Promise(resolve => setTimeout(resolve, 350));
            this.moveTo(nextNode);
        }

        this.isSolving = false;
    }

    useHint() {
        if (!this.currentNode) {
            console.warn("⚠ Pick a starting node first.");
            return;
        }
        
        // Step 1: Get all possible remaining moves from the current node
        const candidates = this.graph.edges.filter(
            e => !e.used && (e.a === this.currentNode || e.b === this.currentNode)
        );
        
        if (candidates.length === 0) {
            console.warn("🚧 No legal moves — you're stuck!");
            return;
        }
        
        // Step 2: Prioritize edges that do NOT disconnect the graph once used
        const safeMoves = candidates.filter(edge => {
            // Simulate using this edge on a temporary graph
            const tempGraph = new Graph();
            
            // Clone nodes
            this.graph.getNodes().forEach(n => tempGraph.addNode(n));
            
            // Clone remaining edges except the tested one
            this.graph.edges.forEach(e => {
                if (!e.used && e !== edge) tempGraph.addEdge(e.a, e.b);
            });
            
            // Check if the remainder of the graph still allows an Eulerian continuation
            const type = EulerianChecker.analyze(tempGraph);
            return type === "path" || type === "circuit"; // still valid
        });
        
        // Step 3: Pick the best move: safe one if exists, otherwise fallback
        const chosenEdge = safeMoves[0] || candidates[0];
        const nextNode = (chosenEdge.a === this.currentNode) ? chosenEdge.b : chosenEdge.a;
        
        // Step 4: Highlight hint visually in CYAN (different from regular yellow)
        const hintNode = this.nodeSprites[nextNode];
        if (hintNode) {
            // Store current tint state to restore later
            const currentTint = hintNode.tintTopLeft;
            
            // Flash cyan
            hintNode.setTint(0x00eaff);
            
            // Clear hint after 2 seconds
            this.time.delayedCall(2000, () => {
                // Only clear if still the same node and hasn't been clicked
                if (hintNode.tintTopLeft === 0x00eaff) {
                    hintNode.clearTint();
                    // Reapply move highlight if it's still a valid move
                    this.highlightPossibleMoves();
                }
            });
        }
        
        console.log(`💡 Hint chosen: Move from ${this.currentNode} → ${nextNode}`);
    }

    redrawGraph() {
        this.graphics.clear();
        
        this.graph.edges.forEach(edge => {
            // Custom mode: only draw UNUSED edges
            if (this.isCustomMode) {
                if (edge.used) return; // Skip used edges in custom mode too!
                
                const posA = this.nodePositions[edge.a];
                const posB = this.nodePositions[edge.b];
                
                this.graphics.lineStyle(6, 0xffffff, 0.9);
                this.graphics.beginPath();
                this.graphics.moveTo(posA.x, posA.y);
                this.graphics.lineTo(posB.x, posB.y);
                this.graphics.strokePath();
                return;
            }
            
            // Normal gameplay logic (unchanged)
            if (!edge.used) {
                const posA = this.nodePositions[edge.a];
                const posB = this.nodePositions[edge.b];
                
                this.graphics.lineStyle(6, 0xffffff, 0.9);
                this.graphics.beginPath();
                this.graphics.moveTo(posA.x, posA.y);
                this.graphics.lineTo(posB.x, posB.y);
                this.graphics.strokePath();
            }
        });
    }

    showWinMessage() {
        if (this.mode === "timed") {
            // Base score
            this.score++;

            // --- BONUS SCORE SYSTEM ---
            const maxTime = this.timeLeftStart; // store original per puzzle time

            let bonus = Math.floor(this.timeLeft / (maxTime * 0.25));
            if (bonus < 0) bonus = 0;
            if (bonus > 3) bonus = 3;

            this.lastTimeBonus = bonus;
            this.score += bonus;

            if (this.scoreText) {
                this.scoreText.setText(`Score: ${this.score}`);
            }

            // Save performance sample for adaptive difficulty
            const performance = this.timeLeft / maxTime;
            this.performanceHistory.push(performance);

            if (this.timer) this.timer.remove();
        }

        // Create centered popup container
        this.winPopup = this.add.container(
            this.scale.width / 2,
            this.scale.height / 2
        ).setDepth(9999).setAlpha(0);

        // Dim background to block clicks behind popup
        const dim = this.add.rectangle(
            0,
            0,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.6
        )
            .setInteractive(); // absorbs clicks so game behind can't be clicked

        // Popup title image
        const popup = this.add.image(0, -80, "completed").setScale(0.07);

        // --- BUTTONS SIDE BY SIDE ---
        const buttonY = 100;      // vertical position of buttons
        const buttonOffset = 110; // horizontal distance from center

        // CUSTOM MODE: Forge button instead of Next
        if (this.isCustomMode) {
            // FORGE Button (left) - goes back to BuilderScene
            const forgeBtn = this.add.image(-buttonOffset, buttonY, "btnForge")
                .setScale(0.03)
                .setInteractive({ useHandCursor: true });

            forgeBtn.on("pointerover", () => {
                this.tweens.add({ targets: forgeBtn, scale: 0.035, duration: 120 });
            });

            forgeBtn.on("pointerout", () => {
                this.tweens.add({ targets: forgeBtn, scale: 0.03, duration: 120 });
            });

            forgeBtn.on("pointerdown", () => {
                this.fadeOutAudio(() => {
                    this.winPopup.destroy();
                    this.scene.start("BuilderScene"); // Go back to builder
                });
            });

            // EXIT Button (right) - goes to MenuScene
            const exitBtn = this.add.image(buttonOffset, buttonY, "btnExit")
                .setScale(0.03)
                .setInteractive({ useHandCursor: true });

            exitBtn.on("pointerover", () => {
                this.tweens.add({ targets: exitBtn, scale: 0.035, duration: 120 });
            });

            exitBtn.on("pointerout", () => {
                this.tweens.add({ targets: exitBtn, scale: 0.03, duration: 120 });
            });

            exitBtn.on("pointerdown", () => {
                this.fadeOutAudio(() => {
                    this.winPopup.destroy();
                    this.scene.start("MenuScene");
                });
            });

            // Add everything to the popup container
            this.winPopup.add([dim, popup, forgeBtn, exitBtn]);

        } else {
            // NORMAL MODE: Next + Exit buttons (original behavior)
            
            // NEXT Button (left)
            const nextBtn = this.add.image(-buttonOffset, buttonY, "btnNext")
                .setScale(0.03)
                .setInteractive({ useHandCursor: true });

            nextBtn.on("pointerover", () => {
                this.tweens.add({ targets: nextBtn, scale: 0.035, duration: 120 });
            });

            nextBtn.on("pointerout", () => {
                this.tweens.add({ targets: nextBtn, scale: 0.03, duration: 120 });
            });

            nextBtn.on("pointerdown", () => {
                this.fadeOutAudio(() => {
                    // optional: destroy popup before restart
                    this.winPopup.destroy();
                    this.scene.restart({ mode: this.mode });
                });
            });

            // EXIT Button (right)
            const exitBtn = this.add.image(buttonOffset, buttonY, "btnExit")
                .setScale(0.03)
                .setInteractive({ useHandCursor: true });

            exitBtn.on("pointerover", () => {
                this.tweens.add({ targets: exitBtn, scale: 0.035, duration: 120 });
            });

            exitBtn.on("pointerout", () => {
                this.tweens.add({ targets: exitBtn, scale: 0.03, duration: 120 });
            });

            exitBtn.on("pointerdown", () => {
                this.fadeOutAudio(() => {
                    this.winPopup.destroy();
                    this.scene.start("MenuScene");
                });
            });

            // Add everything to the popup container
            this.winPopup.add([dim, popup, nextBtn, exitBtn]);
        }

        // Popup entrance animation
        this.tweens.add({
            targets: this.winPopup,
            alpha: 1,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 450,
            ease: "Back.Out"
        });

        // Bonus text (only visible in timed mode)
        let bonusText = null;
        if (this.mode === "timed" && this.lastTimeBonus > 0) {
            bonusText = this.add.text(0, 5, `+${this.lastTimeBonus} Bonus!`, {
                fontSize: "32px",
                fill: "#ffeb3b",
                stroke: "#000",
                strokeThickness: 5
            }).setOrigin(0.5);
            this.winPopup.add(bonusText);
        }
    }

    showFailPopup() {
        if (this.timer) this.timer.remove();

        let isNewHighScore = false;
        if (this.mode === "timed") {
            isNewHighScore = this.saveScore(this.score);
        }

        const popup = this.add.container(
            this.scale.width / 2,
            this.scale.height / 2
        ).setDepth(9999).setAlpha(0);

        const dim = this.add.rectangle(
            0, 0,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.65
        ).setInteractive();

        const titleImg = this.add.image(0, -140, "TimesUp").setScale(0.07);

        const finalScoreText = this.add.text(
            0,
            -30,
            `Final Score: ${this.score}`,
            {
            fontSize: "40px",
            fill: "#ffee88",
            stroke: "#000",
            strokeThickness: 6
            }
        ).setOrigin(0.5);

        let highScoreText = null;
        if (isNewHighScore) {
            highScoreText = this.add.text(
            0,
            20,
            "🏆 NEW HIGH SCORE!",
            {
                fontSize: "28px",
                fill: "#ffd700",
                stroke: "#000",
                strokeThickness: 5
            }
            ).setOrigin(0.5);
        }

        const buttonY = 70;
        const offset = 95;

        const newGameBtn = this.add.image(-offset, buttonY, "btnNewGame")
            .setScale(0.025)
            .setInteractive();

        newGameBtn.on("pointerdown", () => {
            popup.destroy();
            this.fadeOutAudio(() => {
            this.score = 0;
            if (!this.selectedDifficulty) {
                this.difficultyIndex = 0;
            }
            this.scene.restart({ mode: "timed", reset: true });
            });
        });

        const exitBtn = this.add.image(offset, buttonY, "btnExit")
            .setScale(0.025)
            .setInteractive();

        exitBtn.on("pointerdown", () => {
            popup.destroy();
            this.fadeOutAudio(() => this.scene.start("MenuScene"));
        });

        // ADD ELEMENTS ONCE, IN ORDER
        const elements = [dim, titleImg, finalScoreText];

        if (highScoreText) elements.push(highScoreText);

        elements.push(newGameBtn, exitBtn);
        popup.add(elements);

        this.tweens.add({
            targets: popup,
            alpha: 1,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 450,
            ease: "Back.Out"
        });
    }

    showNoMovePopup() {
        // Stop gameplay (timer too)
        if (this.timer) {
            this.timer.remove();
            this.timer = null;
        }

        if (this.mode === "timed") {
            this.saveScore(this.score);
        }

        // Popup container (centered)
        const popup = this.add.container(this.scale.width / 2, this.scale.height / 2)
            .setDepth(9999)
            .setAlpha(0);

        // Dim background that blocks clicks
        const dim = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.65)
            .setInteractive();

        // Title image (your custom art)
        const titleImg = this.add.image(0, -140, "noPossibleMove").setScale(0.07);

        // Optional: show current score if timed
        const scoreTextObj = (this.mode === "timed")
            ? this.add.text(0, -60, `Score: ${this.score}`, {
                fontSize: "34px",
                fill: "#ffee88",
                stroke: "#000",
                strokeThickness: 5
            }).setOrigin(0.5)
            : null;

        // Buttons
        const buttonY = 60;
        const offset = 95;

        // CUSTOM MODE: Forge button instead of New Game
        if (this.isCustomMode) {
            // Forge Button (left) - goes back to BuilderScene
            const forgeBtn = this.add.image(-offset, buttonY, "btnForge")
                .setScale(0.025)
                .setInteractive({ useHandCursor: true });

            forgeBtn.on("pointerover", () => this.tweens.add({ targets: forgeBtn, scale: 0.027, duration: 120 }));
            forgeBtn.on("pointerout", () => this.tweens.add({ targets: forgeBtn, scale: 0.025, duration: 120 }));
            forgeBtn.on("pointerdown", () => {
                popup.destroy();
                this.fadeOutAudio(() => this.scene.start("BuilderScene"));
            });

            // Exit Button (right)
            const exit = this.add.image(offset, buttonY, "btnExit")
                .setScale(0.025)
                .setInteractive({ useHandCursor: true });

            exit.on("pointerover", () => this.tweens.add({ targets: exit, scale: 0.027, duration: 120 }));
            exit.on("pointerout", () => this.tweens.add({ targets: exit, scale: 0.025, duration: 120 }));
            exit.on("pointerdown", () => {
                popup.destroy();
                this.fadeOutAudio(() => this.scene.start("MenuScene"));
            });

            // Build element list
            const elements = [dim, titleImg, forgeBtn, exit];
            if (scoreTextObj) elements.push(scoreTextObj);
            popup.add(elements);
        } else {
            // Original buttons for non-custom mode
            // Retry (New Game)
            const retry = this.add.image(-offset, buttonY, "btnNewGame")
                .setScale(0.025)
                .setInteractive({ useHandCursor: true });

            retry.on("pointerover", () => this.tweens.add({ targets: retry, scale: 0.027, duration: 120 }));
            retry.on("pointerout", () => this.tweens.add({ targets: retry, scale: 0.025, duration: 120 }));
            retry.on("pointerdown", () => {
                popup.destroy();
                this.score = 0;
                if (!this.selectedDifficulty) {
                    this.difficultyIndex = 0;
                }
                this.fadeOutAudio(() => this.scene.restart({ mode: this.mode, reset: true }));
            });

            // Exit
            const exit = this.add.image(offset, buttonY, "btnExit")
                .setScale(0.025)
                .setInteractive({ useHandCursor: true });

            exit.on("pointerover", () => this.tweens.add({ targets: exit, scale: 0.027, duration: 120 }));
            exit.on("pointerout", () => this.tweens.add({ targets: exit, scale: 0.025, duration: 120 }));
            exit.on("pointerdown", () => {
                popup.destroy();
                this.fadeOutAudio(() => this.scene.start("MenuScene"));
            });

            // Build element list
            const elements = [dim, titleImg, retry, exit];
            if (scoreTextObj) elements.push(scoreTextObj);
            popup.add(elements);
        }

        // Animate and show popup
        this.tweens.add({
            targets: popup,
            alpha: 1,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 450,
            ease: "Back.Out"
        });
    }
    
    saveScore(score) {
        if (this.scoreSaved) return false;
        this.scoreSaved = true;

        if (!this.currentDifficulty) {
            console.error("❌ Cannot save score: difficulty missing");
            return false;
        }

        const difficulty = this.currentDifficulty;

        const key = `magicCircleScores_${difficulty}`;

        const scores = JSON.parse(localStorage.getItem(key) || "[]");

        const isNewHigh = scores.length === 0 || score > scores[0];

        scores.push(score);
        scores.sort((a, b) => b - a);

        localStorage.setItem(key, JSON.stringify(scores.slice(0, 3)));

        console.log("🏆 Saving score", score, "for", this.currentDifficulty);

        return isNewHigh;
    }

    getScores(difficulty) {
        const key = `magicCircleScores_${difficulty}`;
        return JSON.parse(localStorage.getItem(key) || "[]");
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
            duration: 1200, // smooth fade (change if needed)
            onComplete: () => {
                activeSound.stop();
                callback?.();
            }
        });
    }

    toggleMenu(show) {
        if (show) {
            this.menuContainer.setVisible(true);
            this.tweens.add({
                targets: this.menuContainer,
                alpha: 1,
                duration: 300,
            });
        } else {
            this.tweens.add({
                targets: this.menuContainer,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    this.menuContainer.setVisible(false);
                    this.menuContainer.alpha = 1; // reset
                }
            });
        }
    }

    create(data) {

        this.mode = data.mode || "path";

        // ✅ ALWAYS add background
        const bg = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2,
            "forestBg"
        ).setDepth(-10);

        const scale = Math.max(
            this.scale.width / bg.width,
            this.scale.height / bg.height
        );
        bg.setScale(scale);

        this.isCustomMode = data.mode === "custom";

        // ✅ THEN handle custom mode
        if (data.mode === "custom") {
            this.loadCustomGraph(data.customGraph);
            return;
        }

        // 🔒 LOCK difficulty (do NOT overwrite on restart)
        if (data.difficulty) {
            this.currentDifficulty = data.difficulty;
        }

        this.selectedDifficulty = this.currentDifficulty ?? null;

        console.log("🎮 Selected difficulty:", this.currentDifficulty);

        console.log("🎮 Selected difficulty:", this.currentDifficulty);

        // reset leaderboard guard every new game
        this.scoreSaved = false;

        // reset score ONLY when entering Magic Circle fresh
        if (this.mode === "timed" && data.reset === true) {
            this.score = 0;
            if (!this.selectedDifficulty) {
                this.difficultyIndex = 0;
            }
        }

        console.log("GAME SCENE LOADED");

        // Reset RNG so graph changes every restart
        Phaser.Math.RND.sow([Date.now().toString(), Math.random().toString()]);

        this.add.text(20, 20, `Mode: ${this.mode}`, {
            fontSize: "20px",
            fill: "#ffffff"
        });

        if (data.mode === "custom") {
            this.loadCustomGraph(data.customGraph);
            return;
        }

        // Get current difficulty based on cycle
        const difficulty = this.currentDifficulty 
            ?? this.difficultyOrder[this.difficultyIndex];

        // Difficulty configuration (used so generator produces different puzzles)
        const difficultyConfig = {
            easy: {
                nodes: Phaser.Math.Between(4, 6),
                edges: Phaser.Math.Between(4, 6),
                mustBePlanar: true,
                mustBeEulerian: "circuit"
            },
            medium: {
                nodes: Phaser.Math.Between(6, 8),
                edges: Phaser.Math.Between(6, 8),
                mustBePlanar: false,  // Just say not necessarily planar
                mustBeEulerian: "any" // Can be any type
            },
            hard: {
                nodes: Phaser.Math.Between(8, 12), // Reduced max from 18 to prevent huge graphs
                edges: Phaser.Math.Between(8, 12),
                mustBePlanar: false,
                mustBeEulerian: "any"
            }
        };

        const config = difficultyConfig[difficulty];

        console.log(`🔍 Difficulty Level: ${difficulty}`);

        // Fix for timed mode (must use Eulerian rules)
        const eulerMode = (this.mode === "timed") ? "path" : this.mode;

        // Assign timer per difficulty IF in timed mode
        if (this.mode === "timed") {
            if (difficulty === "easy")  this.timeLeft = 45;
            if (difficulty === "medium") this.timeLeft = 70;
            if (difficulty === "hard")   this.timeLeft = 110;

            // Remember starting time for bonus calculations
            this.timeLeftStart = this.timeLeft;

            // 🧮 SCORE DISPLAY (timed mode only)
            this.scoreText = this.add.text(20, 85, `Score: ${this.score}`, {
                fontSize: "26px",
                fill: "#ffcc66",
                stroke: "#000",
                strokeThickness: 3
            }).setDepth(99);

            this.timerText = this.add.text(20, 60, `Time: ${this.timeLeft}s`, {
                    fontSize: "28px",
                    fill: "#ffcc66",
                    stroke: "#000",
                    strokeThickness: 3
                }
            ).setDepth(99);
        }

        // Start gameplay music
        this.music = this.sound.add("menuMusic", { loop: true, volume: 0 });
        this.music.play();

        // Smooth fade-in
        this.tweens.add({
            targets: this.music,
            volume: 0.45,
            duration: 1500
        });

        // If coming from restart, do NOT increase difficulty
        if (!this.selectedDifficulty && data.reset !== true) {
            this.difficultyIndex =
                (this.difficultyIndex + 1) % this.difficultyOrder.length;
        }

        let graph;
        let attempts = 0;
        const MAX_ATTEMPTS = 200;

        console.log("📌 Calling RandomGraphGenerator with:", difficulty, this.mode);

        while (attempts < MAX_ATTEMPTS) {
            // Generate graph based on difficulty
            if (difficulty === "easy") {
                // Easy: Must be Eulerian circuit and planar
                graph = RandomGraphGenerator.generate(
                    config.nodes, 
                    "circuit", 
                    config.edges,
                    true  // mustBePlanar flag
                );
            } else if (difficulty === "medium") {
                // Medium: Can be Eulerian or not, with 2-3 non-planar edges
                const useEulerian = Phaser.Math.Between(0, 1) === 0;
                const mode = useEulerian ? Phaser.Math.RND.pick(["path", "circuit"]) : "none";
                
                graph = RandomGraphGenerator.generate(
                    config.nodes,
                    mode,
                    config.edges,
                    false  // not necessarily planar
                );
            } else { // hard
                // Hard: Can be anything
                const mode = Phaser.Math.RND.pick(["path", "circuit", "none"]);
                graph = RandomGraphGenerator.generate(
                    config.nodes,
                    mode,
                    config.edges,
                    false  // planar or not
                );
            }
            
            attempts++;
            
            // Check all conditions
            const isPlanar = PlanarityChecker.isPlanar(graph);
            const nonPlanarEdges = PlanarityChecker.countNonPlanarEdges(graph);
            
            // Check Eulerian properties using the existing analyze() method
            const eulerianType = EulerianChecker.analyze(graph);
            let eulerianValid = true;
            
            if (difficulty === "easy") {
                eulerianValid = eulerianType === "circuit"; // Must be circuit for easy
            }
            // For medium/hard, we accept any type (including "none")
            
            // Check planarity - FIXED LOGIC
            let planarityValid = true;
            if (difficulty === "easy") {
                planarityValid = isPlanar;
            }
            // For medium and hard, don't enforce specific non-planar edge count
            // Just ensure they're not too extreme
            if (difficulty === "medium" && nonPlanarEdges > 8) {
                planarityValid = false; // Too many non-planar edges
            }

            // For hard, any planarity is fine
            
            // Check if graph is solvable (only for Eulerian graphs)
            let solvable = true;
            if (eulerianType === "path" || eulerianType === "circuit") {
                const solution = HierholzerSolver.solve(graph);
                solvable = solution && solution.length === graph.edges.length + 1;
            }
            // Non-Eulerian graphs (type "none") are always considered "solvable"
            
            console.log(`Attempt ${attempts}: Type=${eulerianType}, Planar=${isPlanar} (${nonPlanarEdges} non-planar edges), Solvable=${solvable}`);
            
            // Add a safety break - if we're taking too long, accept a less perfect graph
            if (attempts > 50) {
                console.warn("⚠ Taking too long, accepting any valid graph");
                if (eulerianValid && solvable) {
                    console.log(`✅ Accepted compromise ${difficulty} graph after ${attempts} tries`);
                    break;
                }
            }
            
            if (attempts > MAX_ATTEMPTS - 10) {
                console.warn("⚠ Running out of attempts, relaxing constraints");
                // Relax constraints for last few attempts
                if (eulerianValid) {
                    console.log(`✅ Accepted relaxed ${difficulty} graph`);
                    break;
                }
            }
            
            // Check all conditions
            if (eulerianValid && planarityValid && solvable) {
                console.log(`✅ Found valid ${difficulty} graph!`);
                break;
            }
        }

        // Fallback if all attempts failed
        if (!graph || attempts >= MAX_ATTEMPTS) {
            console.warn(`⚠ Failed to generate '${difficulty}' after ${attempts} attempts. Using fallback.`);
            
            // Simple fallback graph
            graph = new Graph();
            const nodeCount = difficulty === "easy" ? 5 : difficulty === "medium" ? 7 : 9;
            
            for (let i = 0; i < nodeCount; i++) {
                graph.addNode(`Node${i}`);
            }
            
            // Create a simple path
            for (let i = 0; i < nodeCount - 1; i++) {
                graph.addEdge(`Node${i}`, `Node${i + 1}`);
            }
            
            // Add a few extra edges
            const extraEdges = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 4;
            for (let i = 0; i < extraEdges; i++) {
                const a = Math.floor(Math.random() * nodeCount);
                const b = Math.floor(Math.random() * nodeCount);
                if (a !== b) {
                    graph.addEdge(`Node${a}`, `Node${b}`);
                }
            }
        }

        // Fallback if all attempts failed
        if (!graph) {
            console.warn(`⚠ Failed generating '${difficulty}'. Falling back to EASY.`);
            graph = RandomGraphGenerator.generate(5, eulerMode);
            if (!this.selectedDifficulty) {
                this.difficultyIndex = 0;
            }
        }

        // Safety fallback to prevent freeze
        if (attempts >= MAX_ATTEMPTS) {
            console.warn(`⚠ Failed to generate a valid "${difficulty}" graph after ${attempts} tries. Falling back to EASY.`);
            graph = RandomGraphGenerator.generate(5, eulerMode);
            if (!this.selectedDifficulty) {
                this.difficultyIndex = 0;
            }
        }

        console.log(`✨ Graph successfully generated on difficulty: ${difficulty} after ${attempts} tries.`);

        // Reset stored solution for the new puzzle
        this.solution = null;

        //----------------------------------------------------------
        // DRAW GRAPH (edges first, then nodes)
        //----------------------------------------------------------
        // Create graphics layer once
        this.graphics = this.add.graphics();
        this.graphics.clear();

        this.nodePositions = this.generateNodePositions(graph);

        this.graphics = this.add.graphics();
        this.graphics.clear();

        graph.edges.forEach(edge => {
            const posA = this.nodePositions[edge.a];
            const posB = this.nodePositions[edge.b];

            this.graphics.lineStyle(6, 0xffffff, 0.9);
            this.graphics.beginPath();
            this.graphics.moveTo(posA.x, posA.y);
            this.graphics.lineTo(posB.x, posB.y);
            this.graphics.strokePath();
        });

        this.graph = graph;

        console.log(`✨ Graph successfully generated:`, graph);

        // Ensure fresh sprite storage
        this.nodeSprites = {};

        graph.getNodes().forEach(node => {
            const { x, y } = this.nodePositions[node];

            // Pick a random mushroom image
            const mushKey = Phaser.Utils.Array.GetRandom(this.mushroomImages);

            const sprite = this.add.image(x, y, mushKey)
                .setScale(0.04) // adjust as needed
                .setInteractive({ useHandCursor: true })
                .setData("node", node);

            this.nodeSprites[node] = sprite;
        });

        this.currentNode = this.getStartingNode();
        const pos = this.nodePositions[this.currentNode];

        this.fairy = this.add.image(pos.x, pos.y, "fairy")
            .setScale(0.03)
            .setDepth(10);

        this.fairyFloatTween = this.tweens.add({
            targets: this.fairy,
            y: this.fairy.y + 12,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut"
        });

        this.fairy.preFX.addGlow(0xffc9ff, 0.5, 0.8, false);

        this.createUI();

        this.input.on("gameobjectdown", (pointer, obj) => {
            const clickedNode = obj.getData("node");
            
            if (!clickedNode) return;
            
            // If no current node is set (first click), set starting position
            if (this.currentNode === null) {
                this.currentNode = clickedNode;
                this.highlightNode(clickedNode);
                this.highlightPossibleMoves();
                console.log("Starting at:", clickedNode);
                
                // If starting node has no legal moves, show popup
                if (!this.nodeHasLegalMoves(this.currentNode)) {
                    this.time.delayedCall(150, () => this.showNoMovePopup());
                }
            } 
            // Otherwise, try to move to the clicked node
            else if (this.canMoveTo(clickedNode)) {
                this.moveTo(clickedNode);
            } else {
                console.log("❌ Invalid move:", this.currentNode, "→", clickedNode);
            }
        });
    }

    checkIfNewHighScore(score) {
    const difficulty = this.currentDifficulty || "easy";
    const key = `magicCircleScores_${difficulty}`;

    const scores = JSON.parse(localStorage.getItem(key) || "[]");

    if (scores.length === 0) return true; // first ever score
    return score > scores[0]; // scores are sorted DESC
    }

    loadCustomGraph(customGraph) {
        console.log("📌 Loading CUSTOM GRAPH");

        this.isCustomMode = true;

        this.graph = new Graph();

        // build nodes
        customGraph.nodes.forEach(n => {
            this.graph.addNode(n.name);
        });

        // build edges
        customGraph.edges.forEach(e => {
            this.graph.addEdge(e.a, e.b);
        });

        this.graph.edges.forEach(e => {
            e.used = false;
        });

        // store positions
        this.nodePositions = {};
        customGraph.nodes.forEach(n => {
            this.nodePositions[n.name] = { x: n.x, y: n.y };
        });

        // draw graph
        this.graphics = this.add.graphics();
        this.graphics.clear();

        // Draw only UNUSED edges initially
        this.graph.edges.forEach(edge => {  // ✅ CORRECTED
            const posA = this.nodePositions[edge.a];
            const posB = this.nodePositions[edge.b];
            
            this.graphics.lineStyle(6, 0xffffff, 0.9);
            this.graphics.beginPath();
            this.graphics.moveTo(posA.x, posA.y);
            this.graphics.lineTo(posB.x, posB.y);
            this.graphics.strokePath();
        });

        // Create node sprites
        this.nodeSprites = {};
        customGraph.nodes.forEach(n => {
            const sprite = this.add.image(n.x, n.y, n.spriteKey)
                .setScale(0.04)
                .setDepth(10)
                .setInteractive({ useHandCursor: true })
                .setData("node", n.name);
            
            this.nodeSprites[n.name] = sprite;
        });

        // place fairy
        this.currentNode = this.getStartingNode(); 
        const pos = this.nodePositions[this.currentNode];
        this.fairy = this.add.image(pos.x, pos.y, "fairy")
            .setScale(0.03)
            .setDepth(20);

        this.fairyFloatTween = this.tweens.add({
            targets: this.fairy,
            y: pos.y + 12,
            duration: 1200,
            yoyo: true,
            repeat: -1
        });

        this.createUI();
        this.redrawGraph();
        this.highlightPossibleMoves();
        
        // SET UP INPUT HANDLER FOR CUSTOM GRAPH
        this.input.off("gameobjectdown");
        this.setupGameInput();
    }

    setupGameInput() {
        this.input.on("gameobjectdown", (pointer, obj) => {
            const clickedNode = obj.getData("node");
            
            if (!clickedNode) return;
            
            // If no current node is set (first click), set starting position
            if (this.currentNode === null) {
                this.currentNode = clickedNode;
                this.highlightNode(clickedNode);
                this.highlightPossibleMoves();
                console.log("Starting at:", clickedNode);
                
                // If starting node has no legal moves, show popup
                if (!this.nodeHasLegalMoves(this.currentNode)) {
                    this.time.delayedCall(150, () => this.showNoMovePopup());
                }
            } 
            // Otherwise, try to move to the clicked node
            else if (this.canMoveTo(clickedNode)) {
                this.moveTo(clickedNode);
            } else {
                console.log("❌ Invalid move:", this.currentNode, "→", clickedNode);
            }
        });
    }

    createUI() {
        const UI_DEPTH = 1000;

        // ==========================================================
        // MENU ICON BUTTON (top-right corner)
        // ==========================================================

        const menuBtn = this.add.image(this.scale.width - 60, 60, "menuIcon")
            .setInteractive({ useHandCursor: true })
            .setScale(0.15);

        // Hover animation
        menuBtn.on("pointerover", () => {
            this.tweens.add({ targets: menuBtn, scale: 0.20, duration: 150 });
        });

        menuBtn.on("pointerout", () => {
            this.tweens.add({ targets: menuBtn, scale: 0.15, duration: 150 });
        });

        // ==========================================================
        // CREATE HIDDEN MENU CONTAINER
        // ==========================================================

        this.menuContainer = this.add.container(
            this.scale.width / 2,
            this.scale.height / 2
        ).setVisible(false);

        // Background panel
        const bgPanel = this.add.rectangle(0, 0, 420, 500, 0x000000, 0.55)
            .setStrokeStyle(4, 0xffffff);
        bgPanel.setInteractive();

        // Title
        const title = this.add.image(0, -190, "menuTitle").setScale(0.25);

        // ==========================================================
        // BUTTON BLUEPRINT
        // ==========================================================

        const buttonData = [
            { key: "menuContinue", action: "continue" },
            { key: "menuRestart", action: "restart" },
            { key: "menuSettings", action: "settings" },
            { key: "menuExit", action: "exit" }
        ];

        // Adjustable button spacing
        const baseY = -80;
        const spacing = 95;

        // Store created buttons if needed later
        const createdButtons = [];

        // ==========================================================
        // CREATE BUTTONS WITH SPACING LOOP
        // ==========================================================

        buttonData.forEach((btn, index) => {

            const y = baseY + index * spacing;

            const sprite = this.add.image(0, y, btn.key)
                .setScale(0.20)
                .setInteractive({ useHandCursor: true });

            // Hover animation
            sprite.on("pointerover", () => {
                this.tweens.add({
                    targets: sprite,
                    scale: 0.25,
                    duration: 150
                });
            });

            sprite.on("pointerout", () => {
                this.tweens.add({
                    targets: sprite,
                    scale: 0.20,
                    duration: 150
                });
            });

            // Assign actions
            sprite.on("pointerdown", () => {
                switch (btn.action) {
                    case "continue":
                        this.toggleMenu(false);
                        break;

                    case "restart":
                        this.fadeOutAudio(() => this.scene.restart({ mode: this.mode, reset: true }));
                        this.solution = null;
                        break;

                    case "settings":
                        console.log("⚙ Settings coming soon!");
                        break;

                    case "exit":
                        if (this.mode === "timed") {
                            const isNewHigh = this.saveScore(this.score);
                            // optional: you can later show a small toast if you want
                        }
                        this.fadeOutAudio(() => this.scene.start("MenuScene"));
                        break;

                }
            });

            createdButtons.push(sprite);
        });

        // Add everything into container
        this.menuContainer.add([
            bgPanel,
            title,
            ...createdButtons
        ]);

        // ==========================================================
        // TOGGLE MENU ON ICON CLICK
        // ==========================================================
        menuBtn.on("pointerdown", () => {
            this.toggleMenu(!this.menuContainer.visible);
        });

        // ==========================================================
        // GAMEPLAY BUTTONS (Hint + Auto Solve) Using Custom Images
        // ==========================================================

        const buttonScale = 0.12;
        const buttonHoverScale = 0.13;

        const startX = 95;
        const startY = this.scale.height - 140;
        const gap = 70;

        // HINT BUTTON
        const hintImg = this.add.image(startX, startY, "hintButton")
            .setScale(buttonScale)
            .setInteractive({ useHandCursor: true })
            .setDepth(100);

        // Hover effect
        hintImg.on("pointerover", () => {
            this.tweens.add({ targets: hintImg, scale: buttonHoverScale, duration: 120 });
        });
        hintImg.on("pointerout", () => {
            this.tweens.add({ targets: hintImg, scale: buttonScale, duration: 120 });
        });

        // Click action
        hintImg.on("pointerdown", () => {
            this.tweens.add({
                targets: hintImg,
                scale: buttonHoverScale,
                duration: 80,
                yoyo: true,
                onComplete: () => this.useHint()
            });
        });


        // AUTO SOLVE BUTTON
        const solveImg = this.add.image(startX, startY + gap, "AiSolverButton")
            .setScale(buttonScale)
            .setInteractive({ useHandCursor: true })
            .setDepth(100);

        // Hover effect
        solveImg.on("pointerover", () => {
            this.tweens.add({ targets: solveImg, scale: buttonHoverScale, duration: 120 });
        });
        solveImg.on("pointerout", () => {
            this.tweens.add({ targets: solveImg, scale: buttonScale, duration: 120 });
        });

        // Click action
        solveImg.on("pointerdown", () => {
            this.tweens.add({
                targets: solveImg,
                scale: buttonHoverScale,
                duration: 80,
                yoyo: true,
                onComplete: () => this.autoSolve()
            });
        });

        // Save references if needed later
        this.hintButton = hintImg;
        this.solveButton = solveImg;

        // Start timer if timed mode
        if (this.mode === "timed") {
            this.timer = this.time.addEvent({
                delay: 1000,
                loop: true,
                callback: () => {
                    this.timeLeft--;
                    this.timerText.setText(`Time: ${this.timeLeft}s`);

                    // Flash warning under 10 seconds
                    if (this.timeLeft <= 10) {
                        this.timerText.setTint(0xff5555);
                        this.timerText.setScale(1.15);
                    }

                    if (this.timeLeft <= 0) {
                        this.timer.remove();
                        this.showFailPopup();
                    }
                }
            });
        }
    }
}
