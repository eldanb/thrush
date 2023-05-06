import { IScriptSynthInstrumentFilter } from "../ScriptSynthInstrument";

export class ModeledFrequencyResponseFilter implements IScriptSynthInstrumentFilter {
  filterHandleLeft: number | null = null;
  filterHandleRight: number | null = null;

  constructor(frequencyResponseCurve: Float64Array, 
              windowSize: number, 
              applyBlackman: boolean,
              private _sampleRate: number) {    

    const impulseResponse = this.truncatedIfft(frequencyResponseCurve, windowSize);
    if(applyBlackman) {
      this.applyBlackmanWindow(impulseResponse);
    }
            
    this.filterHandleLeft = this.allocEqFilterWithImpulseResponse(impulseResponse);
    this.filterHandleRight = this.allocEqFilterWithImpulseResponse(impulseResponse);      
  }

  private allocEqFilterWithImpulseResponse(impulseResponse: Float64Array): number {
    const eqFilterHandle = allocFilterHandle();
    const filterOffset = maxFilterLen * eqFilterHandle;

    wasmModule.instance.exports.initFilter(eqFilterHandle, filterBufferStartOfs + filterOffset * 8, impulseResponse.length);
    for(let idx=0; idx<impulseResponse.length; idx++) {
      filterArray[filterOffset + idx] = BigInt(Math.round(impulseResponse[idx] * FIXEDPOINT_FACTOR));      
    }

    return eqFilterHandle;
  }
  
  private applyBlackmanWindow(samples: Float64Array) {
    for(let index = 0; index < samples.length; index++) {
      samples[index] *= 
        0.42 - 
        0.5 * Math.cos(index/samples.length * 2 * Math.PI) + 
        0.08 * Math.cos(index/samples.length * 2 * Math.PI);
    }
  }
  
  private truncatedIfft(frequencyDomain: Float64Array, truncatedWindow: number) {            
    const impulseResponse = new Float64Array(truncatedWindow);
    const windowMid = truncatedWindow / 2;
    for(let index=0; index < windowMid; index++) {
      let responseElement = 0;
      for(let freqIndex = 0; freqIndex < frequencyDomain.length; freqIndex++) {
        responseElement += frequencyDomain[freqIndex] 
          * Math.cos((index / frequencyDomain.length) * Math.PI * freqIndex);
      }

      responseElement /= frequencyDomain.length;
      
      impulseResponse[windowMid + index] = responseElement;
      impulseResponse[windowMid - 1 - index] = responseElement;
    }

    return impulseResponse;
  }

  filter(inputOutput: number[]): void {
    inputOutput[0] = 
      wasmModule.instance.exports.applyFilter(this.filterHandleLeft, Math.round(inputOutput[0]*FIXEDPOINT_FACTOR))/(FIXEDPOINT_FACTOR);
    inputOutput[1] = 
        wasmModule.instance.exports.applyFilter(this.filterHandleRight, Math.round(inputOutput[1]*FIXEDPOINT_FACTOR))/(FIXEDPOINT_FACTOR);
  }
}

let wasmModule: any;

const numFilterHandles = 32;
const maxFilterLen = 1024;

let nextHandleToAlloc = 0;
let filterBufferStartOfs = 0;
const filterMemory = new WebAssembly.Memory({initial: 10});
let filterArray: BigInt64Array;

async function initializeFilters() {
   
    const wasmContent = require('!!uint8array-loader!../wasm/synthRoutines.wasm.embed');
    
    wasmModule = await WebAssembly.instantiate(wasmContent!, {
      "js": {
        "memory": filterMemory
      }
    });

    filterBufferStartOfs = wasmModule.instance.exports.allocFilterHandles(numFilterHandles, maxFilterLen);    
    filterArray = new BigInt64Array(filterMemory.buffer, filterBufferStartOfs, numFilterHandles * maxFilterLen);    
    console.log('filters loaded!');
}

function allocFilterHandle() {
  const ret = nextHandleToAlloc++;
  if(nextHandleToAlloc >= numFilterHandles) {
    nextHandleToAlloc = 0;
  }
  return ret;
}

try { 
  initializeFilters();
} catch(e) {
  console.log("error loading filters", e);  
}

const FIXEDPOINT_FACTOR = 256 * 65536;
