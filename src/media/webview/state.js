const vscode = acquireVsCodeApi();

const previousState = vscode.getState() || {};

export const state = {
    mermaidHeader: previousState.mermaidHeader ?? null,
    mermaidBody: previousState.mermaidBody ?? null,
    mermaidBodySimplified: previousState.mermaidBodySimplified ?? null,
    model: previousState.model ?? { nodes: [], edges: [] },
    direction: previousState.direction ?? 'TD',
    includeInheritedEdges: previousState.includeInheritedEdges ?? true,
    selectedNodeId: previousState.selectedNodeId ?? null,
    isolatedNodeId: previousState.isolatedNodeId ?? null
};

export const persistState = () => vscode.setState(state);