import { GraphModel } from './types';
import { ensureArray } from './xml-utils';
import { buildXsdContext } from './xsd-context';
import { MermaidGraphBuilder } from './mermaid-graph-builder';
import { XsdElementParser } from './xsd-element-parser';
import { parseXsdSchemaRoot } from './xsd-schema-parser';

/**
 * Résultat de la conversion d'un schéma XSD.
 * Découper le code Mermaid (header / body) permet de fusionner plusieurs schémas
 */
export interface XsdGraphResult {
    mermaid: string;
    mermaidHeader: string;
    mermaidBody: string;
    mermaidBodySimplified: string;
    model: GraphModel;
}

/**
 * Convertit un fichier XSD en diagramme Mermaid et en graphe de données (nœuds/liens).
 * Le modèle structuré permet à la vue de gérer l'interactivité (clic, filtres, détails)
 * sans relire la chaîne Mermaid.
 * @param xsdContent Contenu textuel brut du fichier .xsd
 */
export function parseXsdToGraph(xsdContent: string): XsdGraphResult {
    const emptyModel: GraphModel = { nodes: [], edges: [] };
    const schema = parseXsdSchemaRoot(xsdContent);

    if (!schema) {
        const errorMermaid = 'graph TD\n    Error[Erreur de parsing XML/XSD ou schéma introuvable]';
        return { mermaid: errorMermaid, mermaidHeader: '', mermaidBody: '', mermaidBodySimplified: '', model: emptyModel };
    }

    // cherche les éléments racines du schéma (xs:element au niveau du schéma)
    const rootElements = ensureArray(schema['xs:element'] || schema['element']);
    if (rootElements.length === 0) {
        const emptyMermaid = 'graph TD\n    Empty[Aucun élément racine trouvé]';
        return { mermaid: emptyMermaid, mermaidHeader: '', mermaidBody: '', mermaidBodySimplified: '', model: emptyModel };
    }

    const context = buildXsdContext(schema);
    const graph = new MermaidGraphBuilder();
    const elementParser = new XsdElementParser(context, graph);
    rootElements.forEach(rootElement => elementParser.parseRootElement(rootElement));

    return {
        mermaid: graph.build(),
        mermaidHeader: graph.buildHeader(),
        mermaidBody: graph.buildBody(true),
        mermaidBodySimplified: graph.buildBody(false),
        model: graph.toModel()
    };
}
