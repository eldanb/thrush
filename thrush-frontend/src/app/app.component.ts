import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ThrushProject } from 'src/lib/project-datamodel/project-datamodel';
import { ThrushProjectController } from 'src/lib/project-datamodel/thrush-project-controller';
import { ThrushEngineService } from './services/thrush-engine.service';
import { AppUiFrameworkService } from './widget-lib/ui-region-content/app-ui-framework.service';
import { ResourceOpenDialogService } from './widget-lib/resource-open-dialog/resource-open-dialog-service';
import { FileBrowserFileDetails, IFileOpenBrowseSource } from './widget-lib/resource-open-dialog/resource-open-dialog.component';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [AppUiFrameworkService]
})
export class AppComponent implements AfterViewInit {
  title = 'thrush';

  constructor(
    private _thrushEngine: ThrushEngineService) {    
  }

  ngAfterViewInit(): void {
    this.asyncInitialize();
  }

  async asyncInitialize() {
    await this._thrushEngine.initialize();
  }

}
