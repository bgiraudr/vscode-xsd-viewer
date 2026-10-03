import { state, persistState } from './state.js';
import { initZoomEvents, view } from './zoom.js';
import { renderGraph } from './renderer.js';

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });

const layoutSelect = document.getElementById('layoutSelect');
const includeInheritedToggle = document.getElementById('includeInheritedToggle');
const graphContainer = document.getElementById('graphContainer');
const graphEl = document.getElementById('graph');
const previewContent = document.getElementById('previewContent');

state.direction = state.direction || layoutSelect.value;
layoutSelect.value = state.direction;
includeInheritedToggle.checked = state.includeInheritedEdges;

initZoomEvents(
    graphContainer,
    graphEl,
    document.getElementById('zoomIn'),
    document.getElementById('zoomOut'),
    document.getElementById('zoomReset')
);

const triggerRender = () => renderGraph(graphEl, previewContent);

window.onNodeClicked = nodeId => {
    if (view.hasDragged) return (view.hasDragged = false);
    state.selectedNodeId = state.selectedNodeId === nodeId ? null : nodeId;
    persistState();
    triggerRender();
};

// Événements d'IHM
layoutSelect.addEventListener('change', e => {
    state.direction = e.target.value;
    persistState();
    triggerRender();
});

includeInheritedToggle.addEventListener('change', e => {
    state.includeInheritedEdges = e.target.checked;
    persistState();
    triggerRender();
});

window.addEventListener('message', ({ data }) => {
    if (data.type === 'update') {
        Object.assign(state, {
            mermaidHeader: data.mermaidHeader,
            mermaidBody: data.mermaidBody,
            mermaidBodySimplified: data.mermaidBodySimplified,
            model: data.model
        });
        persistState();
        triggerRender();
    }
});

triggerRender();