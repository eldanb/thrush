import { Component, Injectable, OnInit, ViewContainerRef } from '@angular/core';
import { ThrushEngineService } from './services/thrush-engine.service';
import { AppUiFrameworkService } from './widget-lib/ui-region-content/app-ui-framework.service';





@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [AppUiFrameworkService]
})
export class AppComponent implements OnInit {
  title = 'thrush';

  constructor(private _thrushEngine: ThrushEngineService,
              ) {
  }

  ngOnInit(): void {
   this._thrushEngine.initialize();   
  }
}
