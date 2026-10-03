import { XsdContext, XsdRawNode } from './types';
import { extractRestrictionDetails } from './restriction-parser';

/**
 * Extrait le nom local d'un type en vérifiant s'il appartient au namespace cible.
 * @param rawType Le nom brut du type (ex: "xs:string", "tns:MonType", "MonType").
 * @param targetPrefix Le préfixe du namespace cible (ex: "tns:").
 * @returns Un objet indiquant si le type est local et son nom nettoyé.
 */
export function resolveLocalTypeName(rawType: string, targetPrefix: string): { isLocal: boolean; localName: string } {
    if (targetPrefix && rawType.startsWith(targetPrefix)) {
        return { isLocal: true, localName: rawType.replace(targetPrefix, '') };
    }

    if (!targetPrefix && rawType && !rawType.startsWith('xs:') && !rawType.includes(':')) {
        return { isLocal: true, localName: rawType };
    }

    return { isLocal: false, localName: rawType };
}

/**
 * Résout les informations d'affichage d'un type XSD.
 * @param rawType Le type référencé (ex: "xs:string", "tns:MonType").
 * @param inlineSimpleType Un simpleType inline (ex: restriction) si présent.
 * @param context Le contexte du schéma XSD, contenant les types globaux et le préfixe du targetNamespace.
 * @returns Une chaîne HTML décrivant le type, avec éventuellement ses contraintes.
 */
export function resolveTypeInfo(rawType: string, inlineSimpleType: XsdRawNode | undefined, context: XsdContext): string {
    if (inlineSimpleType) {
        return extractRestrictionDetails(inlineSimpleType) ?? 'Simple (Inline)';
    }
    const { isLocal, localName } = resolveLocalTypeName(rawType, context.targetPrefix);

    if (isLocal) {
        const globalSimpleType = context.simpleTypesMap.get(localName);
        if (globalSimpleType) {
            const details = extractRestrictionDetails(globalSimpleType);
            return details ? `${localName} <br/> <small>${details}</small>` : localName;
        }
    }
    return rawType.replace('xs:', '') || 'string';
}

/**
 * Recherche la définition d'un complexType global dans le contexte.
 * @param rawType Le nom brut du type référencé.
 * @param context Le contexte du schéma XSD.
 * @returns Le nœud du complexType ou `undefined` si non trouvé.
 */
export function resolveComplexType(rawType: string, context: XsdContext): XsdRawNode | undefined {
    if (!rawType) return undefined;
    const { isLocal, localName } = resolveLocalTypeName(rawType, context.targetPrefix);
    return isLocal ? context.complexTypesMap.get(localName) : undefined;
}

/**
 * Recherche la définition d'un groupe réutilisable (`xs:group`) dans le contexte.
 * @param rawRef La référence brute du groupe (`@_ref`).
 * @param context Le contexte du schéma XSD.
 * @returns Le nœud du groupe ou `undefined` si non trouvé.
 */export function resolveGroup(rawRef: string, context: XsdContext): XsdRawNode | undefined {
    if (!rawRef) return undefined;
    const { isLocal, localName } = resolveLocalTypeName(rawRef, context.targetPrefix);
    return isLocal ? context.groupsMap.get(localName) : undefined;
}
