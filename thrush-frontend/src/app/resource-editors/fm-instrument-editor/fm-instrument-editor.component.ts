import { Component, EventEmitter, OnInit } from '@angular/core';
import { ThrushEngineService } from 'src/app/services/thrush-engine.service';
import { EditedWaveform } from 'src/app/widget-lib/waveform-editor/waveform-editor.component';
import { ResourceTypeFmInstrument } from 'src/lib/project-datamodel/project-datamodel';
import { EnvelopeCurveCoordinate } from 'src/lib/thrush_engine/synth/common/Envelopes';
import { ScriptSynthFmInstrument } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthInstrumentFm';
import { FmInstrumentAlgorithmNodeDescriptor, FmInstrumentDescriptor } from 'src/lib/thrush_engine/synth/scriptsynth/worklet/ScriptSynthWorkerRpcInterface';
import { PlayingPreviewStopHandler, ResourceEditor, ResourceEditorWithPlaySupport } from '../resource-editor';
import { FilterDefinition, FilterTypes } from 'src/lib/thrush_engine/synth/scriptsynth/filters/FilterParametersParser';

const DEFAULT_FM_RENDER_DURATION = 4;

type TopologyDescriptionNode = {
  isAdder: boolean;
  subNodes: TopologyDescriptionNode[];
};

const TOPOLOOGY_TEMPLATES: TopologyDescriptionNode[] = [  
  { isAdder: false, subNodes: [] },
  { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] },
  { isAdder: false, subNodes: [ { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] } ] },
  { isAdder: false, subNodes: [ { isAdder: false, subNodes: [ { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] } ] } ] },

  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] },
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] }
  ] },


  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] },
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] },
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] }
  ] },


  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [] },
    { isAdder: false, subNodes: [] },    
  ] },

  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [] },
    { isAdder: false, subNodes: [] },    
    { isAdder: false, subNodes: [] },    
  ] },

  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [] },
    { isAdder: false, subNodes: [] },    
    { isAdder: false, subNodes: [] },    
    { isAdder: false, subNodes: [] },    
  ] },
  
  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] } ] },
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] } ] },
  ] },



  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] },
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [ { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] } ] } ] },
  ] },

  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] },    
    { isAdder: false, subNodes: [ 
        { isAdder: false, subNodes: [] },
        { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] }
    ] }
  ] },

  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] } ] },
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] }, { isAdder: false, subNodes: [] } ] },
  ] },

  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] },
    { isAdder: false, subNodes: [ 
      { isAdder: false, subNodes: [] }, 
      { isAdder: false, subNodes: [] },
      { isAdder: false, subNodes: [] }
    ] },
  ] },

  { isAdder: true, subNodes: [
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] },
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [
      { isAdder: false, subNodes: [] },
      { isAdder: false, subNodes: [] }
    ] } ] },    
  ] },

  { isAdder: false, subNodes: [
    { isAdder: false, subNodes: [] },
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] },
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] }
  ] },

  { isAdder: false, subNodes: [
    { isAdder: false, subNodes: [] },
    { isAdder: false, subNodes: [] },
    { isAdder: false, subNodes: [ { isAdder: false, subNodes: [ { isAdder: false, subNodes: [] } ] } ] }
  ] },
]

type FmInstrumentEditorState = {
  selectedAlgorithmNodeIndex: number | null;
}

@Component({
  templateUrl: './fm-instrument-editor.component.html',
  styleUrls: ['./fm-instrument-editor.component.scss']
})
export class FmInstrumentEditorComponent implements OnInit, ResourceEditor<ResourceTypeFmInstrument, FmInstrumentEditorState>, ResourceEditorWithPlaySupport {
  readonly algoNodeSize = 30;
  readonly algoNodeMargin = 3;
  readonly algoNodeFeedbackOfs = 10;
  
  constructor(private _synthEngine: ThrushEngineService) { }

