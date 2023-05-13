import { Component, OnInit } from '@angular/core';
import { ResonantMultimodeFilterParameters, ReverbFilterParameters } from 'src/lib/thrush_engine/synth/scriptsynth/filters/FilterParametersParser';
import { IFilterEditorComponent } from '../filter-editing-support';
import { ResonantMultimodeFilterMode } from 'src/lib/thrush_engine/synth/scriptsynth/filters/ResonantMultimodeFilter';

@Component({
  templateUrl: './reverb-filter-editor.component.html',
  styleUrls: ['./reverb-filter-editor.component.scss']
})
export class ReverbFilterEditorComponent 
       implements OnInit, 
                  IFilterEditorComponent<ReverbFilterParameters> {

  constructor() { 
    this.filter = {
      type: "reverb",
      combDelays: [], 
      combGains: [], 
      allPassDelays: [], 
      allPassGains: []
    }
    this.onFilterChange = () => 0;
  }

  filter: ReverbFilterParameters;
  onFilterChange: (f: ReverbFilterParameters) => void;


  ngOnInit(): void {
  }

  handleCombDelayChange(index: number, event: Event) {
    const delay = (event.target as HTMLInputElement).valueAsNumber;
    
    const updatedCombDelays = [...this.filter.combDelays];
    updatedCombDelays[index] = delay;    
    this._updateFilter({ combDelays: updatedCombDelays });
  }

  handleCombGainChange(index: number, event: Event) {
    const gain = (event.target as HTMLInputElement).valueAsNumber;
    
    const updatedCombGains = [...this.filter.combGains];
    updatedCombGains[index] = gain;    
    this._updateFilter({ combGains: updatedCombGains });
  }

  handleAllPassDelayChange(index: number, event: Event) {
    const delay = (event.target as HTMLInputElement).valueAsNumber;
    
    const updatedAllPassDelays = [...this.filter.allPassDelays];
    updatedAllPassDelays[index] = delay;    
    this._updateFilter({ allPassDelays: updatedAllPassDelays });
  }

  handleAllPassGainChange(index: number, event: Event) {
    const gain = (event.target as HTMLInputElement).valueAsNumber;
    
    const updatedAllPassGains = [...this.filter.allPassGains];
    updatedAllPassGains[index] = gain;    
    this._updateFilter({ allPassGains: updatedAllPassGains });
  }

  private _updateFilter(changes: Partial<ReverbFilterParameters>) {
    const newObject = Object.assign(this.filter, changes);
    this.onFilterChange(newObject);
  }
}
