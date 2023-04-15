import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ChorusEffectParameters } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthInstrumentFm';

@Component({
  selector: 'app-chorus-effect-editor',
  templateUrl: './chorus-effect-editor.component.html',
  styleUrls: ['./chorus-effect-editor.component.scss']
})
export class ChorusEffectEditorComponent implements OnInit {

  constructor() { }

  @Input()
  chorusEffectParameters: ChorusEffectParameters | undefined;

  @Output()
  chorusEffectParametersChange = new EventEmitter<ChorusEffectParameters>();

  ngOnInit(): void {
  }

  get chorusMixLevel(): number {
    return this.chorusEffectParameters!.chorusMixLevel;
  }

  set chorusMixLevel(v: number) {
    this._updateChorusEffect({ chorusMixLevel: v });    
  }

  get chorusScaling(): number {
    return this.chorusEffectParameters!.chorusScaling;
  }

  set chorusScaling(v: number) {
    this._updateChorusEffect({ chorusScaling: v });    
  }

  get chorusLfoFrequency(): number {
    return this.chorusEffectParameters!.chorusLfoFrequency;
  }

  set chorusLfoFrequency(v: number) {
    this._updateChorusEffect({ chorusLfoFrequency: v });    
  }

  get chorusDelay(): number {
    return this.chorusEffectParameters!.chorusDelay;
  }

  set chorusDelay(v: number) {
    this._updateChorusEffect({ chorusDelay: v });    
  }

  private _updateChorusEffect(changes: Partial<ChorusEffectParameters>) {
    const newObject = Object.assign({}, this.chorusEffectParameters, changes);
    this.chorusEffectParametersChange.emit(newObject);
  }
}
