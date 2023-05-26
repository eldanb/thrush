import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FmInstrumentAlgorithmNodeDescriptor } from 'src/lib/thrush_engine/synth/scriptsynth/worklet/ScriptSynthWorkerRpcInterface';

const GRAPH_NODE_HEIGHT = 30;
const GRAPH_LAYER_WIDTH = 40;
const GRAPH_SIBLING_SPACING = 10;

type AlgorithmVisualizationNode = {
  x: number;
  y: number;

  label: string;

  children: AlgorithmVisualizationNode[];

  fmAlgorithmNodeDescriptor: FmInstrumentAlgorithmNodeDescriptor;
}

@Component({
  selector: 'app-fm-algorithm-tree-display',
  templateUrl: './fm-algorithm-tree-display.component.html',
  styleUrls: ['./fm-algorithm-tree-display.component.scss']
})
export class FmAlgorithmTreeDisplayComponent implements OnInit {
  readonly algoNodeSize = 30;
  readonly algoNodeMargin = 3;
  readonly algoNodeFeedbackOfs = 10;

  public selectedAlgorithmVisualizationNode: AlgorithmVisualizationNode | null = null;

  private _rootAlgorithmNode: FmInstrumentAlgorithmNodeDescriptor | null = null;

  algorithmVisualizationNodes: AlgorithmVisualizationNode[] = [];
  
  @Input() 
  get selectedAlgorithmNode() {
    return this.selectedAlgorithmVisualizationNode?.fmAlgorithmNodeDescriptor || null;
  }
  
  set selectedAlgorithmNode(v: FmInstrumentAlgorithmNodeDescriptor | null) {
    if(this.selectedAlgorithmNode != v) {
      this.setEditedAlgorithmVisualizationNode(this.algorithmVisualizationNodes.find(vnode => vnode.fmAlgorithmNodeDescriptor == v) || null);
    }
  }

  @Output()
  public selectedAlgorithmNodeChange = new EventEmitter<FmInstrumentAlgorithmNodeDescriptor | null>();


  @Input() 
  get selectedAlgorithmNodeBookmark() {
    return this.selectedAlgorithmVisualizationNode ? this.algorithmVisualizationNodes.indexOf(this.selectedAlgorithmVisualizationNode) : -1;
  }
  
  set selectedAlgorithmNodeBookmark(v: number) {
    let newNode = (v < 0 ? null : this.algorithmVisualizationNodes[v]);
    if(this.selectedAlgorithmVisualizationNode != newNode) {
      this.setEditedAlgorithmVisualizationNode(newNode);
    }
  }

  @Output()
  public selectedAlgorithmNodeBookmarkChange = new EventEmitter<number>();


  @Input()
  set rootAlgorithmNode(v: FmInstrumentAlgorithmNodeDescriptor | null) {
    this._rootAlgorithmNode = v;
    this.computeAlgorithmVisualizationGraph();
  }

  get rootAlgorithmNode() {
    return this._rootAlgorithmNode;
  }

  constructor() { }

  ngOnInit(): void {
  }


  private setEditedAlgorithmVisualizationNode(node: AlgorithmVisualizationNode | null) {
    this.selectedAlgorithmVisualizationNode = node;
    this.selectedAlgorithmNodeChange.emit(node?.fmAlgorithmNodeDescriptor || null);
    this.selectedAlgorithmNodeBookmarkChange.emit(node ? this.algorithmVisualizationNodes.indexOf(node) : -1);
  }

  private computeAlgorithmVisualizationGraph() {
    const priorSelectedIndex = this.selectedAlgorithmNodeBookmark;

    let labelGenerator = 0;
    const createNodesForSubgraph = (
      node: FmInstrumentAlgorithmNodeDescriptor, 
      startX: number,
      startY: number): [number, number, AlgorithmVisualizationNode] => {
        
        let subgraphStartY = startY;
        let graphMaxX = startX;
        const children: AlgorithmVisualizationNode[] = [];
        
        const myLabel = `${++labelGenerator}`;

        const myNode: AlgorithmVisualizationNode = {
          x: startX,
          y: 0,
          children: children,
          fmAlgorithmNodeDescriptor: node,
          label: myLabel
        };

        this.algorithmVisualizationNodes.push(myNode);

        node.modulators.forEach((modulator, index) => {
          let [subgraphMaxX, subgraphMaxY, subnode] = createNodesForSubgraph(modulator, startX + GRAPH_LAYER_WIDTH, subgraphStartY);
          subgraphStartY = subgraphMaxY + ((index<node.modulators.length-1) ? GRAPH_SIBLING_SPACING : 0);
          graphMaxX = Math.max(graphMaxX, subgraphMaxX);
          children.push(subnode);
        });
        
        if(subgraphStartY - startY < GRAPH_NODE_HEIGHT) {
          subgraphStartY = startY + GRAPH_NODE_HEIGHT;
        }

        myNode.y = (subgraphStartY + startY)/2;

        return [graphMaxX, subgraphStartY, myNode];
    };

    this.algorithmVisualizationNodes = [];

    const rootNode = this.rootAlgorithmNode;
    if(rootNode) {
      const [maxX, maxY, rootVisualizationNode] = createNodesForSubgraph(rootNode, 0, 0);
      
      const offsetX = (300 - maxX - 40) / 2;
      const offsetY = (150 - maxY - 40) / 2;

      this.algorithmVisualizationNodes.forEach(node => {
        node.x += offsetX;
        node.y += offsetY;
      })
    }    

    if(priorSelectedIndex < this.algorithmVisualizationNodes.length) {
      this.selectedAlgorithmNodeBookmark = priorSelectedIndex;
    } else {
      this.selectedAlgorithmNodeBookmark = 0;
    }

  }

  handleAlgorithmGraphNodeClicked(node: AlgorithmVisualizationNode) {
    this.setEditedAlgorithmVisualizationNode(node);
  }
}
