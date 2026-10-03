import { GraphEdge, GraphModel, GraphNode, LinkStyle, NodeCategory, NodeShape } from './types';
import { escapeHtml } from './xml-utils';

const CLASS_DEFINITIONS: Record<NodeCategory, string> = {
    complex: 'fill:#bbdefb,stroke:#1976d2,stroke-width:2px,color:#000',
    simple: 'fill:#c8e6c9,stroke:#388e3c,stroke-width:1px,color:#000',
    attribute: 'fill:#fff9c4,stroke:#fbc02d,stroke-width:1px,stroke-dasharray: 5 5,color:#000',
    choice: 'fill:#e1bee7,stroke:#8e24aa,stroke-width:2px,color:#000',
    abstract: 'fill:#ffe0b2,stroke:#e65100,stroke-width:2px,stroke-dasharray: 6 3,color:#000',
    group: 'fill:#b2ebf2,stroke:#00838f,stroke-width:2px,color:#000'    
};

/** Stéréotype UML-like affiché au-dessus du nom, pour les catégories qui en ont un. */
const CATEGORY_STEREOTYPES: Partial<Record<NodeCategory, string>> = {
    abstract: '«abstract»',
    group: '«group»'
};

/** Nœud interne du builder : un GraphNode enrichi de la forme utilisée pour son rendu Mermaid. */
interface InternalNode extends GraphNode {
    shape: NodeShape;
}

/**
 * Génère un graphe Mermaid et son modèle de données structuré.
 */
export class MermaidGraphBuilder {
    private readonly nodeIdByDedupeKey = new Map<string, string>();
    private readonly nodes: InternalNode[] = [];
    private readonly edges: GraphEdge[] = [];
    private nextNodeIndex = 1;

    /**
     * Récupère un nœud existant ou en crée un nouveau si la paire (nom, type) n'existe pas encore.
     * @param name Nom du nœud (ex: "Client").
     * @param typeInfo Type affiché (ex: "xs:string").
     * @param shape Forme des parenthèses Mermaid (ex: "[]", "({})").
     * @param category Catégorie définissant le style visuel.
     * @param description Documentation associée au nœud.
     * @returns L'identifiant du nœud et un booléen `created` à `true` s'il vient d'être instancié.
     */
    getOrCreateNode(name: string, typeInfo: string, shape: NodeShape = '[]',
        category: NodeCategory = 'simple', description?: string): { id: string; created: boolean } {
        const dedupeKey = `${name}_${typeInfo}`;
        const existingId = this.nodeIdByDedupeKey.get(dedupeKey);
        if (existingId) return { id: existingId, created: false };

        const id = this.createNode(name, typeInfo, shape, category, description);
        this.nodeIdByDedupeKey.set(dedupeKey, id);
        return { id, created: true };
    }

    /**
     * Crée un nouveau nœud sans vérification de doublon.
     * Appelée directement pour les nœuds "CHOICE" et les nœuds de groupe, qui sont toujours uniques.
     * @param name Nom du nœud.
     * @param typeInfo Type affiché.
     * @param shape Forme des parenthèses Mermaid.
     * @param category Catégorie du nœud.
     * @param description Documentation optionnelle.
     * @returns L'identifiant unique attribué au nœud.
     */
    createNode(name: string, typeInfo: string, shape: NodeShape = '[]',
        category: NodeCategory = 'simple', description?: string): string {
        const id = `node_${this.nextNodeIndex++}`;
        this.nodes.push({ id, name, typeInfo, category, description, shape });
        return id;
    }

    /**
     * Ajoute un lien orienté entre deux nœuds.
     * @param fromNodeId Identifiant du nœud source.
     * @param toNodeId Identifiant du nœud cible.
     * @param label Texte affiché sur le lien (ex: cardinalité).
     * @param style Style de la flèche Mermaid (ex: "-->", "-.->").
     * @param inherited Indique si le lien est hérité d'un type parent.
     */
    addEdge(fromNodeId: string, toNodeId: string, label: string, style: LinkStyle = '-->', inherited: boolean = false): void {
        this.edges.push({ from: fromNodeId, to: toNodeId, label, style, inherited });
    }

    /**
     * Génère le diagramme Mermaid complet (en-tête, styles, nœuds et liens).
     * @returns La syntaxe Mermaid brute.
     */
    build(): string {
        return [this.buildHeader(), this.buildBody()].join('\n');
    }

