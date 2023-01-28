import { AfterViewInit, Component, EmbeddedViewRef, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { AppUiFrameworkService, PluggableFrameworkRegion } from './app-ui-framework.service';

@Component({
  selector: 'app-ui-region-content',
  templateUrl: './ui-region-content.component.html',
  styleUrls: ['./ui-region-content.component.scss']
})
export class UiRegionContentComponent implements OnInit, AfterViewInit, OnDestroy {


  @ViewChild("regionContent", { read: TemplateRef })
  private _regionContentTemplate: TemplateRef<any> | null = null;
  private _createdContent: EmbeddedViewRef<any> | null = null;

  @Input()
  public region: PluggableFrameworkRegion = "toolbar";
  
  constructor(private _uiFrameworkService: AppUiFrameworkService) {   
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this._uiFrameworkService.getRegion(this.region).subscribe((cr) => {
      if(this._regionContentTemplate && cr) {
        this._createdContent = cr.createEmbeddedView(this._regionContentTemplate);
      } 
    });
  }

  ngOnDestroy(): void {
      if(this._createdContent) {
        this._createdContent.destroy();
        this._createdContent = null;
      }
  }
  
}
