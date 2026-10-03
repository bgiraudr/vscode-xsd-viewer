export type XsdRawNode = Record<string, any>;
export type NodeCategory = 'complex' | 'simple' | 'attribute' | 'choice' | 'abstract' | 'group';;
export type NodeShape = '[]' | '{}' | '{{}}' | '([])';
export type LinkStyle = '-->' | '-.->';

export interface XsdContext {
    targetNamespace?: string;
    targetPrefix: string;
    complexTypesMap: Map<string, XsdRawNode>;
    simpleTypesMap: Map<string, XsdRawNode>;
    groupsMap: Map<string, XsdRawNode>;
    subtypesByBaseName: Map<string, string[]>;
}

export interface GraphNode {
    id: string;
    name: string;
    typeInfo: string;
    category: NodeCategory;
    description?: string;
}

export interface GraphEdge {
    from: string;
    to: string;
    label: string;
    style: LinkStyle;
    inherited: boolean;
}

export interface GraphModel {
    nodes: GraphNode[];
    edges: GraphEdge[];
}