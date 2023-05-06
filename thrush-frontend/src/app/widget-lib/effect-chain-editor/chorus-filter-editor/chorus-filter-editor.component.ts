import { Component, OnInit } from '@angular/core';
import { ChorusFilterParameters } from 'src/lib/thrush_engine/synth/scriptsynth/filters/FilterParametersParser';
import { IFilterEditorComponent } from '../filter-editing-support';

@Component({
  templateUrl: './chorus-filter-editor.component.html',
  styleUrls: ['./chorus-filter-editor.component.scss']
})
export class ChorusFilterEditorComponent implements OnInit, IFilterEditorComponent<ChorusFilterParameters> {

  constructor() { 
    this.filter = {
      type: "chorus",
      delay: 0,
      frequency: 0,
      mixLevel: 0,
      depth: 0,
    }
    this.onFilterChange = () => 0;
  }

  filter: ChorusFilterParameters;
  onFilterChange: (f: ChorusFilterParameters) => void;


  ngOnInit(): void {
  }

  get chorusMixLevel(): number {
    return this.filter.mixLevel;
  }

  set chorusMixLevel(v: number) {
    this._updateChorusFilter({ mixLevel: v });    
  }

  get chorusScaling(): number {
    return this.filter.depth;
  }

  set chorusScaling(v: number) {
    this._updateChorusFilter({ depth: v });    
  }

  get chorusLfoFrequency(): number {
    return this.filter.frequency;
  }

  set chorusLfoFrequency(v: number) {
    this._updateChorusFilter({ frequency: v });    
  }

  get chorusDelay(): number {
    return this.filter.delay;
  }

  set chorusDelay(v: number) {
    this._updateChorusFilter({ delay: v });    
  }

  private _updateChorusFilter(changes: Partial<ChorusFilterParameters>) {
    const newObject = Object.assign(this.filter, changes);
    this.onFilterChange(newObject);
  }
}
