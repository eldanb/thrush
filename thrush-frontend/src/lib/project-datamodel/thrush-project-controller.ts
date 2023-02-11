import { ThrushSequencer } from "../thrush_engine/ThrushSequencer";
import { Base64ToFloat32ArrayLe, ResourceType, ResourceTypeAbstractWaveInstrument, ResourceTypeScript, ResourceTypes, ThrushProject, ThrushProjectResourceWithType, ThrushProjectTypedResource } from "./project-datamodel";

type ResourceUpdateHandler = {
  [resourceType in ResourceType as `update_${resourceType}`]: (name: string, resource: ResourceTypes[resourceType]) => Promise<void>;
}

type ResourceCreationHandler = {
  [resourceType in ResourceType as `create_${resourceType}`]: () => Promise<ThrushProjectResourceWithType<resourceType>>;
}

const EMPTY_PROJECT = {
  title: 'Untitled',
  resources: {}
};

export class ThrushProjectController implements ResourceUpdateHandler, ResourceCreationHandler {
  private _registeredInstrumentIds: Record<string, number> = {};
  
  constructor(
    private _dataModel: ThrushProject = Object.assign({}, EMPTY_PROJECT),
    private _sequencer: ThrushSequencer    
    ) {
  }
  
  public get project(): ThrushProject {
    return this._dataModel;
  }
  
  async update_script(name: string, resource: ResourceTypeScript) {    
  }

  async update_abst_wave_instrument(name: string, resource: ResourceTypeAbstractWaveInstrument) {
    const hasLoop = resource.loopStartTime && resource.loopEndTime;

    
    await this._sequencer.tsynthToneGenerator.createInstrument(
      name,
      new Float32Array(Base64ToFloat32ArrayLe(resource.samplesBase64)),
      resource.sampleRate,
      hasLoop
        ? resource.loopStartTime * resource.sampleRate
        : 0,
      hasLoop
        ? (resource.loopEndTime-resource.loopStartTime) * resource.sampleRate
        : 0,
      1, 
      resource.entryEnvelopes,
      resource.exitEnvelopes);
  }
  
  async create_script(): Promise<ThrushProjectResourceWithType<'script'>> {
    return {
      type: 'script',
      code: '',
    };    
  }

  async create_abst_wave_instrument(): Promise<ThrushProjectResourceWithType<'abst_wave_instrument'>> {
    return {
      type: 'abst_wave_instrument',
      entryEnvelopes: {
        volume: []
      },
      exitEnvelopes: {
        volume: []
      },
      sampleRate: 8000,
      samplesBase64: "",
      loopStartTime: 0,
      loopEndTime: 0
    }
  }

  async createResource(resourceType: ResourceType) {
    let suggestedName;
    let untitledIndex = 1;
    do {
      suggestedName = `${resourceType}${untitledIndex}`;
      untitledIndex++;
    } while(this._dataModel.resources[suggestedName]);


    this._dataModel.resources[suggestedName] = await this[`create_${resourceType}`]();

    return suggestedName;
  }

  async saveResource(resourceName: string, resource: ThrushProjectTypedResource) {
    this._dataModel.resources[resourceName] = resource;
    await this[`update_${resource.type}`](resourceName, <any>resource);
  }

  async loadAllToSynthEngine() {
    await Promise.all(Object.entries(this._dataModel.resources).map(([resourceName, resource]) => 
      this[`update_${resource.type}`](resourceName, <any>resource)));      
  }
}