/**
 * Assure que l'élément fourni est toujours retourné sous forme de tableau.
 * Si l'élément est `undefined` ou `null`, retourne un tableau vide.
 * Si l'élément est déjà un tableau, le retourne tel quel.
 * Sinon, retourne un tableau contenant l'élément unique.
 * @param item L'élément à normaliser en tableau.
 * @returns Un tableau contenant l'élément fourni, ou un tableau vide si l'élément est `undefined` ou `null`.
 */
export function ensureArray<T = any>(item: T | T[] | undefined | null): T[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
}

/**
 * Échappe les caractères spéciaux HTML dans une chaîne de texte pour éviter les problèmes d'affichage dans un contexte HTML.
 * @param text La chaîne de texte à échapper.
 * @returns La chaîne de texte échappée.
 */
export function escapeHtml(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Troncature d'une chaîne de texte à une longueur maximale spécifiée, avec ajout de "..." si la chaîne dépasse cette longueur.
 * @param text La chaîne de texte à tronquer.
 * @param length La longueur maximale souhaitée (par défaut : 40).
 * @returns La chaîne tronquée avec "..." si nécessaire.
 */ 
export function truncate(text: string, length: number = 40): string {
    return text.length > length ? `${text.substring(0, length)}...` : text;
}
