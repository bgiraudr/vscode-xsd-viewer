import * as vscode from 'vscode';
import { parseXsdToGraph } from './xsd';

/**
 * Point d'entrée de l'extension.
 * @param context Le contexte de l'extension fourni par VS Code.
 */
export function activate(context: vscode.ExtensionContext) {
    const provider = new XsdEditorProvider(context);
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider('xsdViewer.preview', provider)
    );
}

/**
 * Fournisseur de l'éditeur personnalisé pour les fichiers XSD
 */
class XsdEditorProvider implements vscode.CustomTextEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) {}

    /** Initialise la vue webview du document. */
    async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'src', 'media')]
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        const updateWebview = () => {
            try {
                const { mermaidHeader, mermaidBody, mermaidBodySimplified, model } = parseXsdToGraph(document.getText());

                webviewPanel.webview.postMessage({
                    type: 'update',
                    mermaidHeader,
                    mermaidBody,
                    mermaidBodySimplified,
                    model
                });
            } catch (error) {
                console.error('Error parsing XSD :', error);
            }
        };

        let debounceTimer: NodeJS.Timeout | undefined;
        const scheduleUpdate = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateWebview, 300);
        };

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                scheduleUpdate();
            }
        });

        webviewPanel.onDidDispose(() => {
            if (debounceTimer) clearTimeout(debounceTimer);
            changeDocumentSubscription.dispose();
        });

        updateWebview();
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'src', 'media', 'styles.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'src', 'media', 'webview', 'main.js'));

        return `<!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        </head>
        <body>
            ${this.getBodyMarkup()}
            <script type="module" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private getBodyMarkup(): string {
        const GRAPH_DIRECTIONS = [
            { value: 'TD', label: 'Top → Bottom' },
            { value: 'LR', label: 'Left → Right' },
            { value: 'BT', label: 'Bottom → Top' },
            { value: 'RL', label: 'Right → Left' }
        ] as const;

        const options = GRAPH_DIRECTIONS.map(({ value, label }) => `<option value="${value}">${label}</option>`).join('');

        return `
            <div id="topBar">
                <div id="configPanel">
                    <div class="config-row">
                        <label for="layoutSelect">Orientation :</label>
                        <select id="layoutSelect">${options}</select>
                    </div>
                    <div class="config-row">
                        <label title="An abstract type can be inherited by other types. Thoses types include the abstract type's properties. This option allows to hide the links inherited from abstract types (to simplify the graph).">
                            <input type="checkbox" id="includeInheritedToggle" checked>
                            Display inherited links
                        </label>
                    </div>
                </div>
                <div id="previewPanel">
                    <div id="previewContent">
                        <p class="preview-placeholder">Click on a node in the graph to display its details.</p>
                    </div>
                </div>
            </div>
            <div id="graphContainer">
                <div id="graph">Loading view...</div>
                </div>
                <div id="zoomControls">
                    <button id="zoomIn">+</button>
                    <button id="zoomOut">−</button>
                    <button id="zoomReset">Reset</button>
                </div>
            </div>
        `;
    }
}