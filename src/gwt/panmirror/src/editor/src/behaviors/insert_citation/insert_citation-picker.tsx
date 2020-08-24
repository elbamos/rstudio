/*
 * insert_citation_picker.ts
 *
 * Copyright (C) 2020 by RStudio, PBC
 *
 * Unless you have received this program directly from RStudio pursuant
 * to the terms of a commercial license agreement with RStudio, then
 * this program is licensed to you under the terms of version 3 of the
 * GNU Affero General Public License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * AGPL (http://www.gnu.org/licenses/agpl-3.0.txt) for more details.
 *
 */


import React from "react";

import { Node as ProsemirrorNode } from 'prosemirror-model';

import { WidgetProps } from "../../api/widgets/react";

import { BibliographyManager, BibliographySource } from "../../api/bibliography/bibliography";
import { EditorUI } from "../../api/ui";
import { SelectTreeNode, containsChild, SelectTree } from "../../api/widgets/select_tree";
import { TagInput } from "../../api/widgets/tag_input";

import { bibliographyPanel } from "./panels/insert_citation-panel-bibliography";
import { doiPanel } from "./panels/insert_citation-panel-doi";

import './insert_citation-picker.css';


// Citation Panels are the coreUI element of ths dialog. Each panel provides
// the main panel UI as well as the tree to display when the panel is displayed.
export interface CitationPanel {
  key: string;
  panel: React.FC<CitationPanelProps>;
  treeNode: SelectTreeNode;
}

// Panels get a variety of information as properties to permit them to search
// citations and add them
export interface CitationPanelProps extends WidgetProps {
  ui: EditorUI;
  bibliographyManager: BibliographyManager;
  selectedNode?: SelectTreeNode;
  sourcesToAdd: BibliographySource[];
  addSource: (source: BibliographySource) => void;
}

// The picker is a full featured UI for finding and selection citation data
// to be added to a document.
interface InsertCitationPickerProps extends WidgetProps {
  ui: EditorUI;
  doc: ProsemirrorNode;
  height: number;
  width: number;
  bibliographyManager: BibliographyManager;
  onSourceChanged: (sources: BibliographySource[]) => void;
}

export const InsertCitationPicker: React.FC<InsertCitationPickerProps> = props => {

  // The panels that are being displayed and which one is selected
  const [panels, setPanels] = React.useState<CitationPanel[]>([]);
  const [selectedPanel, setSelectedPanel] = React.useState<CitationPanel>();

  // The node of the SelectTree that is selected
  const [selectedNode, setSelectedNode] = React.useState<SelectTreeNode>();

  // Data for the SelectTree
  const [treeSourceData, setTreeSourceData] = React.useState<SelectTreeNode[]>([]);

  // The accumulated bibliography sources to be inserted
  const [sourcesToAdd, setSourcesToAdd] = React.useState<BibliographySource[]>([]);

  // The initial loading of data for the panel. 
  React.useEffect(() => {
    async function loadData() {
      await props.bibliographyManager.load(props.ui, props.doc);

      // Load the panels
      const allPanels = [
        bibliographyPanel(props.doc, props.ui, props.bibliographyManager),
        doiPanel(props.ui)
      ];
      setPanels(allPanels);

      // Load the tree and select the root node
      const treeNodes = allPanels.map(panel => panel.treeNode);
      setTreeSourceData(treeNodes);
      setSelectedNode(treeNodes[0]);
    }
    loadData();
  }, []);

  // Whenever the user selects a new node, lookup the correct panel for that node and 
  // select that panel.
  React.useEffect(() => {
    const panelForNode = (treeNode: SelectTreeNode, panelItems: CitationPanel[]) => {
      const panelItem = panelItems.find(panel => {
        return containsChild(treeNode.key, panel.treeNode);
      });
      return panelItem;
    };
    if (selectedNode) {
      const rootPanel = panelForNode(selectedNode, panels);
      if (rootPanel?.key !== selectedPanel?.key) {
        setSelectedPanel(rootPanel);
      }
    }
  }, [selectedNode]);

  // Notify the handler whenever this list changes
  React.useEffect(() => {
    props.onSourceChanged(sourcesToAdd);
  }, [sourcesToAdd]);

  // Style properties
  const style: React.CSSProperties = {
    height: props.height + 'px',
    width: props.width + 'px',
    ...props.style,
  };

  // Load the panel that is displayed for the selected node
  const citationProps: CitationPanelProps = {
    ui: props.ui,
    bibliographyManager: props.bibliographyManager,
    selectedNode,
    sourcesToAdd,
    addSource: (source: BibliographySource) => {
      setSourcesToAdd([source, ...sourcesToAdd]);
    }
  };
  const panelToDisplay = selectedPanel ? React.createElement(selectedPanel.panel, citationProps) : undefined;

  const nodeSelected = (node: SelectTreeNode) => {
    setSelectedNode(node);
  };

  const deleteSource = (displayText: string) => {
    const filteredSources = sourcesToAdd.filter(source => forDisplay(source.id) !== displayText);
    setSourcesToAdd(filteredSources);
  };

  return (
    <div className='pm-cite-panel-container' style={style}>

      <div className='pm-cite-panel-cite-selection'>
        <div className='pm-cite-panel-cite-selection-sources pm-block-border-color pm-background-color'>
          <SelectTree
            nodes={treeSourceData}
            selectedNode={selectedNode}
            nodeSelected={nodeSelected} />
        </div>

        <div className='pm-cite-panel-cite-selection-items pm-block-border-color pm-background-color'>
          {panelToDisplay}
        </div>
      </div>
      <div className='pm-cite-panel-selected-cites pm-block-border-color pm-background-color'>
        <TagInput
          tags={sourcesToAdd.map(source => forDisplay(source.id))}
          deleteTag={deleteSource} />
      </div>
    </div >
  );
};


function forDisplay(source: string) {
  return `@${source}`;
}

