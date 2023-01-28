import { ThrushSequencer } from "../thrush_engine/ThrushSequencer";
import { Base64ToFloat32ArrayLe, ResourceType, ResourceTypeAbstractWaveInstrument, ResourceTypeScript, ResourceTypes, ThrushProject, ThrushProjectTypedResource } from "./project-datamodel";

type ResourceUpdateHandler = {
  [resourceType in ResourceType as `update_${resourceType}`]: (name: string, resource: ResourceTypes[resourceType]) => Promise<void>;
}

const EMPTY_PROJECT = {
  title: 'Untitled',
  resources: {}
};

class ThrushProjectController implements ResourceUpdateHandler {
  private _registeredInstrumentIds: Record<string, number> = {};
  
  constructor(
    private _dataModel: ThrushProject = Object.assign({}, EMPTY_PROJECT),
    private _sequencer: ThrushSequencer    
    ) {
  }
  
  
  async update_script(name: string, resource: ResourceTypeScript) {    
  }

  async update_abst_wave_instrument(name: string, resource: ResourceTypeAbstractWaveInstrument) {
    const hasLoop = resource.loopStartTime && resource.loopEndTime;

    if(this._registeredInstrumentIds[name] === undefined) {
      const instrumentId = await this._sequencer.tsynthToneGenerator.createInstrument(
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
      this._registeredInstrumentIds[name] = instrumentId;
    } else {
      await this._sequencer.tsynthToneGenerator.updateInstrument(
        this._registeredInstrumentIds[name],
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
  }

  async saveResource(resourceName: ResourceType, resource: ThrushProjectTypedResource) {
    this._dataModel.resources[resourceName] = resource;
    await this[`update_${resourceName}`](resourceName, <any>resource);
  }
}