  set editedResource(resource: ResourceTypeFmInstrument) {
    this._editedResource = resource;
    this.selectedTopologyId = this.identifyTopology(this._editedResource.rootAlgorithmNode);
    this.resultWaveform = this.computeWaveform(ScriptSynthFmInstrument.fromDescriptor(this._editedResource!), DEFAULT_FM_RENDER_DURATION);    
  }

  get editedResource(): ResourceTypeFmInstrument {
    return this._editedResource;
  }
  
  resourceEdited = new EventEmitter<boolean>();

  selectedTopologyId: number = 0;
  selectedAlgorithmNodeBookmark: number = 0;
  editedAlgorithmNode: FmInstrumentAlgorithmNodeDescriptor | null = null;

  get editedAlgorithmNodeFreq(): number {
    return this.editedAlgorithmNode!.freqValue;
  }

  set editedAlgorithmNodeFreq(f: number) {
    this.editedAlgorithmNode!.freqValue = f;
    this.notifyResourceDirty();
  }

  get editedAlgorithmNodeFeedback(): number {
    return this.editedAlgorithmNode!.feedback;
  }

  set editedAlgorithmNodeFeedback(f: number) {
    this.editedAlgorithmNode!.feedback = f;
    this.notifyResourceDirty();
  }

  get editedAlgorithmNodeFreqFixed(): boolean {
    return this.editedAlgorithmNode!.freqType == 'fixed';
  }

  set editedAlgorithmNodeFreqFixed(f: boolean) {
    this.editedAlgorithmNode!.freqType = f ? 'fixed' : 'multiplier';
    this.notifyResourceDirty();
  }

  get editedAlgorithmNodeAttack(): EnvelopeCurveCoordinate[] {
    return this.editedAlgorithmNode!.attackEnvelope;
  }

  set editedAlgorithmNodeAttack(e: EnvelopeCurveCoordinate[]) {
    this.editedAlgorithmNode!.attackEnvelope = e;
    this.notifyResourceDirty();
  }

  get editedAlgorithmNodeRelease(): EnvelopeCurveCoordinate[] {
    return this.editedAlgorithmNode!.releaseEnvelope;
  }

  set editedAlgorithmNodeRelease(e: EnvelopeCurveCoordinate[]) {
    this.editedAlgorithmNode!.releaseEnvelope = e;
    this.notifyResourceDirty();
  }

  get editedInstrumentFilters(): FilterDefinition[] | undefined {
    return this.editedResource.filters;
  }

  set editedInstrumentFilters(filters: FilterDefinition[] | undefined) {
    this.editedResource.filters = filters;
    this.notifyResourceDirty();
  }

  resultWaveform: EditedWaveform | null = null;
  resultDisplayStartTime: number = 0;
  resultDisplayEndTime: number = 0.5;

  selectionStartTime: number | null = null;
  selectionEndTime: number | null = null;


  private _cachedOperatorWaveform: EditedWaveform | null = null;
  private _cachedOperatorWaveformForNode: FmInstrumentAlgorithmNodeDescriptor | null = null;

  private _registeredInstrument: string | null = null;
  private _playbackStartTime: number | null = null;

  private _editedResource: ResourceTypeFmInstrument = { 
    rootAlgorithmNode: { 
      attackEnvelope: [], 
      releaseEnvelope: [], 
      freqType: 'multiplier',
      freqValue: 1,
      oscType: 'sine',
      feedback: 0,
      modulators: [] 
    }
  }; 

  ngOnInit(): void {
  }

