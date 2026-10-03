import { NodeCategory, NodeShape, XsdContext, XsdRawNode } from './types';
import { ensureArray } from './xml-utils';
import { extractDocumentation } from './documentation-parser';
import { resolveComplexType, resolveGroup, resolveTypeInfo } from './type-resolver';
import { getDirectSubtypeNames, getOwnContentNode, isAbstractComplexType, resolveInheritanceChain } from './xsd-inheritance';
import { MermaidGraphBuilder } from './mermaid-graph-builder';

/**
 * Parcourt récursivement les éléments d'un schéma XSD (éléments, séquences,
 * choix, attributs, héritage par extension) et alimente le graphe Mermaid
 * avec les nœuds et liens correspondants. Chaque nœud est créé une seule fois
 */
export class XsdElementParser {
    constructor(private readonly context: XsdContext, private readonly graph: MermaidGraphBuilder) {}

    /** Point d'entrée : parse un élément racine (sans nœud parent). */
    parseRootElement(element: XsdRawNode): void {
        this.parseElement(element);
    }

    /**
     * Parse un élément XSD : crée son nœud, le relie à son parent le cas échéant,
     * puis explore son contenu (séquence/choix/attributs/héritage) s'il est de
     * type complexe.
     */
    private parseElement(
        element: XsdRawNode,
        parentNodeId?: string,
        defaultCardinality: string = '1..1',
        isChoiceChild: boolean = false,
        inherited: boolean = false
    ): void {
        const name = element['@_name'];
        if (!name) return;

        const rawType = element['@_type'] || '';
        const inlineComplexType = element['xs:complexType'] || element['complexType'];
        const inlineSimpleType = element['xs:simpleType'] || element['simpleType'];

        const complexType = inlineComplexType || resolveComplexType(rawType, this.context);
        const category = this.resolveElementCategory(complexType);
        const typeDisplay = inlineComplexType ? 'Complex (Inline)' : resolveTypeInfo(rawType, inlineSimpleType, this.context);
        const description = this.resolveDescription(element, complexType, inlineSimpleType);

        const { id: nodeId, created } = this.graph.getOrCreateNode(
            name,
            typeDisplay,
            this.shapeForCategory(category),
            category,
            description
        );

        if (parentNodeId) {
            const cardinality = this.getCardinality(element, defaultCardinality);
            this.graph.addEdge(parentNodeId, nodeId, cardinality, isChoiceChild ? '-.->' : '-->', inherited);
        }

        // Si le type est complexe, on explore son contenu (séquence/choix/attributs/héritage) pour créer les nœuds enfants.
        // Le contenu d'un type complexe est développé une seule fois, même si plusieurs éléments le référencent.
        if (complexType && created) {
            this.expandComplexType(complexType, nodeId);
        }
    }

    /**
     * Résout la catégorie d'un élément XSD : simple, complexe, abstrait, choix ou groupe.
     * @param complexType Le complexType associé à l'élément, s'il existe
     * @returns La catégorie de l'élément : 'simple', 'complex', 'abstract', 'choice' ou 'group'
     */
    private resolveElementCategory(complexType: XsdRawNode | undefined): NodeCategory {
        if (!complexType) return 'simple';
        return isAbstractComplexType(complexType) ? 'abstract' : 'complex';
    }

    /**
     * Retourne la forme graphique (shape) à utiliser pour un nœud en fonction de sa catégorie.
     * @param category La catégorie du nœud : 'simple', 'complex', 'abstract', 'choice' ou 'group'
     * @returns La forme graphique correspondante : '[]', '{}', '{{}}' ou '([])'
     */
    private shapeForCategory(category: NodeCategory): NodeShape  {
        if (category === 'abstract') return '{{}}';
        if (category === 'choice') return '{}';
        if (category === 'group') return '([])';
        return '[]';
    }

