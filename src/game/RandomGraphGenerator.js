import Graph from "./Graph.js";
import EulerianChecker from "./EulerianChecker.js";

export default class RandomGraphGenerator {

    // Method to support the new difficulty requirements
    static generate(nodeCount, mode = "path", targetEdges = null, mustBePlanar = false) {

        let graph;
        let attempts = 0;
        const MAX_ATTEMPTS = 150;

        do {
            attempts++;

            // Generate graph based on requirements
            if (mode === "none") {
                // For non-Eulerian graphs (hard/medium mode)
                graph = this.generateRandomConnectedGraph(nodeCount, targetEdges);
            } else {
                // For Eulerian graphs (easy mode requires circuit)
                graph = this.buildGraph(nodeCount, mode);
                
                // targetEdges: try to force approximate number of edges
                if (targetEdges && graph.edges.length < targetEdges) {
                    this.addRandomEdges(graph, targetEdges - graph.edges.length);
                }
                
                // Adjust for Eulerian rules
                this.adjustForMode(graph, mode);
            }

            // Check if graph is valid according to mode
            let isValid = true;
            if (mode !== "none") {
                isValid = EulerianChecker.isValid(graph, mode);
            }
            
            // For "any" mode, we accept any graph
            if (mode === "any") {
                isValid = true;
            }

            if (isValid) break;

        } while (attempts < MAX_ATTEMPTS);

        if (attempts >= MAX_ATTEMPTS) {
            console.warn(`⚠ Failed generating valid puzzle, fallback to ${nodeCount} nodes`);
            graph = this.generateRandomConnectedGraph(nodeCount, targetEdges || nodeCount * 1.5);
        }

        return graph;
    }

    // -----------------------------------------------------
    // Generate random connected graph (for non-Eulerian cases)
    // -----------------------------------------------------
    static generateRandomConnectedGraph(nodeCount, targetEdges) {
        const graph = new Graph();
        const nodes = [];

        // Create nodes
        for (let i = 0; i < nodeCount; i++) {
            const name = `Node${i}`;
            nodes.push(name);
            graph.addNode(name);
        }

        // Ensure connected graph (spanning chain)
        for (let i = 0; i < nodes.length - 1; i++) {
            graph.addEdge(nodes[i], nodes[i + 1]);
        }

        // Add remaining edges up to target
        const currentEdges = graph.edges.length;
        const edgesNeeded = targetEdges ? Math.max(0, targetEdges - currentEdges) : 
                                         Phaser.Math.Between(nodeCount, nodeCount * 2);
        
        for (let i = 0; i < edgesNeeded; i++) {
            const a = Phaser.Utils.Array.GetRandom(nodes);
            const b = Phaser.Utils.Array.GetRandom(nodes);

            if (a !== b && !graph.hasEdge(a, b)) {
                graph.addEdge(a, b);
            }
        }

        return graph;
    }

    // -----------------------------------------------------
    // Build a random connected graph with Eulerian properties
    // -----------------------------------------------------
    static buildGraph(nodeCount, mode) {
        const graph = new Graph();
        const nodes = [];

        // Create nodes
        for (let i = 0; i < nodeCount; i++) {
            const name = `Node${i}`;
            nodes.push(name);
            graph.addNode(name);
        }

        // Ensure connected graph (spanning chain)
        for (let i = 0; i < nodes.length - 1; i++) {
            graph.addEdge(nodes[i], nodes[i + 1]);
        }

        // Add random edges - but ensure we don't create too many for planarity
        // For easy mode (must be planar), limit edges
        const maxEdgesForPlanar = (3 * nodeCount) - 6;
        const extraEdges = mode === "circuit" ? 
            Phaser.Math.Between(nodeCount, Math.min(nodeCount * 2, maxEdgesForPlanar)) :
            Phaser.Math.Between(nodeCount, nodeCount * 2);
            
        for (let i = 0; i < extraEdges; i++) {
            const a = Phaser.Utils.Array.GetRandom(nodes);
            const b = Phaser.Utils.Array.GetRandom(nodes);

            if (a !== b && !graph.hasEdge(a, b)) {
                graph.addEdge(a, b);
            }
        }

        return graph;
    }

    // Add additional edges if needed for targetEdges
    static addRandomEdges(graph, extraNeeded) {
        const nodes = graph.getNodes();
        
        let added = 0;
        let attempts = 0;
        
        while (added < extraNeeded && attempts < 100) {
            attempts++;
            const a = Phaser.Utils.Array.GetRandom(nodes);
            const b = Phaser.Utils.Array.GetRandom(nodes);
            
            if (a !== b && !graph.hasEdge(a, b)) {
                graph.addEdge(a, b);
                added++;
            }
        }
    }

    // -----------------------------------------------------
    // Ensure Euler Path / Circuit degree rules
    // -----------------------------------------------------
    static adjustForMode(graph, mode) {
        const nodes = graph.getNodes();

        let safety = 0;
        while (safety < 200) {
            safety++;

            const odd = nodes.filter(n => graph.getDegree(n) % 2 !== 0);

            if (mode === "circuit" && odd.length === 0) return;
            if (mode === "path" && odd.length === 2) return;

            // Balance degrees - add edge between random nodes
            const a = Phaser.Utils.Array.GetRandom(nodes);
            const b = Phaser.Utils.Array.GetRandom(nodes);

            if (a !== b && !graph.hasEdge(a, b)) {
                graph.addEdge(a, b);
            }
        }

        console.warn("⚠ adjustForMode exited to avoid infinite loop.");
    }
    
    // -----------------------------------------------------
    //  Force non-planar edges for medium mode
    // -----------------------------------------------------
    static addNonPlanarEdges(graph, count) {
        const nodes = graph.getNodes();
        
        for (let i = 0; i < count; i++) {
            // Try to create edges that would likely make the graph non-planar
            // One approach: create edges between already well-connected nodes
            const sortedNodes = nodes.sort((a, b) => graph.getDegree(b) - graph.getDegree(a));
            const highlyConnected = sortedNodes.slice(0, Math.min(5, sortedNodes.length));
            
            if (highlyConnected.length >= 2) {
                const a = Phaser.Utils.Array.GetRandom(highlyConnected);
                let b;
                do {
                    b = Phaser.Utils.Array.GetRandom(highlyConnected);
                } while (a === b || graph.hasEdge(a, b));
                
                if (a !== b) {
                    graph.addEdge(a, b);
                }
            }
        }
    }
}