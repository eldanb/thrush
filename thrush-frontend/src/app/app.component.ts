import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ThrushProject } from 'src/lib/project-datamodel/project-datamodel';
import { ThrushProjectController } from 'src/lib/project-datamodel/thrush-project-controller';
import { ThrushEngineService } from './services/thrush-engine.service';
import { AppUiFrameworkService } from './widget-lib/ui-region-content/app-ui-framework.service';
import { ResourceOpenDialogService } from './widget-lib/resource-open-dialog/resource-open-dialog-service';
import { FileBrowserFileDetails, IFileOpenBrowseSource } from './widget-lib/resource-open-dialog/resource-open-dialog.component';


const BLANK_PROJECT: ThrushProject = require('src/assets/example-projects/blank.thrush.json');


class SampleProjectsBrowser implements IFileOpenBrowseSource {
  
  async getFilesInFolder(folderId?: string | undefined): Promise<FileBrowserFileDetails[]> {
    return [
      './assets/example-projects/part-notation.thrush.json',
    ].map((url) => {
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length-1];
      const basename = filename.split('.')[0]
      return {
        isFolder: false,
        id: url,
        name: basename
      };
    });
  }

  async getFileContent(fileId: string): Promise<ArrayBuffer> {
    const result = await fetch(fileId);
    return await result.arrayBuffer();    
  }
  
  public readonly displayName: string = "Examples";
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [AppUiFrameworkService]
})
export class AppComponent implements AfterViewInit {
  title = 'thrush';

  public currentProjectController: ThrushProjectController | null = null;

  constructor(
    private _thrushEngine: ThrushEngineService,
    private _fileOpenDlg: ResourceOpenDialogService) {    
  }

  ngAfterViewInit(): void {
    this.asyncInitialize();
  }

  async asyncInitialize() {
    await this._thrushEngine.initialize();
    await this.loadProject(Object.assign({}, BLANK_PROJECT));
  }

  async handleLoadProject() {
    const fileArrayBuffer = await this._fileOpenDlg.open({
      title: 'Select Project to Open',
      allowLocal: true,
      browseSources: [new SampleProjectsBrowser()]
    });

    const projectJson = JSON.parse(new TextDecoder().decode(fileArrayBuffer));
    this.loadProject(projectJson);    
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

  async loadProject(projectJson: ThrushProject) {
    this.currentProjectController = new ThrushProjectController(projectJson, this._thrushEngine.sequencer);
    await this.currentProjectController.loadAllToSynthEngine();
  }
}
