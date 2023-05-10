import { Component, OnInit } from '@angular/core';
import { ResonantMultimodeFilterParameters } from 'src/lib/thrush_engine/synth/scriptsynth/filters/FilterParametersParser';
import { IFilterEditorComponent } from '../filter-editing-support';
import { ResonantMultimodeFilterMode } from 'src/lib/thrush_engine/synth/scriptsynth/filters/ResonantMultimodeFilter';

@Component({
  templateUrl: './resonant-filter-editor.component.html',
  styleUrls: ['./resonant-filter-editor.component.scss']
})
export class ResonantFilterEditorComponent 
       implements OnInit, 
                  IFilterEditorComponent<ResonantMultimodeFilterParameters> {

  constructor() { 
    this.filter = {
      type: "resonant",
      mode: "lp",
      resonance: 0,
      cutoff: 0.1
    }
    this.onFilterChange = () => 0;
  }

  filter: ResonantMultimodeFilterParameters;
  onFilterChange: (f: ResonantMultimodeFilterParameters) => void;


  ngOnInit(): void {
  }

  get mode(): ResonantMultimodeFilterMode {
    return this.filter.mode;
  }

  set mode(v: ResonantMultimodeFilterMode) {
    this._updateFilter({ mode: v });    
  }


  get cutoff(): number {
    return this.filter.cutoff;
  }

  set cutoff(v: number) {
    this._updateFilter({ cutoff: v });    
  }


  get resonance(): number {
    return this.filter.resonance;
  }

  set resonance(v: number) {
    this._updateFilter({ resonance: v });    
  }
  
  private _updateFilter(changes: Partial<ResonantMultimodeFilterParameters>) {
    const newObject = Object.assign(this.filter, changes);
    this.onFilterChange(newObject);
  }
}
