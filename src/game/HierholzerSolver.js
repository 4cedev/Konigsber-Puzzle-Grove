import EulerianChecker from "./EulerianChecker.js";

export default class HierholzerSolver {

    /**
     * Solves the graph and returns the traversal order as an array of nodes.
     * Returns null if no Eulerian path/circuit exists.
     */
    static solve(graph) {

        // Check if graph has an Eulerian solution at all
        const type = EulerianChecker.analyze(graph);
        if (type === "none") return null;

        // Clone graph to avoid modifying original during solving
        const workingGraph = graph.clone();
        const stack = [];
        const path = [];

        // Pick starting node
        let current = this.getStartingNode(workingGraph, type);

        stack.push(current);

        while (stack.length > 0) {
            current = stack[stack.length - 1];

            // Find an unused edge from current node
            const edge = this.getUnusedEdge(workingGraph, current);

            if (edge) {
                // Mark edge used and continue traversing
                workingGraph.useEdge(edge.a, edge.b);
                stack.push(edge.b === current ? edge.a : edge.b);
            } else {
                // No unused edges → add to final path
                path.push(stack.pop());
            }
        }

        return path.reverse(); // correct direction
    }

    // Choose starting node based on rules (path vs circuit)
    static getStartingNode(graph, type) {
        if (type === "circuit") {
            return graph.getNodes()[0];
        }

        // Eulerian Path → must start at odd-degree node
        for (let node of graph.getNodes()) {
            if (graph.getDegree(node) % 2 === 1) {
                return node;
            }
        }

        // fallback: first node
        return graph.getNodes()[0];
    }

    // Return an unused edge connected to a node
    static getUnusedEdge(graph, node) {
        return graph.edges.find(e =>
            !e.used && (e.a === node || e.b === node)
        );
    }
}
