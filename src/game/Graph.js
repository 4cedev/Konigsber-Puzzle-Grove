export default class Graph {
    constructor() {
        this.adjacency = new Map();  // Map<node, Array<connected nodes>>
        this.edges = [];  // Store edges explicitly for traversal and removal checks
    }

    // Create a new node (vertex)
    addNode(node) {
        if (!this.adjacency.has(node)) {
            this.adjacency.set(node, []);
        }
    }

    hasEdge(a, b) {
        return this.edges.some(
            e =>
                (e.a === a && e.b === b) ||
                (e.a === b && e.b === a)
        );
    }

    // Add a connection (bridge / edge) between two nodes
    addEdge(a, b) {
        if (a === b) return; // prevent self-loops

        if (!this.adjacency.has(a)) this.addNode(a);
        if (!this.adjacency.has(b)) this.addNode(b);

        // Prevent duplicate / parallel edges
        if (this.hasEdge(a, b)) {
            return;
        }

        this.adjacency.get(a).push(b);
        this.adjacency.get(b).push(a);

        this.edges.push({ a, b, used: false });
    }

    // Get neighbors of a node
    getNeighbors(node) {
        return this.adjacency.get(node) || [];
    }

    // Count degree of a node (how many bridges connect to it)
    getDegree(node) {
        return this.adjacency.get(node)?.length || 0;
    }

    // Reset all edges (used when restarting)
    resetEdges() {
        this.edges.forEach(edge => (edge.used = false));
    }

    // Mark an edge as used after crossing
    useEdge(a, b) {
        const edge = this.edges.find(
            e =>
                !e.used &&
                (
                    (e.a === a && e.b === b) ||
                    (e.a === b && e.b === a)
                )
        );

        if (!edge) {
            return false; // no unused edge found between these two
        }

        edge.used = true;
        return true;
    }

    // Check if all edges are used (win condition)
    allEdgesUsed() {
        return this.edges.every(e => e.used);
    }

    // Deep clone (used by solving algorithm later)
    clone() {
        const newGraph = new Graph();
        this.edges.forEach(e => newGraph.addEdge(e.a, e.b));
        return newGraph;
    }

    // Returns all nodes
    getNodes() {
        return [...this.adjacency.keys()];
    }

    // Get the edge count
    getEdgeCount() {
        return this.edges.length;
    }
    
    // Check if graph is connected (for Eulerian path validity)
    isConnected() {
        const nodes = this.getNodes();
        if (nodes.length === 0) return true;
        
        const visited = new Set();
        const stack = [nodes[0]];
        
        while (stack.length > 0) {
            const current = stack.pop();
            if (visited.has(current)) continue;
            visited.add(current);
            
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    stack.push(neighbor);
                }
            }
        }
        
        return visited.size === nodes.length;
    }
}
