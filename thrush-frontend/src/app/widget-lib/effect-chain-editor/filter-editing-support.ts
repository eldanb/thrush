import { Component, Type } from "@angular/core";
import { FilterParamsByTypes, FilterTypes } from "src/lib/thrush_engine/synth/scriptsynth/filters/FilterParametersParser";
import { ChorusFilterEditorComponent } from "./chorus-filter-editor/chorus-filter-editor.component";
import { EqualizerFilterEditorComponent } from "./equalizer-filter-editor/equalizer-filter-editor.component";

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
  }
}