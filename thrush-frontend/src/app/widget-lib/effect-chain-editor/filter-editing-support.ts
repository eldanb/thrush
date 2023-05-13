import { Component, Type } from "@angular/core";
import { FilterParamsByTypes, FilterTypes } from "src/lib/thrush_engine/synth/scriptsynth/filters/FilterParametersParser";
import { ChorusFilterEditorComponent } from "./chorus-filter-editor/chorus-filter-editor.component";
import { EqualizerFilterEditorComponent } from "./equalizer-filter-editor/equalizer-filter-editor.component";
import { ResonantFilterEditorComponent } from "./resonant-filter-editor/resonant-filter-editor.component";
import { ReverbFilterEditorComponent } from "./reverb-filter-editor/reverb-filter-editor.component";

export interface IFilterEditorComponent<TFilter> {
  filter: TFilter;
  onFilterChange: (f: TFilter) => void;  
}

export type FilterEditorCopmonent<TFilter> = Type<Component & IFilterEditorComponent<TFilter>>;

export const FilterEditingSupport: {
  [filterType in FilterTypes]: {
    componentType: FilterEditorCopmonent<FilterParamsByTypes[filterType]> | null;
    displayName: string;
    createDefault: () => FilterParamsByTypes[filterType];
  };
} =  {
  eq : {
    componentType: EqualizerFilterEditorComponent,
    displayName: "Equalizer",
    createDefault: () => ({
      type: "eq",
      windowSize: 96,
      lowFreq: 500,
      highFreq: 800      
    })
  },

  chorus: {
    componentType: ChorusFilterEditorComponent,
    displayName: "Chorus",
    createDefault: () => ({
      type: "chorus",
      delay: 0.05,
      frequency: 4,
      mixLevel: 0.1,
      depth: 0.5
    })
  },

  resonant: {
    componentType: ResonantFilterEditorComponent,
    displayName: "Resonant",
    createDefault: () => ({
      type: "resonant",
      cutoff: 0.2,
      resonance: 0,
      mode: "lp"
    })
  },

  reverb: {
    componentType: ReverbFilterEditorComponent,
    displayName: "Reverb",
    createDefault: () => ({
      type: "reverb",
      combDelays: [0.1, 0.102, 0.104, 0.12], 
      combGains: [0.742, 0.733, 0.715, 0.697], 
      allPassDelays: [0.025, 0.007], 
      allPassGains: [0.7, 0.7]
    })
  }
}