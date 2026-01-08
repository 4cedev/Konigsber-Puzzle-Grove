import EulerianChecker from "../game/EulerianChecker.js";
        
export default class BuilderScene extends Phaser.Scene {
    constructor() {
        super("BuilderScene");

        this.nodes = [];
        this.edges = [];
        this.history = [];

        this.pendingNode = null;      // for connect mode
        this.isDragging = false;
        this.buildMode = "addNode";   // "addNode" | "connect"

        this.mushrooms = ["mush1", "mush2", "mush3", "mush4", "mush5", "mush6", "mush7"];
    }

    create() {
        console.log("🛠 BuilderScene Loaded");

        // Background
        this.add.image(this.scale.width / 2, this.scale.height / 2, "bg")
            .setDepth(-5)
            .setScale(Math.max(this.scale.width / 1280, this.scale.height / 720));

        this.graphics = this.add.graphics();

        this.createUI();
        this.setupInput();
    }

    // -----------------------------------------------------
    // INPUT HANDLING (CLEAN + RELIABLE)
    // -----------------------------------------------------
    setupInput() {

        // Begin drag
        this.input.on("dragstart", (_, obj) => {
            if (this.buildMode === "connect") return; // 🔒 lock dragging
            const node = obj.getData("node");
            if (!node) return;
            this.isDragging = true;
        });

        // Dragging nodes
        this.input.on("drag", (_, obj, dragX, dragY) => {
            if (this.buildMode === "connect") return;
            const node = obj.getData("node");
            if (!node) return;

            node.x = dragX;
            node.y = dragY;
            obj.x = dragX;
            obj.y = dragY;
            this.redraw();
        });

        // End drag
        this.input.on("dragend", () => {
            this.isDragging = false;
        });

        // CLICK – ADD NODE ON EMPTY SPACE
        this.input.on("pointerdown", pointer => {

            // Ignore UI panel
            if (pointer.x < 180) return;

            // Right-click does nothing
            if (pointer.rightButtonDown()) return;

            // Don't add new node if dragging
            if (this.isDragging) return;

            // IMPORTANT:
            // Only add node if you clicked empty canvas (NOT a sprite image)
            if (pointer.downElement?.nodeName !== "CANVAS") return;

            // Only add node in addNode mode
            if (this.buildMode === "addNode") {
                this.addNode(pointer.x, pointer.y);
            }
        });

        // NODE CLICK – CONNECT OR DELETE
        this.input.on("gameobjectdown", (pointer, obj) => {
            const node = obj.getData("node");
            if (!node) return;

            if (pointer.rightButtonDown()) {   // delete
                this.deleteNode(node);
                return;
            }

            if (this.isDragging) return;

            if (this.buildMode === "connect") {
                this.handleNodeClick(node);
            }
        });
    }

    // -----------------------------------------------------
    // UI PANEL
    // -----------------------------------------------------
    createUI() {
        const panel = this.add.rectangle(0, 0, 180, this.scale.height, 0x000000, 0.45)
            .setOrigin(0).setDepth(5);

        this.addButton(90, 70, "Add Node", () => {
            this.buildMode = "addNode";
            this.pendingNode = null;
        });

        this.addButton(90, 140, "Connect Node", () => {
            this.buildMode = "connect";
            this.pendingNode = null;

            // clear all node highlights
            this.nodes.forEach(n => n.sprite.clearTint());
        });

        this.addButton(90, 220, "Undo", () => this.undo());
        this.addButton(90, 290, "Clear", () => this.clearAll());

        this.addButton(90, 360, "Play", () => {
            if (this.nodes.length < 2) return;
            if (!this.isGraphEulerian()) {
                alert("Graph is not Eulerian.\nFix odd-degree nodes.");
                return;
            }
            this.startGameWithCustomGraph();
        });

        this.addButton(90, 430, "Exit", () => this.scene.start("MenuScene"));
    }

    addButton(x, y, label, callback) {
        const btn = this.add.rectangle(x, y, 150, 46, 0xffffff, 0.18)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        this.add.text(x, y, label, {
            fontSize: "20px",
            color: "#ffffff"
        }).setOrigin(0.5).setDepth(11);

        btn.on("pointerover", () => btn.setFillStyle(0xffffff, 0.35));
        btn.on("pointerout", () => btn.setFillStyle(0xffffff, 0.18));
        btn.on("pointerdown", callback);
    }

    // -----------------------------------------------------
    // ADD NODE
    // -----------------------------------------------------
    addNode(x, y) {
        const name = "Node" + (this.nodes.length + 1);
        const skin = Phaser.Utils.Array.GetRandom(this.mushrooms);

        const sprite = this.add.image(x, y, skin)
            .setScale(0.05)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        const node = { name, x, y, spriteKey: skin, sprite };
        this.nodes.push(node);

        sprite.setData("node", node);
        this.input.setDraggable(sprite);

        this.history.push({ type: "addNode", node });
        this.redraw();
    }

