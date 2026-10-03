import { state, persistState } from './state.js';
import { findNodeById, plainTypeInfo, escapeHtml, pathToText } from './graphUtils.js';

/**
 * Réinitialise l'affichage du panneau de prévisualisation avec le message par défaut.
 * Permet d'afficher le nœud sur lequel le graphe est isolé et de quitter l'isolement.
 * @param {HTMLElement} previewContainer : Élément DOM du panneau de prévisualisation
 * @param {Function} [onStateChange] : Callback déclenché lors d'un changement d'état
 */
export const renderPreviewPlaceholder = (previewContainer, onStateChange) => {
    const isGraphIsolated = state.isolatedNodeId !== null;
    const isolatedNode = isGraphIsolated ? findNodeById(state.isolatedNodeId) : null;

    const isolatedInfoHtml = isolatedNode
        ? `<div class="preview-isolated-box">
            <span class="preview-isolated-label">Current isolated node :</span>
            <strong class="preview-isolated-name">${escapeHtml(isolatedNode.name)}</strong>
            <button id="resetIsolationPlaceholder" class="preview-reset-btn" title="Display the entire schema">Quit isolation</button>
           </div>`
        : '';

    previewContainer.innerHTML = `
        <div class="preview-placeholder-container">
            <p class="preview-placeholder">Click on a node in the graph to display its details.</p>
            ${isolatedInfoHtml}
        </div>
    `;

    if (isGraphIsolated) {
        document.getElementById('resetIsolationPlaceholder')?.addEventListener('click', () => {
            state.isolatedNodeId = null;
            persistState();
            onStateChange?.();
        });
    }
};

/**
 * Génère et affiche le contenu détaillé du nœud sélectionné dans le panneau de prévisualisation.
 * @param previewContainer : Élément DOM du panneau de prévisualisation
 * @param edges : Liste des arêtes effectives
 * @param nodeId : Identifiant du nœud sélectionné
 * @param paths : Liste des chemins menant au nœud
 * @param onStateChange : Callback déclenché lors d'un changement d'état (isoler / fermer / reset)
 */
export const renderPreviewDetails = (previewContainer, edges, nodeId, paths, onStateChange) => {
    const node = findNodeById(nodeId);
    if (!node) return renderPreviewPlaceholder(previewContainer, onStateChange);

    const isGraphIsolated = state.isolatedNodeId !== null;
    const isNodeIsolated = state.isolatedNodeId === nodeId;

    const pathsHtml = paths.length
        ? `<ul class="preview-paths">${paths.map(p => `<li>${escapeHtml(pathToText(edges, p))}</li>`).join('')}</ul>`
        : '<p class="preview-empty">No path found.</p>';

    // Construction dynamique des boutons d'action
    const isolateBtnHtml = !isNodeIsolated 
        ? `<button id="isolateNode" title="Display only the parents and children of this node">Isolate</button>` 
        : '';

    const resetIsolationBtnHtml = isGraphIsolated 
        ? `<button id="resetIsolation" title="Display the entire schema">Quit isolation</button>` 
        : '';

    previewContainer.innerHTML = `
        <div class="preview-header">
            <strong>${escapeHtml(node.name)}</strong>
            <div class="preview-header-actions">
                ${isolateBtnHtml}
                ${resetIsolationBtnHtml}
                <button id="closePreview" title="Close preview">✕</button>
            </div>
        </div>
        <p class="preview-type">${escapeHtml(plainTypeInfo(node.typeInfo))}</p>
        ${node.description ? `<p class="preview-description">${escapeHtml(node.description)}</p>` : ''}
        <div class="preview-section-title">Paths to this node (${paths.length})</div>
        ${pathsHtml}
    `;

    // Isoler le nœud courant
    document.getElementById('isolateNode')?.addEventListener('click', () => {
        state.isolatedNodeId = nodeId;
        persistState();
        onStateChange();
    });

    // Réafficher l'intégralité du graphe (retour à la normale)
    document.getElementById('resetIsolation')?.addEventListener('click', () => {
        state.isolatedNodeId = null;
        persistState();
        onStateChange();
    });

    // Fermer le panneau de prévisualisation
    document.getElementById('closePreview')?.addEventListener('click', () => {
        state.selectedNodeId = null;
        persistState();
        onStateChange();
    });
};