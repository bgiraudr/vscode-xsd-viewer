import { XsdContext, XsdRawNode } from './types';
import { ensureArray } from './xml-utils';
import { resolveLocalTypeName } from './type-resolver';
import { getComplexContentExtension } from './xsd-inheritance';

/**
 * Construit le contexte de parsing à partir de l'élément racine `xs:schema` :
 * @param schema Élément racine `xs:schema` du schéma XSD
 * @returns Le contexte de parsing, incluant le targetNamespace, le préfixe XML associé,
 * les types globaux indexés par nom, et l'index des sous-types déclarés par extension.
 */
export function buildXsdContext(schema: XsdRawNode): XsdContext {
    const targetPrefix = resolveTargetPrefix(schema);
    const complexTypesMap = indexTypesByName(schema['xs:complexType'] || schema['complexType']);
    const simpleTypesMap = indexTypesByName(schema['xs:simpleType'] || schema['simpleType']);
    const groupsMap = indexTypesByName(schema['xs:group'] || schema['group']);

    return {
        targetNamespace: schema['@_targetNamespace'],
        targetPrefix,
        complexTypesMap,
        simpleTypesMap,
        groupsMap,
        subtypesByBaseName: buildSubtypesIndex(complexTypesMap, targetPrefix)
    };
}

/**
 * Recherche, parmi les déclarations `xmlns:*` du schéma, le préfixe associé au targetNamespace. 
 * Retourne une chaîne vide si le namespace cible est le namespace par défaut (aucun préfixe).
 * @param schema Élément racine `xs:schema` du schéma XSD
 * @returns Le préfixe XML du targetNamespace, ou une chaîne vide si le targetNamespace est le namespace par défaut.
 */
function resolveTargetPrefix(schema: XsdRawNode): string {
    const targetNamespace = schema['@_targetNamespace'];
    if (!targetNamespace) return '';

    for (const key of Object.keys(schema)) {
        if (key.startsWith('@_xmlns') && schema[key] === targetNamespace) {
            return key.startsWith('@_xmlns:') ? `${key.replace('@_xmlns:', '')}:` : '';
        }
    }
    return '';
}

/** 
 * Indexe une liste de complexType/simpleType par leur attribut `name`.
 * @param typeNodes Liste des nœuds de type
 * @returns Une carte indexée par nom
 */
function indexTypesByName(typeNodes: XsdRawNode | XsdRawNode[] | undefined): Map<string, XsdRawNode> {
    const typesByName = new Map<string, XsdRawNode>();
    ensureArray(typeNodes).forEach(typeNode => {
        if (typeNode['@_name']) {
            typesByName.set(typeNode['@_name'], typeNode);
        }
    });
    return typesByName;
}

/**
 * Construit un index des sous-types déclarés par extension, à partir de la map des complexType globaux.
 * Un sous-type est un complexType qui déclare une extension d'un autre complexType.
 * @param complexTypesMap Carte des complexType globaux du schéma, indexés par nom
 * @param targetPrefix Préfixe XML du targetNamespace du schéma
 * @returns Map indexant chaque nom de type de base à la liste des noms de ses sous-types
 */
function buildSubtypesIndex(complexTypesMap: Map<string, XsdRawNode>, targetPrefix: string): Map<string, string[]> {
    const subtypesByBaseName = new Map<string, string[]>();

    complexTypesMap.forEach((complexType, typeName) => {
        const rawBaseType = getExtensionBaseRawType(complexType);
        if (!rawBaseType) return;

        const { localName: baseName } = resolveLocalTypeName(rawBaseType, targetPrefix);
        const subtypeNames = subtypesByBaseName.get(baseName) || [];
        subtypeNames.push(typeName);
        subtypesByBaseName.set(baseName, subtypeNames);
    });
    return subtypesByBaseName;
}

/**
 * Retourne le type de base référencé par un complexType déclarant une extension
 * @param complexType Nœud XSD représentant un complexType
 * @returns Le type de base référencé par l'extension, ou `undefined` si le complexType n'est pas une extension
 */
function getExtensionBaseRawType(complexType: XsdRawNode): string | undefined {
    const extension = getComplexContentExtension(complexType);
    return extension ? extension['@_base'] : undefined;
}