    // -----------------------------------------------------
    // CONNECT NODES
    // -----------------------------------------------------
    handleNodeClick(node) {
        if (!this.pendingNode) {
            this.pendingNode = node;
            node.sprite.setTint(0x00aaff);
            return;
        }

        if (node === this.pendingNode) {
            node.sprite.clearTint();
            this.pendingNode = null;
            return;
        }

        this.addEdge(this.pendingNode, node);

        this.pendingNode.sprite.clearTint();
        node.sprite.clearTint();
        this.pendingNode = null;
    }

    addEdge(a, b) {
        if (this.edges.some(e =>
            (e.a === a.name && e.b === b.name) ||
            (e.a === b.name && e.b === a.name)
        )) return;

        const edge = { a: a.name, b: b.name };
        this.edges.push(edge);

        this.history.push({ type: "addEdge", edge });
        this.redraw();
    }

    // -----------------------------------------------------
    // DELETE NODE
    // -----------------------------------------------------
    deleteNode(node) {
        if (this.pendingNode === node) {
            this.pendingNode = null;
        }

        this.edges = this.edges.filter(e => e.a !== node && e.b !== node);
        node.sprite.destroy();
        this.nodes = this.nodes.filter(n => n !== node);
        this.redraw();
    }

    // -----------------------------------------------------
    // REDRAW GRAPH
    // -----------------------------------------------------
    redraw() {
        this.graphics.clear();
        this.graphics.lineStyle(6, 0xffffff, 0.9);

        this.edges.forEach(e => {
            const a = this.nodes.find(n => n.name === e.a);
            const b = this.nodes.find(n => n.name === e.b);
            if (!a || !b) return;

            this.graphics.beginPath();
            this.graphics.moveTo(a.x, a.y);
            this.graphics.lineTo(b.x, b.y);
            this.graphics.strokePath();
        });
    }

    // -----------------------------------------------------
    // UNDO / CLEAR
    // -----------------------------------------------------
    clearAll() {
        this.nodes.forEach(n => n.sprite.destroy());
        this.nodes = [];
        this.edges = [];
        this.pendingNode = null;
        this.history = [];
        this.redraw();
    }

    undo() {
        const last = this.history.pop();
        if (!last) return;

        if (last.type === "addNode") {
            this.deleteNode(last.node);
        }

        if (last.type === "addEdge") {
            this.edges = this.edges.filter(e => e !== last.edge);
            this.redraw();
        }
    }

    isGraphEulerian() {
        if (!this.isGraphConnected()) return false;

        const degrees = new Map();
        this.nodes.forEach(n => degrees.set(n.name, 0));

        this.edges.forEach(e => {
            degrees.set(e.a, degrees.get(e.a) + 1);
            degrees.set(e.b, degrees.get(e.b) + 1);
        });

        let odd = 0;
        degrees.forEach(d => {
            if (d % 2 !== 0) odd++;
        });

        return odd === 0 || odd === 2;
    }

    // -----------------------------------------------------
    // EXPORT TO GAME MODE
    // -----------------------------------------------------
    exportGraph() {
        return {
            nodes: this.nodes.map(n => ({
                name: n.name,
                x: n.x,
                y: n.y,
                spriteKey: n.spriteKey
            })),
            edges: this.edges.map(e => ({
                a: e.a,   
                b: e.b
            }))
        };
    }

    startGameWithCustomGraph() {
        const custom = this.exportGraph();

        this.scene.start("GameScene", {
            mode: "custom",
            customGraph: custom
        });
    }

    isGraphConnected() {
        if (this.nodes.length === 0) return false;
        if (this.edges.length === 0) return false;

        const adj = new Map();
        this.nodes.forEach(n => adj.set(n.name, []));

        this.edges.forEach(e => {
            // e.a and e.b are already names
            adj.get(e.a)?.push(e.b);
            adj.get(e.b)?.push(e.a);
        });

        const startNode = this.nodes.find(n => adj.get(n.name).length > 0);
        if (!startNode) return false;

        const visited = new Set();
        const stack = [startNode.name];

        while (stack.length) {
            const curr = stack.pop();
            if (visited.has(curr)) continue;
            visited.add(curr);

            adj.get(curr).forEach(next => {
                if (!visited.has(next)) stack.push(next);
            });
        }

        return this.nodes.every(n =>
            adj.get(n.name).length === 0 || visited.has(n.name)
        );
    }
}
