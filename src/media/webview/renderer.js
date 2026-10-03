import { state } from './state.js';
import { applyTransform } from './zoom.js';
import { 
    withDirection, 
    findNodeById, 
    getEffectiveEdges, 
    buildRenderedBody, 
    computePathsToNode 
} from './graphUtils.js';
import { renderPreviewDetails, renderPreviewPlaceholder } from './preview.js';

const HIGHLIGHT_COLOR = '#ffca28';
const SELECTED_COLOR = '#ffffff';

let renderToken = 0;

/**
 * Génère les directives 'click' de Mermaid pour associer le clic JavaScript aux nœuds.
 * @param visibleNodeIds : Ensemble des identifiants de nœuds actuellement visibles
 * @returns Chaîne contenant les directives de clic
 */
const buildClickDirectives = visibleNodeIds => {
    const nodes = visibleNodeIds ? state.model.nodes.filter(n => visibleNodeIds.has(n.id)) : state.model.nodes;
    return nodes.map(n => `    click ${n.id} call onNodeClicked("${n.id}")`).join('\n');
};

/**
 * Génère les directives Mermaid d'application de style pour la mise en surbrillance.
 * @param paths : Chemins à mettre en valeur
 * @returns Directives de styles sous forme de texte Mermaid
 */
const buildHighlightDirectives = paths => {
    const hlNodes = new Set(paths.flatMap(p => p.nodeIds));
    const hlEdges = new Set(paths.flatMap(p => p.edgeIndices));
    hlNodes.delete(state.selectedNodeId);

    return [
        ...Array.from(hlNodes).map(id => `    style ${id} stroke:${HIGHLIGHT_COLOR},stroke-width:3px;`),
        ...Array.from(hlEdges).map(idx => `    linkStyle ${idx} stroke:${HIGHLIGHT_COLOR},stroke-width:3px;`),
        `    style ${state.selectedNodeId} stroke:${SELECTED_COLOR},stroke-width:4px;`
    ].join('\n');
};

/**
 * Génère le rendu SVG du graphe via l'API Mermaid et met à jour le DOM.
 * @param graphEl : Élément DOM conteneur du SVG Mermaid
 * @param previewEl : Élément DOM du panneau de prévisualisation
 */
export const renderGraph = async (graphEl, previewEl) => {
    if (!state.mermaidHeader) return;

    if (state.isolatedNodeId && !findNodeById(state.isolatedNodeId)) {
        state.isolatedNodeId = null;
    }

    const currentToken = ++renderToken;
    const effectiveEdges = getEffectiveEdges();
    const { body, edges: visibleEdges, nodeIds: visibleNodeIds } = buildRenderedBody(effectiveEdges);

    let sourceToRender = `${withDirection(state.mermaidHeader, state.direction)}\n${body}\n${buildClickDirectives(visibleNodeIds)}`;

    if (state.selectedNodeId && visibleNodeIds && !visibleNodeIds.has(state.selectedNodeId)) {
        state.selectedNodeId = null;
    }

    if (state.selectedNodeId && findNodeById(state.selectedNodeId)) {
        const paths = computePathsToNode(visibleEdges, state.selectedNodeId);
        sourceToRender += `\n${buildHighlightDirectives(paths)}`;
        renderPreviewDetails(previewEl, visibleEdges, state.selectedNodeId, paths, () => renderGraph(graphEl, previewEl));
    } else {
        state.selectedNodeId = null;
        renderPreviewPlaceholder(previewEl, () => renderGraph(graphEl, previewEl));
    }

    try {
        console.log(sourceToRender);
        const { svg, bindFunctions } = await mermaid.render(`mermaidSvg_${currentToken}`, sourceToRender);
        if (currentToken !== renderToken) return;

        graphEl.innerHTML = svg;
        bindFunctions?.(graphEl);
        applyTransform(graphEl);
    } catch (error) {
        if (currentToken === renderToken) console.warn('Erreur lors du rendu du schéma Mermaid :', error);
    }
};