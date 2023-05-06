import { Component, EventEmitter, Input, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { FilterDefinition, FilterTypes } from 'src/lib/thrush_engine/synth/scriptsynth/filters/FilterParametersParser';
import { FilterEditingSupport } from '../filter-editing-support';

@Component({
  selector: 'app-filter-chain-editor',
  templateUrl: './filter-chain-editor.component.html',
  styleUrls: ['./filter-chain-editor.component.scss']
})
export class FilterChainEditorComponent {


  @Input()
  public filterChain: FilterDefinition[] | undefined;

  @Output()
  public filterChainChange = new EventEmitter<FilterDefinition[] | undefined>();

  constructor(private _vcr: ViewContainerRef) { 
    this.filterChain = [];
  }

  updateFilter(index: number, newValue: FilterDefinition) {
    const newFilterChain = this.filterChain || [];
    newFilterChain[index] = newValue;
    this.filterChainChange.emit(newFilterChain);
  }

  addFilter(filterType: FilterTypes) {
    const newFilter = FilterEditingSupport[filterType].createDefault()
    this.filterChainChange.emit([...(this.filterChain || []), newFilter]);
  }

  swapFilters(index1: number, index2: number) {
    const newFilterChain = this.filterChain || [];
    const temp = newFilterChain[index1];
    newFilterChain[index1] = newFilterChain[index2];
    newFilterChain[index2] = temp;

    this.filterChainChange.emit(newFilterChain);
  }

  deleteFilter(index: number) {
    this.filterChain?.splice(index, 1);
    this.filterChainChange.emit(this.filterChain); 
  }

  getFilterTitle(filterTypeName: FilterTypes) {
    return FilterEditingSupport[filterTypeName].displayName;
  }

  get filterTypeNames(): FilterTypes[] {
    return Object.keys(FilterEditingSupport) as FilterTypes[];
  }

}
