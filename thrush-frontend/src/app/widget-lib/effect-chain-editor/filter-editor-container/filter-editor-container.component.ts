import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { FilterDefinition } from 'src/lib/thrush_engine/synth/scriptsynth/filters/FilterParametersParser';
import { FilterEditingSupport, FilterEditorCopmonent } from '../filter-editing-support';

@Component({
  selector: 'app-filter-editor-container',
  templateUrl: './filter-editor-container.component.html',
  styleUrls: ['./filter-editor-container.component.scss']
})
export class FilterEditorContainerComponent implements AfterViewInit {
  
  @ViewChild("filterEditorContainer", {read: ViewContainerRef})
  private _vcr: ViewContainerRef | null = null;

  private _editedFilter: FilterDefinition | null = null;

  @Input()
  public get editedFilter(): FilterDefinition | null {
    return this._editedFilter;
  }

  public set editedFilter(v: FilterDefinition | null) {
    const typeChange = (this._editedFilter?.type != v?.type);
    this._editedFilter = v;

    if(typeChange) {
      this._refreshFilterEditorComponent();
    }
  }

  @Output()
  public editedFilterChanged = new EventEmitter<FilterDefinition>();


  constructor() { 


  }

  ngAfterViewInit(): void {
    this._refreshFilterEditorComponent();
  }

  private _refreshFilterEditorComponent() {
    this._vcr?.clear();
    if(this._editedFilter) {
      const editorComponent = this._vcr?.createComponent(FilterEditingSupport[this._editedFilter.type].componentType! as FilterEditorCopmonent<FilterDefinition>);
      if(editorComponent?.instance) {
        editorComponent.instance.filter = this._editedFilter;
        editorComponent.instance.onFilterChange = (f) => this.editedFilterChanged.emit(f);
      }
    }  
  }

}
