import { state } from './state.js';

/**
 * Modifie la directive d'orientation dans le code source Mermaid.
 * @param source : Code source Mermaid
 * @param direction : Nouvelle orientation (ex: TD, LR)
 * @returns Code source Mermaid mis à jour
 */
export const withDirection = (source, direction) => source.replace(/^graph\s+\w+/, `graph ${direction}`);

/**
 * Recherche un nœud dans le modèle par son identifiant.
 * @param id : Identifiant du nœud
 * @returns Le nœud trouvé ou undefined
 */
export const findNodeById = id => state.model.nodes.find(node => node.id === id);

/**
 * Nettoie et formate les balises de type d'un nœud pour un affichage textuel.
 * @param typeInfo : Chaîne d'information du type
 * @returns Chaîne nettoyée et formatée
 */
export const plainTypeInfo = typeInfo => typeInfo
    .split('<br/>')
    .map(part => part.replace(/<\/?small>/g, '').trim())
    .filter(Boolean)
    .join(' — ');

/**
 * Échappe le texte pour éviter l'injection HTML.
 * @param text : Texte brut à échapper
 * @returns Texte HTML sécurisé
 */
export const escapeHtml = text => {
    const container = document.createElement('div');
    container.textContent = text;
    return container.innerHTML;
};

/**
 * Retourne la liste des arêtes à prendre en compte selon la préférence d'héritage.
 * @returns Liste des arêtes effectives
 */
export const getEffectiveEdges = () => state.includeInheritedEdges 
    ? state.model.edges 
    : state.model.edges.filter(edge => !edge.inherited);

/**
 * Construit les cartes d'adjacence des connexions sortantes et entrantes.
 * @param edges : Liste des arêtes du graphe
 * @returns Cartes d'adjacence sortantes et entrantes
 */
export const buildAdjacency = edges => {
    const outgoing = new Map(), incoming = new Map();
    for (const { from, to } of edges) {
        if (!outgoing.has(from)) outgoing.set(from, []);
        outgoing.get(from).push(to);
        if (!incoming.has(to)) incoming.set(to, []);
        incoming.get(to).push(from);
    }
    return { outgoing, incoming };
};

/**
 * Collecte l'ensemble des nœuds atteignables depuis un nœud racine via la carte d'adjacence.
 * @param adjacency : Carte d'adjacence
 * @param startId : Identifiant du nœud de départ
 * @returns Ensemble des nœuds atteignables
 */
export const collectReachable = (adjacency, startId) => {
    const visited = new Set([startId]);
    const queue = [startId];
    while (queue.length > 0) {
        for (const next of adjacency.get(queue.shift()) ?? []) {
            if (visited.has(next)) continue;
            visited.add(next);
            queue.push(next);
        }
    }
    return visited;
};

/**
 * Calcule l'ensemble des nœuds composant le sous-graphe d'un nœud isolé (ancêtres et descendants).
 * @param edges : Liste des arêtes
 * @param nodeId : Identifiant du nœud racine de l'isolement
 * @returns Ensemble des identifiants des nœuds retenus
 */
export const computeSubgraphNodeSet = (edges, nodeId) => {
    const { outgoing, incoming } = buildAdjacency(edges);
    return new Set([...collectReachable(incoming, nodeId), ...collectReachable(outgoing, nodeId)]);
};

/**
 * Sépare les lignes du corps Mermaid entre déclarations de nœuds et liaisons d'arêtes.
 * @param {string} bodyText Texte du corps Mermaid
 * @returns {{ nodeLineById: Map<string, string>, edgeLines: string[] }}
 */
export const indexBodyLines = bodyText => bodyText.split('\n').reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed) return acc;
    
    const match = trimmed.match(/^(node_\d+)[(\[{>]/);
    
    if (match) {
        acc.nodeLineById.set(match[1], line);
    } else {
        acc.edgeLines.push(line);
    }
    
    return acc;
}, { nodeLineById: new Map(), edgeLines: [] });

/**
 * Génère le corps Mermaid ainsi que les arêtes et nœuds filtrés pour le rendu.
 * @param effectiveEdges : Liste des arêtes à considérer
 * @returns Structure du corps, des arêtes et des nœuds retenus
 */
export const buildRenderedBody = effectiveEdges => {
    const fullBody = state.includeInheritedEdges ? state.mermaidBody : state.mermaidBodySimplified;
    if (!state.isolatedNodeId) return { body: fullBody, edges: effectiveEdges, nodeIds: null };

    const nodeIds = computeSubgraphNodeSet(effectiveEdges, state.isolatedNodeId);
    const { nodeLineById, edgeLines } = indexBodyLines(fullBody);

    const nodeLines = state.model.nodes
        .filter(node => nodeIds.has(node.id))
        .map(node => nodeLineById.get(node.id))
        .filter(Boolean);

    const keptEdges = [], keptEdgeLines = [];
    effectiveEdges.forEach((edge, index) => {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) return;
        keptEdges.push(edge);
        keptEdgeLines.push(edgeLines[index]);
    });

    return { body: [...nodeLines, ...keptEdgeLines].join('\n'), edges: keptEdges, nodeIds };
};

/**
 * Recherche les chemins reliant les racines du graphe jusqu'au nœud cible.
 * @param edges : Liste des arêtes
 * @param targetNodeId : Identifiant du nœud cible
 * @returns Liste des chemins trouvés
 */
export const computePathsToNode = (edges, targetNodeId) => {
    const incomingIds = new Set(edges.map(e => e.to));
    const rootIds = state.model.nodes.map(n => n.id).filter(id => !incomingIds.has(id));

    const outgoingByNode = new Map();
    edges.forEach((edge, index) => {
        const list = outgoingByNode.get(edge.from) ?? [];
        list.push({ edge, index });
        outgoingByNode.set(edge.from, list);
    });

    const paths = [];
    const dfs = (nodeId, visited, nodePath, edgePath) => {
        if (paths.length >= 200) return;
        if (nodeId === targetNodeId) return paths.push({ nodeIds: [...nodePath], edgeIndices: [...edgePath] });

        for (const { edge, index } of outgoingByNode.get(nodeId) ?? []) {
            if (visited.has(edge.to)) continue;
            visited.add(edge.to);
            dfs(edge.to, visited, [...nodePath, edge.to], [...edgePath, index]);
            visited.delete(edge.to);
        }
    };

    rootIds.forEach(id => dfs(id, new Set([id]), [id], []));
    return paths;
};

/**
 * Formate un chemin donné sous forme d'une chaîne textuelle lisible.
 * @param edges : Liste des arêtes
 * @param path : Chemin contenant les nœuds et index d'arêtes
 * @returns Chaîne de caractères représentant le chemin
 */
export const pathToText = (edges, { nodeIds, edgeIndices }) => edgeIndices.reduce((text, edgeIdx, i) => {
    const toNode = findNodeById(nodeIds[i + 1]);
    const label = edges[edgeIdx]?.label ? ` (${edges[edgeIdx].label})` : '';
    return `${text} → ${toNode?.name ?? nodeIds[i + 1]}${label}`;
}, findNodeById(nodeIds[0])?.name ?? nodeIds[0]);