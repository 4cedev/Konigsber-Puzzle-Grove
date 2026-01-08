export default class EulerianChecker {
    
    static analyze(graph) {
        const nodes = graph.getNodes();
        if (nodes.length === 0) return "none";
        
        // Count odd-degree vertices
        let oddCount = 0;
        for (const node of nodes) {
            if (graph.getDegree(node) % 2 !== 0) {
                oddCount++;
            }
        }

        if (oddCount > 2) return "none";
        if (oddCount === 2) return "path";
        return "circuit";
    }

    /** returns true/false depending on mode */
    static isValid(graph, mode) {
        const result = EulerianChecker.analyze(graph);

        if (mode === "path") return result === "path" || result === "circuit";
        if (mode === "circuit") return result === "circuit";
        
        return false;
    }
}
