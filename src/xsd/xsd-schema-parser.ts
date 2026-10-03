import { XMLParser } from 'fast-xml-parser';
import { XsdRawNode } from './types';

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
});

/**
 * Parse le contenu XML d'un fichier XSD et retourne son élément racine `xs:schema`.
 * @param xsdContent Contenu textuel brut du fichier .xsd
 * @returns L'élément racine `xs:schema` du schéma XSD, ou `undefined` si le contenu n'est pas un XML valide ou ne contient pas d'élément `xs:schema`.
 */
export function parseXsdSchemaRoot(xsdContent: string): XsdRawNode | undefined {
    let parsed: XsdRawNode;
    try {
        parsed = xmlParser.parse(xsdContent);
    } catch {
        return undefined;
    }
    return parsed['xs:schema'] || parsed['schema'];
}