  private computeWaveform(instrument : ScriptSynthFmInstrument, length: number): EditedWaveform {
    const outputSampleRate = 22050;
    const noteGenerator = instrument.createNoteGenerator(24, outputSampleRate, 0);
    const lenInSamples = Math.round(outputSampleRate * length);

    const filter = instrument.createFilterState(outputSampleRate);

    noteGenerator.setPanning(0);
      
    const editedWaveform: EditedWaveform = {
      sampleRate: outputSampleRate,
      channelSamples: [new Float32Array(lenInSamples)]
    }

    const outputChannels = [0, 0];

    for(let idx=0; idx<lenInSamples; idx++) {
      outputChannels[0] = 0; 
      outputChannels[1] = 0; 

      if(!noteGenerator.getNoteSample(idx, idx/outputSampleRate, outputChannels)) {
        break;
      }

      filter?.filter(outputChannels);

      editedWaveform.channelSamples[0][idx] = outputChannels[0];
    } 

    return editedWaveform;
  }

  handleNextAlgo(): void {
    if(this.selectedTopologyId < 0) {
      this.loadTopology(0);
    } else 
    if(this.selectedTopologyId < TOPOLOOGY_TEMPLATES.length-1) {
      this.loadTopology(this.selectedTopologyId + 1);  
    }    
  }

  handlePreviousAlgo(): void {
    if(this.selectedTopologyId < 0) {
      this.loadTopology(TOPOLOOGY_TEMPLATES.length-1);
    } else 
    if(this.selectedTopologyId > 0) {
      this.loadTopology(this.selectedTopologyId - 1);  
    }    
  }

  private loadTopology(topologyId: number) {
    this.selectedTopologyId = topologyId;
    
    const cloneNodeFromBase = (baseNode: FmInstrumentAlgorithmNodeDescriptor) => Object.assign(
      {}, 
      baseNode, 
      { modulators: [] }
    );

    const cloneTopology = (topologyDescriptionNode: TopologyDescriptionNode, baseNode?: FmInstrumentAlgorithmNodeDescriptor): FmInstrumentAlgorithmNodeDescriptor =>  {      
      if(baseNode?.oscType === 'adder' && !topologyDescriptionNode.isAdder) {
        return Object.assign(
          {}, 
          cloneNodeFromBase(baseNode.modulators[0]), 
          { modulators: topologyDescriptionNode.subNodes.map((modulator, index) => 
            cloneTopology(modulator, baseNode.modulators[0].modulators[index])) });
      } 
      else if(baseNode?.oscType !== 'adder' && topologyDescriptionNode.isAdder) {
        return {
            oscType: 'adder',
            freqType: 'fixed',
            freqValue: 1,
            attackEnvelope: [],
            releaseEnvelope: [],
            feedback: 0,
            modulators: topologyDescriptionNode.subNodes.map((modulator, index) => 
              cloneTopology(modulator, index === 0 ? baseNode : undefined))            
          };        
      } else {
        const nonNullBaseNode = baseNode ?? {
          oscType: topologyDescriptionNode.isAdder ? 'adder' : 'sine',
          freqType: 'multiplier',
          freqValue: 1,
          attackEnvelope: [],
          releaseEnvelope: [],
          feedback: 0,
          modulators: []
        };

        return Object.assign(
          {}, 
          nonNullBaseNode,
          { modulators: topologyDescriptionNode.subNodes.map((modulator, index) => 
            cloneTopology(modulator, nonNullBaseNode.modulators[index])) });
      }
    }
    
    this._editedResource.rootAlgorithmNode = cloneTopology(TOPOLOOGY_TEMPLATES[topologyId], this.editedResource.rootAlgorithmNode);
    this.notifyResourceDirty();
  }

  private identifyTopology(node: FmInstrumentAlgorithmNodeDescriptor): number {
    const templateFits = (templateNode: TopologyDescriptionNode, testNode: FmInstrumentAlgorithmNodeDescriptor): boolean => 
      (testNode.oscType == 'adder') == templateNode.isAdder &&
      templateNode.subNodes.length == testNode.modulators.length &&
      !templateNode.subNodes.find((subTemplateNode, index) => !templateFits(subTemplateNode, testNode.modulators[index]));

    return TOPOLOOGY_TEMPLATES.findIndex(template => templateFits(template, node));
  }

