export default class PlanarityChecker {
    // Kuratowski's theorem: A graph is planar if it doesn't contain K5 or K3,3 as a minor
    // For small graphs (up to 18 nodes), we can use a simplified check
    
    static isPlanar(graph) {
        const nodes = graph.getNodes();
        const edges = graph.edges;
        
        // For small graphs (≤ 18 nodes), use a simpler heuristic
        // Euler's formula: for a planar graph, e ≤ 3v - 6 (where v ≥ 3)
        if (nodes.length >= 3) {
            const maxEdges = (3 * nodes.length) - 6;
            if (edges.length > maxEdges) {
                return false;
            }
        }
        
        // Additional check for complete graph K5
        if (nodes.length >= 5) {
            // Check if any 5 nodes form a K5 (complete graph with 5 nodes, 10 edges)
            const nodeCombinations = this.getCombinations(nodes, 5);
            for (const combo of nodeCombinations) {
                let edgeCount = 0;
                for (const edge of edges) {
                    if (combo.includes(edge.a) && combo.includes(edge.b)) {
                        edgeCount++;
                    }
                }
                // K5 has 10 edges between 5 nodes
                if (edgeCount >= 10) return false;
            }
        }
        
        // Check for K3,3 (complete bipartite graph)
        if (nodes.length >= 6) {
            // Simple heuristic: look for dense bipartite subgraphs
            // This is a simplified check for small graphs
            const adjacency = {};
            nodes.forEach(n => adjacency[n] = []);
            edges.forEach(e => {
                adjacency[e.a].push(e.b);
                adjacency[e.b].push(e.a);
            });
            
            // Check for nodes with high degree that might form K3,3
            const highDegreeNodes = nodes.filter(n => adjacency[n].length >= 3);
            if (highDegreeNodes.length >= 6) {
                // More sophisticated check would be needed here
                // For now, we'll be conservative
                return edges.length <= (2 * nodes.length) - 4;
            }
        }
        
        return true;
    }
    
    static getCombinations(arr, k) {
        if (k > arr.length || k <= 0) return [];
        if (k === arr.length) return [arr];
        if (k === 1) return arr.map(item => [item]);
        
        const combinations = [];
        for (let i = 0; i <= arr.length - k; i++) {
            const head = arr.slice(i, i + 1);
            const tail = this.getCombinations(arr.slice(i + 1), k - 1);
            tail.forEach(t => combinations.push(head.concat(t)));
        }
        return combinations;
    }
    
    // Count non-planar crossings (simplified estimation)
    static countNonPlanarEdges(graph) {
        // This is a simplified check - real planarity testing is complex
        // For educational purposes, we'll use edge count as a proxy
        const nodes = graph.getNodes();
        if (nodes.length < 3) return 0;
        
        const maxPlanarEdges = (3 * nodes.length) - 6;
        const excessEdges = graph.edges.length - maxPlanarEdges;
        
        return Math.max(0, excessEdges);
    }
    
    // Alternative: Check if adding a specific edge would make the graph non-planar
    static wouldBeNonPlanar(graph, nodeA, nodeB) {
        // Create a temporary graph with the new edge
        const tempGraph = new Graph();
        graph.getNodes().forEach(n => tempGraph.addNode(n));
        graph.edges.forEach(e => tempGraph.addEdge(e.a, e.b));
        tempGraph.addEdge(nodeA, nodeB);
        
        return !this.isPlanar(tempGraph);
    }
}

// Need to import Graph class if it's in a separate file
import Graph from "./Graph.js";