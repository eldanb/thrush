import { ThrushPattern } from "../thrush_engine/sequences/ThrushPatternSequenceGenerator";
import { Envelopes } from "../thrush_engine/synth/native/NativeSynthesizerInstrument";
import { FilterDefinition } from "../thrush_engine/synth/scriptsynth/filters/FilterParametersParser";
import { FmInstrumentDescriptor } from "../thrush_engine/synth/scriptsynth/worklet/ScriptSynthWorkerRpcInterface";
import { Base64ToFloat32ArrayLe, Float32ArrayToBase64Le } from "../util/buffers";

export type ThrushProject = {
  title: string;
  resources: Record<string, ThrushProjectTypedResource>;
}

export type ThrushProjectResourceWithType<K> = 
  K extends keyof ResourceTypes ? ({ type: K } & ResourceTypes[K]) : never;

export type ThrushProjectTypedResource = ThrushProjectResourceWithType<keyof ResourceTypes>;

export type ResourceType = keyof ResourceTypes;


export type ResourceTypes = {
  'script': ResourceTypeScript,
  'abst_wave_instrument': ResourceTypeAbstractWaveInstrument,
  'fm_instrument': ResourceTypeFmInstrument,
  'pattern': ResourceTypePattern,
}

export type ResourceTypeScript = {
  code: string;
}

export type ResourceTypeAbstractWaveInstrument = {
  samplesBase64: string,
  sampleRate: number,
  loopStartTime: number,
  loopEndTime: number,
  entryEnvelopes: Envelopes,
  exitEnvelopes: Envelopes,
  filters?: FilterDefinition[];
}

export type ResourceTypeFmInstrument = FmInstrumentDescriptor;

export type ResourceTypePattern = {
  pattern: ThrushPattern;
}

export function WaveformToJson(waveform: Float32Array) {
  return Float32ArrayToBase64Le(waveform);
}
  

export function JsonToWaveform(json: any) {
  return Base64ToFloat32ArrayLe(json);
}