  notifyResourceDirty(): void {
    this._cachedOperatorWaveformForNode = null;
    this.resultWaveform = this.computeWaveform(ScriptSynthFmInstrument.fromDescriptor(this._editedResource!), DEFAULT_FM_RENDER_DURATION);    
    this.resourceEdited.emit();    
  }

  async playResourcePreview(): Promise<PlayingPreviewStopHandler | null> { 
    const fmInstrument = this.editedResource;
    const synth = this._synthEngine.sequencer.tsynthToneGenerator;

    this._synthEngine.resumeAudioContext();

    if(!this._registeredInstrument) {
      this._registeredInstrument = `$$WAVEDITOR${Math.random()}`;
    }
    
    await synth.createFmInstrument(this._registeredInstrument, this._editedResource);

    await synth.executeImmediateCommand({
      releaseNote: true
    });

    this._playbackStartTime = await synth.executeImmediateCommand({
      newNote: {
        instrumentId: this._registeredInstrument,
        note: 24
      },
      volume: 1,
      panning: 0.5      
    });

    return () => this.handlePreviewStop();
  }

  async handlePreviewStop() {
    const synth = this._synthEngine.sequencer.tsynthToneGenerator;

    await synth.executeImmediateCommand({
        releaseNote: true
    });

    this._playbackStartTime = null;
  }


  public handleZoomInClick() {
    this.updateZoomByFactor(1/1.5);
  }

  public handleZoomOutClick() {
    this.updateZoomByFactor(1.5);
  }

  public handleZoomToSelectionClick() {
    if(this.selectionStartTime == null || this.selectionEndTime == null) {
      this.setZoomRange(0, this.resultWaveformDuration);
    } else {
      this.setZoomRange(this.selectionStartTime, this.selectionEndTime);
    }
  }

  private updateZoomByFactor(factor: number) {
    const midTime = (this.resultDisplayEndTime + this.resultDisplayStartTime) / 2;    
    const newTimeRange = (this.resultDisplayEndTime - this.resultDisplayStartTime) * factor;
    
    let start = Math.max(midTime - newTimeRange / 2, 0);
    let end = Math.min(midTime + newTimeRange / 2, this.resultWaveformDuration);

    this.setZoomRange(start, end);
  }

  private setZoomRange(startTime: number, endTime: number) {
    this.resultDisplayStartTime = startTime;
    this.resultDisplayEndTime = endTime;
  }

  
  get operatorWaveform(): EditedWaveform | null {
    if(!this.editedAlgorithmNode) {
      return null;
    }

    if(this._cachedOperatorWaveformForNode != this.editedAlgorithmNode) {
      const isolatedOperatorDescriptor: FmInstrumentDescriptor = { 
        rootAlgorithmNode: Object.assign({}, this.editedAlgorithmNode, { modulators: [] })
      };      
      const isolatedOperatorNode = ScriptSynthFmInstrument.fromDescriptor(isolatedOperatorDescriptor);
      this._cachedOperatorWaveformForNode = this.editedAlgorithmNode;
      this._cachedOperatorWaveform = this.computeWaveform(isolatedOperatorNode, DEFAULT_FM_RENDER_DURATION)
    }

    return this._cachedOperatorWaveform;
  }

  get resultWaveformDuration() {
    return this.resultWaveform 
      ? this.resultWaveform.channelSamples[0].length / this.resultWaveform.sampleRate
      : 0;
  }

  set editorState(value: FmInstrumentEditorState) {
    this.selectedAlgorithmNodeBookmark = value.selectedAlgorithmNodeIndex ?? 0;
  }

  get editorState(): FmInstrumentEditorState {
    return {
      selectedAlgorithmNodeIndex: this.selectedAlgorithmNodeBookmark
    }
  }

  handleEditedAlgorithmNodeSelected(algorithmNode: FmInstrumentAlgorithmNodeDescriptor | null) {
    this.editedAlgorithmNode = algorithmNode;
  }
}