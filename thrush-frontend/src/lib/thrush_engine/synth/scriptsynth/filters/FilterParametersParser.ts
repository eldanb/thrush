import { IScriptSynthInstrumentFilter } from "../ScriptSynthInstrument";
import { ChorusFilter } from "./ChorusFilter";
import { FilterChain } from "./FilterChain";
import { ModeledFrequencyResponseFilter } from "./ModeledFrequencyResponseFilter";
import { ResonantMultimodeFilter, ResonantMultimodeFilterMode } from "./ResonantMultimodeFilter";


export type EqFilterParameters = {
  type: 'eq';
  windowSize: number;  
  lowFreq: number | null;
  highFreq: number | null;
}

export type ChorusFilterParameters = {
  type: 'chorus';
  mixLevel: number;
  depth: number;
  frequency: number;
  delay: number;
}

export type ResonantMultimodeFilterParameters = {
  type: 'resonant';
  mode: ResonantMultimodeFilterMode;
  cutoff: number;
  resonance: number;
}

export type FilterDefinition = EqFilterParameters | ChorusFilterParameters | ResonantMultimodeFilterParameters;
export type FilterTypes = FilterDefinition['type'];
export type FilterParamsByTypes = {
  [filterType in FilterTypes]: FilterDefinition & {type: filterType};
};

const FilterBuilders: { 
  [filterType in FilterTypes]: (params: FilterParamsByTypes[filterType], sampleRate: number) => IScriptSynthInstrumentFilter
} = {
  eq: CreateEqFilter,
  chorus: CreateChorusFilter,
  resonant: CreateMultimodeResonantFilter
};

function CreateEqFilter(params: EqFilterParameters, sampleRate: number): IScriptSynthInstrumentFilter {
    const filterFrequencyResponse = new Float64Array(sampleRate / 2);

    // Lowpass
    if(params.lowFreq == null) {
      for(let index = 0; index < params.highFreq!; index++) {
        filterFrequencyResponse[index] = 1;
      }
    } else 
    // Highpass
    if(params.highFreq == null) {
      for(let index = params.lowFreq!; index<filterFrequencyResponse.length; index++) {
        filterFrequencyResponse[index] = 1;
      }
    } else 
    // Bandpass    
    {
      for(let index = params.lowFreq; index < params.highFreq!; index++) {
        filterFrequencyResponse[index] = 1;
      }      
    }

  return new ModeledFrequencyResponseFilter(filterFrequencyResponse, params.windowSize, true, sampleRate);
}

function CreateChorusFilter(params: ChorusFilterParameters, sampleRate: number): IScriptSynthInstrumentFilter {
  return new ChorusFilter(params.delay, params.frequency, params.depth, params.mixLevel, sampleRate);
}

export function CreateFilterChain(filterDefinitions: FilterDefinition[], sampleRate: number) {
  const filters = filterDefinitions.map(def => 
    FilterBuilders[def.type](def as any, sampleRate));

  return filters.length == 1 
    ? filters[0]
    : new FilterChain(filters);
}

function CreateMultimodeResonantFilter(params: ResonantMultimodeFilterParameters, sampleRate: number): IScriptSynthInstrumentFilter {
  return new ResonantMultimodeFilter(params.mode, params.cutoff, params.resonance, sampleRate);
}
