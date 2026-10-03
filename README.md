# XSD Viewer & Visualizer for VS Code

**XSD Viewer** est une extension Visual Studio Code permettant de visualiser, sous forme de schémas Mermaid la structure de fichiers XSD. Elle ajoute une nouvelle vue pour tous les fichiers au format `.xsd`.

Elle est conçue pour simplifier la compréhension de XSD complexes en transformant le code XML verbeux en un graphe visuel clair.

---

## Aperçu

<p align="center">
  <img src="images/image.png" alt="Description de l'image" />
</p>

> *Visualisation graphique en temps réel d'un fichier XSD avec hiérarchie des types, cardinalités et stéréotypes.*

---

## Fonctionnalités principales

- **Visualisation de diagrammes en temps réel** : Visualisez instantanément la structure hiérarchique de vos schémas XSD.
- **Support de l'héritage** : Visualisation des extensions et restrictions de types (`xs:extension`, `xs:restriction`).
- **Isolation d'élements** : Possibilité d'isoler un noeud et visualiser ses interactions avec ses parents / enfants
- **Chemins de références** : Visibilité sur les chemins amenant au noeud sélectionné

---

## Blocs XSD pris en charge

L'extension analyse et restitue visuellement les structures XSD suivantes :

| Élément XSD | Représentation visuelle | Description / Style |
| :--- | :--- | :--- |
| **`xs:element` (Complex)** | Nœud bleu (`fill:#bbdefb`) | Éléments de structure avec sous-éléments. |
| **`xs:element` (Simple)** | Nœud vert (`fill:#c8e6c9`) | Éléments feuilles (types simples/primitifs). |
| **`xs:attribute`** | Nœud jaune pointillé (`fill:#fff9c4`) | Attributs rattachés à un complexe. |
| **`xs:choice`** | Nœud violet (`fill:#e1bee7`) | Blocs de choix exclusif (`«choice»`). |
| **`xs:complexType` (Abstract)** | Nœud orange pointillé (`fill:#ffe0b2`) | Types abstraits (`«abstract»`). |
| **`xs:group`** | Nœud cyan (`fill:#b2ebf2`) | Groupes d'éléments réutilisables (`«group»`). |

---

## Exemple d'utilisation

Voici un exemple simple de fichier XSD :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="[http://www.w3.org/2001/XMLSchema](http://www.w3.org/2001/XMLSchema)">

  <!-- Élément Racine -->
  <xs:element name="Commande" type="PurchaseOrderType"/>

  <!-- Type Complexe Abstrait -->
  <xs:complexType name="Personne" abstract="true">
    <xs:sequence>
      <xs:element name="Nom" type="xs:string"/>
      <xs:element name="Prenom" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <!-- Type Complexe par Extension -->
  <xs:complexType name="Client">
    <xs:complexContent>
      <xs:extension base="Personne">
        <xs:sequence>
          <xs:element name="Email" type="xs:string"/>
        </xs:sequence>
        <xs:attribute name="id" type="xs:ID" use="required"/>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>

  <!-- Type Complexe Principal -->
  <xs:complexType name="PurchaseOrderType">
    <xs:sequence>
      <xs:element name="Client" type="Client"/>
      <xs:choice>
        <xs:element name="LivraisonDomicile" type="xs:boolean"/>
        <xs:element name="PointRelais" type="xs:string"/>
      </xs:choice>
    </xs:sequence>
  </xs:complexType>
</xs:schema>
```