    /**
     * Génère l'en-tête Mermaid (`graph TD` et définitions de classes).
     * @returns Les lignes d'en-tête du diagramme.
     */    
    buildHeader(): string {
        return ['graph TD', ...this.renderClassDefinitions()].join('\n');
    }

    /**
     * Génère le corps du diagramme (déclarations des nœuds et des liens).
     * @param includeInherited Si `false`, filtre les liens marqués comme hérités.
     * @returns Le corps du code Mermaid.
     */
    buildBody(includeInherited: boolean = true): string {
        return this.renderBodyLines(includeInherited).join('\n');
    }

    /**
     * Construit l'ensemble des déclarations de nœuds et de liens.
     * @param includeInherited Conserve ou filtre les liens d'héritage.
     * @returns Un tableau de lignes de code Mermaid.
     */
    private renderBodyLines(includeInherited: boolean): string[] {
        const edges = includeInherited ? this.edges : this.edges.filter(edge => !edge.inherited);
        return [
            ...this.nodes.map(node => this.renderNodeDeclaration(node)),
            ...edges.map(edge => this.renderEdgeDeclaration(edge))
        ];
    }

    /**
     * Exporte les données du graphe sous forme d'un objet structuré.
     * @returns Le modèle contenant la liste des nœuds et des arêtes.
     */
    toModel(): GraphModel {
        return {
            nodes: this.nodes.map(({ id, name, typeInfo, category, description }) => ({
                id,
                name,
                typeInfo,
                category,
                description
            })),
            edges: this.edges.map(edge => ({ ...edge }))
        };
    }

    /**
     * Génère les directives `classDef` pour le style des nœuds.
     * @returns Les lignes de règles CSS pour Mermaid.
     */
    private renderClassDefinitions(): string[] {
        return Object.entries(CLASS_DEFINITIONS).map(
            ([category, style]) => `    classDef ${category} ${style};`
        );
    }

    /**
     * Formate la déclaration Mermaid d'une arête entre deux nœuds.
     * @param edge L'objet arête à formater.
     * @returns La ligne Mermaid décrivant la liaison.
     */
    private renderEdgeDeclaration(edge: GraphEdge): string {
        return `    ${edge.from} ${edge.style}|"${edge.label}"| ${edge.to}`;
    }

    /**
     * Formate la déclaration Mermaid d'un nœud.
     * @param node L'objet nœud à formater.
     * @returns La ligne Mermaid décrivant le nœud.
     */
    private renderNodeDeclaration(node: InternalNode): string {
        const label = this.renderLabel(node.name, node.typeInfo, node.category);
        const midpoint = node.shape.length / 2;
        const [openShape, closeShape] = [node.shape.substring(0, midpoint), node.shape.substring(midpoint)];
        return `    ${node.id}${openShape}"${label}"${closeShape}:::${node.category}`;
    }

    /**
     * Formate le libellé HTML affiché à l'intérieur d'un nœud.
     * @param name Nom de l'élément.
     * @param typeInfo Type de l'élément.
     * @param category Catégorie du nœud pour le stéréotype.
     * @returns Le contenu HTML du libellé.
     */
    private renderLabel(name: string, typeInfo: string, category: NodeCategory): string {
        const stereotype = CATEGORY_STEREOTYPES[category];
        const safeName = `${stereotype ? `${stereotype}<br/>` : ''}${escapeHtml(name)}`;
        if (!typeInfo) return safeName;
 
        const safeTypeInfo = this.escapeLabelPreservingTags(typeInfo);
        return `${safeName}<br/><i>${safeTypeInfo}</i>`;
    }

    /**
     * Échappe les caractères HTML d'un texte tout en conservant les balises `<br/>` et `<small>`.
     * @param typeInfo Le texte à sécuriser.
     * @returns La chaîne nettoyée avec balises conservées.
     */
    private escapeLabelPreservingTags(typeInfo: string): string {
        return typeInfo
            .split('<br/>')
            .map(part =>
                part.split(/(<small>|<\/small>)/)
                    .map(segment => (segment === '<small>' || segment === '</small>' ? segment : escapeHtml(segment)))
                    .join('')
            )
            .join('<br/>');
    }
}