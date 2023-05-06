import { Component } from '@angular/core';
import { EqFilterParameters } from 'src/lib/thrush_engine/synth/scriptsynth/filters/FilterParametersParser';
import { IFilterEditorComponent } from '../filter-editing-support';

@Component({
  templateUrl: './equalizer-filter-editor.component.html',
  styleUrls: ['./equalizer-filter-editor.component.scss']
})
export class EqualizerFilterEditorComponent implements IFilterEditorComponent<EqFilterParameters> {
  filter: EqFilterParameters;
  onFilterChange: (f: EqFilterParameters) => void;

  constructor() { 
    this.filter = {
      type: 'eq',
      lowFreq: 500,
      highFreq: null,
      windowSize: 48
    };

    this.onFilterChange = () => 0;
  }

  get filterType(): "bandpass" | "lowpass" | "highpass" {
    if(this.filter.highFreq == null) {
      return "highpass";
    }

    if(this.filter.lowFreq == null) {
      return "lowpass";
    }

    return "bandpass"

  }

  set filterType(v : "bandpass" | "lowpass" | "highpass") {
    if((v == "highpass" || v == "bandpass")) {
      if(this.lowFreq == null) {
        this.lowFreq = 0
      }
    } else {
      this.lowFreq = null;
    }

    if((v == "lowpass" || v == "bandpass")) {
      if(this.highFreq == null) {
        this.highFreq = 22050;
      }
    } else {
      this.highFreq = null;
    }
  }

  get highFreq(): number | null {
    return this.filter.highFreq;
  }

  set highFreq(v: number | null) {
    this._updateFilter({ highFreq: v });    
  }

  get lowFreq(): number | null {
    return this.filter.lowFreq;
  }

  set lowFreq(v: number | null) {
    this._updateFilter({ lowFreq: v });    
  }

  get windowSize(): number {
    return this.filter.windowSize;
  }

  set windowSize(v: number) {
    this._updateFilter({ windowSize: v });    
  }

  private _updateFilter(updates: Partial<EqFilterParameters>) {
    Object.assign(this.filter, updates);
    this.onFilterChange(this.filter);
  }
}
