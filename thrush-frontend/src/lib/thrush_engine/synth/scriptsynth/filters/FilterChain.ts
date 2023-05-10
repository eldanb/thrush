import { IScriptSynthInstrumentFilter } from "../ScriptSynthInstrument";

export class FilterChain implements IScriptSynthInstrumentFilter {
  constructor(private _filters: IScriptSynthInstrumentFilter[]) {

  }

  filter(inputOutput: number[]): void {
    let numFilters = this._filters.length;
    for(let i=0; i<numFilters; i++) {
      this._filters[i].filter(inputOutput);
    }
  }
}