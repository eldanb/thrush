import { Envelopes } from "../thrush_engine/synth/native/NativeSynthesizerInstrument";

export type ThrushProject = {
  title: string;
  resources: Record<string, ThrushProjectTypedResource>;
}

export type ResourceTypes = {
  'script': ResourceTypeScript,
  'abst_wave_instrument': ResourceTypeAbstractWaveInstrument
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
  exitEnvelopes: Envelopes
}

export type ThrushProjectResourceWithType<K> = 
  K extends keyof ResourceTypes ? ({ type: K } & ResourceTypes[K]) : never;

export type ThrushProjectTypedResource = ThrushProjectResourceWithType<keyof ResourceTypes>;

export type ResourceType = keyof ResourceTypes;

function Base64ToFloat32ArrayLe(b64: string) {
  const binaryContent = atob(b64);
  const uintBuffer = new Uint8Array(binaryContent.length);
  for(let index = 0; index < binaryContent.length; index++) {
    uintBuffer[index] = binaryContent.charCodeAt(index);
  }

  const dataView = new DataView(uintBuffer.buffer);
  const result = new Float32Array(dataView.byteLength / Float32Array.BYTES_PER_ELEMENT);
  for(let index = 0; index < result.length; index++) {
    result[index] = dataView.getFloat32(index * Float32Array.BYTES_PER_ELEMENT, true);
  }
  
  return result;
}
  
function Float32ArrayToBase64Le(arr: Float32Array) {
  const binaryBuffer = new ArrayBuffer(arr.length * Float32Array.BYTES_PER_ELEMENT);
  const dataView = new DataView(binaryBuffer);
  arr.forEach((value, index) => {
    dataView.setFloat32(index * Float32Array.BYTES_PER_ELEMENT, value, true);
  });

  const binaryString = Array.from(new Uint8Array(binaryBuffer)).map(b => String.fromCharCode(b)).join('');
  return btoa(binaryString);
}

export function WaveformToJson(waveform: Float32Array) {
  return Float32ArrayToBase64Le(waveform);
}
  

export function JsonToWaveform(json: any) {
  return Base64ToFloat32ArrayLe(json);
}
