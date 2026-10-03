import { XsdRawNode } from './types';
import { ensureArray, truncate } from './xml-utils';

/**
 * Extrait les contraintes d'un simpleType XSD (énumérations, regex ou min/max).
 * @param simpleType Le nœud simpleType à analyser.
 * @returns Une chaîne descriptive ou `null` si aucune restriction n'est trouvée.
 */
export function extractRestrictionDetails(simpleType: XsdRawNode): string | null {
    const restriction = simpleType['xs:restriction'] || simpleType['restriction'];
    if (!restriction) return null;
    const base = (restriction['@_base'] || '').replace('xs:', '');

    return (
        extractEnumerationDetails(restriction, base) ??
        extractPatternDetails(restriction) ??
        extractRangeDetails(restriction, base) ??
        `Restricted [${base}]`
    );
}

/**
 * Formate la liste des valeurs autorisées pour une énumération.
 * @param restriction Le nœud de restriction XSD.
 * @param base Le type de base XSD.
 * @returns La liste des valeurs d'énumération ou `null`.
 */
function extractEnumerationDetails(restriction: XsdRawNode, base: string): string | null {
    const enumerations = ensureArray(restriction['xs:enumeration'] || restriction['enumeration']);
    if (enumerations.length === 0) return null;

    const enumValues = enumerations.map(e => e['@_value']).join(', ');
    return `Enum [${base}]: ${truncate(enumValues, 50)}`;
}

/**
 * Formate l'expression régulière (pattern) de la restriction.
 * @param restriction Le nœud de restriction XSD.
 * @returns La regex ou `null`.
 */
function extractPatternDetails(restriction: XsdRawNode): string | null {
    const pattern = restriction['xs:pattern'] || restriction['pattern'];
    if (!pattern) return null;
    return `Pattern: ${truncate(pattern['@_value'], 40)}`;
}

/**
 * Formate un intervalle numérique ou temporel (min/max).
 * @param restriction Le nœud de restriction XSD.
 * @param base Le type de base XSD.
 * @returns La plage sous forme d'intervalle ou `null`.
 */
function extractRangeDetails(restriction: XsdRawNode, base: string): string | null {
    const getVal = (key: string) => (restriction[`xs:${key}`] || restriction[key])?.['@_value'];

    const minInc = getVal('minInclusive');
    const maxInc = getVal('maxInclusive');
    const minExc = getVal('minExclusive');
    const maxExc = getVal('maxExclusive');

    if (!minInc && !maxInc && !minExc && !maxExc) return null;

    const min = minInc ? `[${minInc}` : minExc ? `]${minExc}` : '(-∞';
    const max = maxInc ? `${maxInc}]` : maxExc ? `${maxExc}[` : '+∞)';
    return `Range [${base}]: ${min}, ${max}`;
}