    /**
     * Résout la documentation à afficher pour un élément XSD
     * on cherche d'abord la documentation de l'élément lui-même, puis celle du complexType associé, puis celle du simpleType inline, dans cet ordre.
     * @param element L'élément XSD à documenter
     * @param complexType Le complexType associé à l'élément, s'il existe
     * @param inlineSimpleType Le simpleType inline associé à l'élément, s'il existe
     * @returns La documentation à afficher pour l'élément, ou `undefined` si aucune documentation n'est trouvée
     */
    private resolveDescription(
        element: XsdRawNode,
        complexType: XsdRawNode | undefined,
        inlineSimpleType: XsdRawNode | undefined
    ): string | undefined {
        return (
            extractDocumentation(element) ??
            (complexType ? extractDocumentation(complexType) : undefined) ??
            (inlineSimpleType ? extractDocumentation(inlineSimpleType) : undefined)
        );
    }

    /**
     * Déploie le contenu d'un complexType (héritage, enfants, attributs et sous-types).
     * @param complexType Le nœud complexType à traiter.
     * @param nodeId L'identifiant du nœud parent dans le graphe.
     * @param isSubtypeExpansion Indique si le type est exploré dans le cadre d'un sous-type concret.
     */
    private expandComplexType(complexType: XsdRawNode, nodeId: string, isSubtypeExpansion: boolean = false): void {
        const inheritanceChain = [...resolveInheritanceChain(complexType, this.context), complexType];
        const lastLevelIndex = inheritanceChain.length - 1;

        inheritanceChain.forEach((level, index) => {
            const isInheritedLevel = isSubtypeExpansion && index < lastLevelIndex;
            const ownContentNode = getOwnContentNode(level);
            this.parseContainer(ownContentNode, nodeId, isInheritedLevel);
            this.parseAttributes(ownContentNode, nodeId, isInheritedLevel);
        });

        if (isAbstractComplexType(complexType)) {
            this.expandSubtypes(complexType, nodeId);
        }
    }

    /**
     * Recherche et ajoute au graphe tous les sous-types dérivés d'un type abstrait.
     * @param abstractComplexType Le type abstrait parent.
     * @param abstractNodeId L'identifiant du nœud du type abstrait dans le graphe.
     */
    private expandSubtypes(abstractComplexType: XsdRawNode, abstractNodeId: string): void {
        const abstractTypeName = abstractComplexType['@_name'];
        if (!abstractTypeName) return;

        getDirectSubtypeNames(abstractTypeName, this.context).forEach(subtypeName => {
            const subtypeComplexType = this.context.complexTypesMap.get(subtypeName);
            if (!subtypeComplexType) return;

            const category = this.resolveElementCategory(subtypeComplexType);
            const { id: subtypeNodeId, created } = this.graph.getOrCreateNode(
                subtypeName,
                '',
                this.shapeForCategory(category),
                category,
                extractDocumentation(subtypeComplexType)
            );

            this.graph.addEdge(abstractNodeId, subtypeNodeId, 'extension', '-.->');

            if (created) {
                this.expandComplexType(subtypeComplexType, subtypeNodeId, true);
            }
        });
    }

    /**
     * Parse le contenu d'un nœud conteneur (sequence, all, choice, group).
     * @param container Le nœud conteneur à traiter.
     * @param parentNodeId L'identifiant du nœud parent dans le graphe.
     * @param inherited Indique si le contenu est hérité.
     */
    private parseContainer(container: XsdRawNode, parentNodeId: string, inherited: boolean = false): void {
        const sequence = container['xs:sequence'] || container['sequence'];
        const all = container['xs:all'] || container['all'];
        const choice = container['xs:choice'] || container['choice'];
        const groupRef = container['xs:group'] || container['group'];
        const orderedGroup = sequence || all;

        if (orderedGroup) {
            ensureArray(orderedGroup['xs:element'] || orderedGroup['element'])
                .forEach(child => this.parseElement(child, parentNodeId, '1..1', false, inherited));
            ensureArray(orderedGroup['xs:choice'] || orderedGroup['choice'])
                .forEach(choiceNode => this.parseChoice(choiceNode, parentNodeId, inherited));
            ensureArray(orderedGroup['xs:group'] || orderedGroup['group'])
                .forEach(groupRefNode => this.parseGroupRef(groupRefNode, parentNodeId, inherited));
        } else if (choice) {
            ensureArray(choice).forEach(choiceNode => this.parseChoice(choiceNode, parentNodeId, inherited));
        } else if (groupRef) {
            ensureArray(groupRef).forEach(groupRefNode => this.parseGroupRef(groupRefNode, parentNodeId, inherited));
        }

    }

