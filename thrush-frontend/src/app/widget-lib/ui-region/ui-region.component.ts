import { Component, Input, OnInit, ViewContainerRef } from '@angular/core';
import { AppUiFrameworkService, PluggableFrameworkRegion } from '../ui-region-content/app-ui-framework.service';

@Component({
  selector: 'app-ui-region',
  templateUrl: './ui-region.component.html',
  styleUrls: ['./ui-region.component.scss']
})
export class UiRegionComponent implements OnInit {

  @Input()
  region: PluggableFrameworkRegion = "toolbar";

  constructor(private _uiFramework: AppUiFrameworkService, private _vcr: ViewContainerRef) { }

  ngOnInit(): void {
    this._uiFramework.connectRegion(this.region, this._vcr);
  }

}
