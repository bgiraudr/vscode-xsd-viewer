import { XsdRawNode } from './types';

/**
 * Extrait le texte de documentation d'un nœud XSD (complexType, simpleType, element, attribute, etc.).
 * @param node Le nœud XSD à analyser.
 * @returns Le texte de documentation normalisé, ou `undefined` si aucune documentation n'est trouvée.
 */
export function extractDocumentation(node: XsdRawNode | undefined): string | undefined {
    if (!node) return undefined;

    const annotation = node['xs:annotation'] || node['annotation'];
    const documentation = annotation
        ? annotation['xs:documentation'] || annotation['documentation']
        : node['xs:documentation'] || node['documentation'];

    return normalizeDocumentationText(documentation);
}

/**
 * Normalise le texte de documentation en supprimant les espaces superflus et les retours à la ligne.
 * @param documentation Le texte de documentation brut ou le nœud de documentation XSD.
 * @returns Le texte de documentation normalisé, ou `undefined` si le texte est vide ou invalide.
 */
function normalizeDocumentationText(documentation: unknown): string | undefined {
    if (documentation === undefined || documentation === null) return undefined;

    const rawText = typeof documentation === 'string' ? documentation : (documentation as XsdRawNode)['#text'];
    if (typeof rawText !== 'string') return undefined;

    const normalized = rawText.trim().replace(/\s+/g, ' ');
    return normalized.length > 0 ? normalized : undefined;
}
