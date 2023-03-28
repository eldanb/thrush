import { ThrushSequencer } from "../thrush_engine/ThrushSequencer";
import { JsonToWaveform, ResourceType, ResourceTypeAbstractWaveInstrument, ResourceTypeFmInstrument, ResourceTypeScript, ResourceTypes, ThrushProject, ThrushProjectResourceWithType, ThrushProjectTypedResource } from "./project-datamodel";

type ResourceUpdateHandler = {
  [resourceType in ResourceType as `update_${resourceType}`]: (name: string, resource: ResourceTypes[resourceType]) => Promise<void>;
}

type ResourceCreationHandler = {
  [resourceType in ResourceType as `create_${resourceType}`]: () => Promise<ThrushProjectResourceWithType<resourceType>>;
}


type ResourceDeletionHandler = {
  [resourceType in ResourceType as `delete_${resourceType}`]: (name: string, resource: ResourceTypes[resourceType]) => Promise<void>;
}

const EMPTY_PROJECT = {
  title: 'Untitled',
  resources: {}
};

export class ThrushProjectController implements ResourceUpdateHandler, ResourceCreationHandler, ResourceDeletionHandler {
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
      new Float32Array(JsonToWaveform(resource.samplesBase64)),
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

    await this._sequencer.waveTableSynthesizer.registerInstrument(
        name,
        new Float32Array(JsonToWaveform(resource.samplesBase64)),
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
  
  async update_fm_instrument(name: string, resource: ResourceTypeFmInstrument): Promise<void> {
    await this._sequencer.tsynthToneGenerator.createFmInstrument(name, resource.rootAlgorithmNode);
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

  async create_fm_instrument(): Promise<ThrushProjectResourceWithType<'fm_instrument'>> {
    return {
      type: 'fm_instrument',
      rootAlgorithmNode: {
        oscType: "sine",
        freqType: "multiplier",
        freqValue: 1,
        feedback: 0,
        attackEnvelope: [],
        releaseEnvelope: [],
        modulators: []
      }
    };
  }


  async delete_script(name: string, resource: ResourceTypeScript) {
  } 

  async delete_abst_wave_instrument(name: string, resource: ResourceTypeAbstractWaveInstrument) {
    await this._sequencer.tsynthToneGenerator.deleteInstrument(name);
    // TODO native synth
  }

  async delete_fm_instrument(name: string, resource: ResourceTypeFmInstrument) {
    await this._sequencer.tsynthToneGenerator.deleteInstrument(name);
  }

  async createResource(resourceType: ResourceType) {
    let suggestedName;
    let untitledIndex = 1;
    do {
      suggestedName = `${resourceType}${untitledIndex}`;
      untitledIndex++;
    } while(this._dataModel.resources[suggestedName]);

    const newResource = await this[`create_${resourceType}`]();
    this._dataModel.resources[suggestedName] = newResource;
    await this[`update_${newResource.type}`](suggestedName, <any>newResource);
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

  async renameResource(oldName: string, newName: string) {
    const existingResource = this._dataModel.resources[oldName];
    if(!existingResource) {
      throw new Error(`Can't rename nonexisting resource ${oldName}`);      
    }

    if(this._dataModel.resources[newName]) {
      throw new Error(`Can't rename resource ${oldName} to ${newName}: ${newName} already exists`);      
    }

    delete this._dataModel.resources[oldName];
    this._dataModel.resources[newName] = existingResource;

    await this[`delete_${existingResource.type}`](oldName, <any>existingResource);
    await this[`update_${existingResource.type}`](newName, <any>existingResource);
  }

  async deleteResource(resourceName: string) {
    const existingResource = this._dataModel.resources[resourceName];
    if(existingResource) {
      await this[`delete_${existingResource.type}`](resourceName, <any>existingResource);
      delete this._dataModel.resources[resourceName];
    }    
  }

}