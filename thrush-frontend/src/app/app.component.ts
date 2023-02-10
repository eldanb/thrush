import { Component, OnInit } from '@angular/core';
import { ThrushProject } from 'src/lib/project-datamodel/project-datamodel';
import { ThrushProjectController } from 'src/lib/project-datamodel/thrush-project-controller';
import { ThrushEngineService } from './services/thrush-engine.service';
import { AppUiFrameworkService } from './widget-lib/ui-region-content/app-ui-framework.service';


const BLANK_PROJECT: ThrushProject = require('src/assets/example-projects/blank.thrush.json');

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [AppUiFrameworkService]
})
export class AppComponent implements OnInit {
  title = 'thrush';

  public currentProjectController: ThrushProjectController | null = null;

  constructor(private _thrushEngine: ThrushEngineService) {    
  }

  ngOnInit(): void {
   this.asyncInitialize();
  }

  async asyncInitialize() {
    await this._thrushEngine.initialize();   
    this.currentProjectController = new ThrushProjectController(Object.assign({}, BLANK_PROJECT), this._thrushEngine.sequencer)
   }

  handleDownloadProject() {
    const file = new Blob([JSON.stringify(this.currentProjectController!.project)], {type: "application/json"});

    const url = URL.createObjectURL(file);

    const dlanchor = document.createElement("a");
    dlanchor.href = url;
    dlanchor.download = `${this.currentProjectController!.project.title}.thrush.json`;
    document.body.appendChild(dlanchor);
    dlanchor.click();
    setTimeout(function() {
        document.body.removeChild(dlanchor);
        window.URL.revokeObjectURL(url);  
    }, 0); 
  }
}