    /**
     * Parse un nœud choice et ses enfants.
     * @param choiceNode Le nœud choice à traiter.
     * @param parentNodeId L'identifiant du nœud parent dans le graphe.
     * @param inherited Indique si le contenu est hérité.
     */
    private parseChoice(choiceNode: XsdRawNode, parentNodeId: string, inherited: boolean = false): void {
        const choiceNodeId = this.graph.createNode('CHOICE', '', '{}', 'choice');
        const cardinality = this.getCardinality(choiceNode);

        this.graph.addEdge(parentNodeId, choiceNodeId, cardinality, '-.->', inherited);

        ensureArray(choiceNode['xs:element'] || choiceNode['element'])
            .forEach(child => this.parseElement(child, choiceNodeId, '1..1', true, inherited));
    }

    /**
     * Parse une référence de groupe et ses enfants.
     * @param groupRef La référence de groupe à traiter.
     * @param parentNodeId L'identifiant du nœud parent dans le graphe.
     * @param inherited Indique si le contenu est hérité.
     * @returns 
     */
    private parseGroupRef(groupRef: XsdRawNode, parentNodeId: string, inherited: boolean = false): void {
        const rawRef = groupRef['@_ref'];
        if (!rawRef) return;
 
        const groupDefinition = resolveGroup(rawRef, this.context);
        if (!groupDefinition) return;
 
        const { id: groupNodeId, created } = this.graph.getOrCreateNode(
            groupDefinition['@_name'],
            '',
            this.shapeForCategory('group'),
            'group',
            extractDocumentation(groupDefinition)
        );
 
        const cardinality = this.getCardinality(groupRef);
        this.graph.addEdge(parentNodeId, groupNodeId, cardinality, '-->', inherited);

        if (created) {
            this.parseContainer(groupDefinition, groupNodeId);
        }
    }

    /**
     * Parse les attributs d'un type complexe.
     * @param complexType Le type complexe contenant les attributs.
     * @param parentNodeId L'identifiant du nœud parent dans le graphe.
     * @param inherited Indique si le contenu est hérité.
     */
    private parseAttributes(complexType: XsdRawNode, parentNodeId: string, inherited: boolean = false): void {
        ensureArray(complexType['xs:attribute'] || complexType['attribute']).forEach(attribute => {
            const attributeName = attribute['@_name'];
            if (!attributeName) return;

            const attributeType = attribute['@_type'] || '';
            const inlineSimpleType = attribute['xs:simpleType'] || attribute['simpleType'];
            const typeDisplay = resolveTypeInfo(attributeType, inlineSimpleType, this.context);
            const usage = attribute['@_use'] === 'required' ? '1..1' : '0..1';
            const description = extractDocumentation(attribute);

            const { id: attributeNodeId } = this.graph.getOrCreateNode(
                `@${attributeName}`,
                typeDisplay,
                '[]',
                'attribute',
                description
            );
            this.graph.addEdge(parentNodeId, attributeNodeId, `@ ${usage}`, '-.->', inherited);
        });
    }

    /**
     * Calcule la cardinalité d'un élément XSD (minOccurs/maxOccurs) sous forme lisible,
     * par exemple "1", "0..1", "1..*" ou "2..5".
     */
    private getCardinality(element: XsdRawNode, defaultCardinality: string = '1..1'): string {
        const min = element['@_minOccurs'] ?? (defaultCardinality.startsWith('0') ? '0' : '1');
        const max = element['@_maxOccurs'] ?? (defaultCardinality.endsWith('*') ? 'unbounded' : '1');

        if (min === '1' && max === '1') return '1';
        if (max === 'unbounded') return `${min}..*`;
        return `${min}..${max}`;
    }
}