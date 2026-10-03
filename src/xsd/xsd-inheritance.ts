import { XsdContext, XsdRawNode } from './types';
import { resolveLocalTypeName } from './type-resolver';

/**
 * Vérifie si un complexType est déclaré comme abstrait via l'attribut `@_abstract="true"`.
 * @param complexType Le nœud XSD représentant le complexType à vérifier.
 * @returns `true` si le complexType est abstrait, `false` sinon.
 */
export function isAbstractComplexType(complexType: XsdRawNode): boolean {
    return complexType['@_abstract'] === 'true';
}

/**
 * Retourne le nœud `xs:extension` d'un complexType s'il étend un type de base via `xs:complexContent/xs:extension`.
 * @param complexType Le nœud XSD représentant le complexType à analyser.
 * @returns Le nœud `xs:extension` si le complexType étend un type de base, ou `undefined` sinon.
 */
export function getComplexContentExtension(complexType: XsdRawNode): XsdRawNode | undefined {
    const complexContent = complexType['xs:complexContent'] || complexType['complexContent'];
    return complexContent ? complexContent['xs:extension'] || complexContent['extension'] : undefined;
}

/**
 * Résout le nom du type de base d'un complexType étendant un autre type via `xs:complexContent/xs:extension`.
 * @param complexType Le nœud XSD représentant le complexType à analyser.
 * @param context Le contexte du schéma XSD, contenant les types globaux et le préfixe du targetNamespace.
 * @returns Le nom du type de base si le complexType étend un type local, ou `undefined` sinon.
 */
export function resolveBaseComplexType(
    complexType: XsdRawNode,
    context: XsdContext
): { extension: XsdRawNode; baseComplexType: XsdRawNode } | undefined {
    const extension = getComplexContentExtension(complexType);
    if (!extension) return undefined;

    const { isLocal, localName } = resolveLocalTypeName(extension['@_base'] || '', context.targetPrefix);
    if (!isLocal) return undefined;

    const baseComplexType = context.complexTypesMap.get(localName);
    return baseComplexType ? { extension, baseComplexType } : undefined;
}

/**
 * Résout la chaîne d'héritage complète d'un complexType, en suivant les extensions de type de base jusqu'à la racine.
 * @param complexType Le nœud XSD représentant le complexType à analyser.
 * @param context Le contexte du schéma XSD, contenant les types globaux et le préfixe du targetNamespace.
 * @returns Un tableau de nœuds XSD représentant la chaîne d'héritage, du type de base le plus ancien au complexType fourni.
 */
export function resolveInheritanceChain(complexType: XsdRawNode, context: XsdContext): XsdRawNode[] {
    const ancestorChain: XsdRawNode[] = [];
    const visitedAncestors = new Set<XsdRawNode>();

    let current: XsdRawNode | undefined = complexType;
    while (current) {
        const resolved = resolveBaseComplexType(current, context);
        if (!resolved || visitedAncestors.has(resolved.baseComplexType)) break;

        visitedAncestors.add(resolved.baseComplexType);
        ancestorChain.unshift(resolved.baseComplexType);
        current = resolved.baseComplexType;
    }

    return ancestorChain;
}

/**
 * Retourne le nœud de contenu propre d'un complexType, en ignorant les éléments hérités via `xs:complexContent/xs:extension`.
 * @param complexType Le nœud XSD représentant le complexType à analyser.
 * @returns Le nœud de contenu propre du complexType, ou le complexType lui-même si aucun contenu hérité n'est présent.
 */
export function getOwnContentNode(complexType: XsdRawNode): XsdRawNode {
    return getComplexContentExtension(complexType) || complexType;
}

/**
 * Retourne les noms des sous-types directs d'un type de base donné, en utilisant l'index des sous-types du contexte.
 * @param baseTypeName Le nom du type de base pour lequel récupérer les sous-types.
 * @param context Le contexte du schéma XSD, contenant l'index des sous-types par nom de type de base.
 * @returns Un tableau de noms de sous-types directs, ou un tableau vide si aucun sous-type n'est trouvé.
 */
export function getDirectSubtypeNames(baseTypeName: string, context: XsdContext): string[] {
    return context.subtypesByBaseName.get(baseTypeName) || [];
}
