import { ComponentType } from '@angular/cdk/portal';
import { AfterViewInit, Component, ComponentRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ResourceType, ThrushProject } from 'src/lib/project-datamodel/project-datamodel';
import { ThrushProjectController } from 'src/lib/project-datamodel/thrush-project-controller';
import { FmInstrumentEditorComponent } from '../resource-editors/fm-instrument-editor/fm-instrument-editor.component';
import { IsResourceEditorWithPlaySupport, PlayingPreviewStopHandler, ResourceEditor } from '../resource-editors/resource-editor';
import { SynthScriptEditorComponent } from '../resource-editors/synth-script-editor/synth-script-editor.component';
import { WaveInstrumentEditorComponent } from '../resource-editors/wave-instrument-editor/wave-instrument-editor.component';
import { ThrushEngineService } from '../services/thrush-engine.service';
import { ResourceOpenDialogService } from '../widget-lib/resource-open-dialog/resource-open-dialog-service';
import { FileBrowserFileDetails, IFileOpenBrowseSource } from '../widget-lib/resource-open-dialog/resource-open-dialog.component';
import { PatternEditorComponent } from '../resource-editors/pattern-editor/pattern-editor.component';
import { AmigaModPlayer2, parseModFile } from 'src/lib/formats/AmigaModParser';


type ResourceEditorDescriptor = {
  editorState: any;
  title: string;
  resourceName: string;
  resourceType: ResourceType;
  cachedComponent?: ComponentRef<ResourceEditor<any, any>>;
  draftResource: any;
  draftResourceDirty: boolean;
  dirtySubscription: Subscription | null;
}

const ResourceEditorTypes: Record<ResourceType, ComponentType<ResourceEditor<any, any>>>  = {
  abst_wave_instrument: WaveInstrumentEditorComponent,
  script: SynthScriptEditorComponent,
  fm_instrument: FmInstrumentEditorComponent,
  pattern: PatternEditorComponent
}

@Component({
  selector: 'app-project-editor',
  templateUrl: './project-editor.component.html',
  styleUrls: ['./project-editor.component.scss']
})
export class ProjectEditorComponent implements OnInit, AfterViewInit {

  @ViewChild("editorHost", { read: ViewContainerRef })
  private _editorHost: ViewContainerRef | null = null;
  private _editedProjectController: ThrushProjectController | null = null;

  public showDrawer: boolean = true;

  public renamedResourceName: string | null = null;
  public renamedResourceNewName: string | null = null;

  public projectTitleEditing: boolean = false;

  public playingPreviewStopHandler: PlayingPreviewStopHandler | null = null;

  public get activeEditorSupportsPreview(): boolean {
    const editorComponenet = this._activeEditor?.cachedComponent?.instance;
    return editorComponenet ? IsResourceEditorWithPlaySupport(editorComponenet) : false;
  }

  openEditors: ResourceEditorDescriptor[] = [ 
  ];

  private _activeEditor: ResourceEditorDescriptor | null = null;

  constructor(
    private _thrushEngine: ThrushEngineService,
    private _fileOpenDlg: ResourceOpenDialogService) { }

  ngOnInit(): void {
    (async () => {
      await this._thrushEngine.initialize();
      this.loadProject(Object.assign({}, BLANK_PROJECT));  
    })();
  }

  ngAfterViewInit(): void {
      if(this._activeEditor) {
        this.materializeCachedEditor(this._activeEditor);
      }
  }

  toggleResourceList() {
    this.showDrawer = !this.showDrawer;
  }


  get activeEditor(): ResourceEditorDescriptor | null {
    return this._activeEditor;
  }

  set activeEditor(newActiveEditor: ResourceEditorDescriptor | null) {
    if(this._activeEditor?.cachedComponent) {      
      this.destroyCachedEditor(this._activeEditor);
    }

    this._activeEditor = newActiveEditor;
    if(newActiveEditor && this._editorHost) {
      this.materializeCachedEditor(newActiveEditor);
    }    
  }

  private materializeCachedEditor(editor: ResourceEditorDescriptor) {
    if(!editor.cachedComponent) {
      editor.cachedComponent = this.createEditorComponentForResource(
        editor.resourceType,
        editor.draftResource)!;

      editor.dirtySubscription = editor.cachedComponent.instance.resourceEdited.subscribe((r) => {
        editor.draftResourceDirty = true;
        editor.draftResource = r;
      });

      if(editor.editorState) {
        editor.cachedComponent.instance.editorState = editor.editorState;
      }
    }
  }

  private destroyCachedEditor(editor: ResourceEditorDescriptor) {
    if(editor.cachedComponent) {
      editor.draftResource = editor.cachedComponent.instance.editedResource;
      editor.editorState = editor.cachedComponent.instance.editorState;
      editor.cachedComponent.destroy();
    }

    editor.cachedComponent = undefined;
    editor.dirtySubscription?.unsubscribe();
  }

  private async closeEditor(editor: ResourceEditorDescriptor): Promise<boolean> {
    this.destroyCachedEditor(editor);

    const index = this.openEditors.indexOf(editor);
    if(index >= 0) {
      this.openEditors.splice(index, 1);
    }

    return true;
  }

  private async closeAllEditors() {
    while(this.openEditors.length) {
      await this.closeEditor(this.openEditors[0]);
    }
  }

  private createEditorComponentForResource(resourceType: ResourceType, resource: any): ComponentRef<ResourceEditor<any, any>> | undefined {
    const component = this._editorHost!.createComponent(ResourceEditorTypes[resourceType]);
    component.instance.editedResource = resource;
    return component;
  }

  private getResourceEditor(resourceName: string): ResourceEditorDescriptor {
    let existingEditor = this.openEditors.find(editor => editor.resourceName == resourceName);
    if(existingEditor) {
      return existingEditor;
    }

    const editedResource = this._editedProjectController!.project.resources[resourceName];
    const newEditor: ResourceEditorDescriptor = {
      title: resourceName,
      resourceName: resourceName,
      draftResource: Object.assign({}, editedResource),
      draftResourceDirty: false,
      dirtySubscription: null,
      resourceType: editedResource.type, 
      editorState: null,
    }
    this.openEditors.push(newEditor);

    return newEditor;
  }

  public handleOpenResource(resourceName: string) {
    this.openResource(resourceName);
  }

  public async handleRequestDelete(resourceName: string) {
    const existingEditor = this.openEditors.find(editor => editor.resourceName == resourceName);
    if(existingEditor) {
      if(!(await this.closeEditor(existingEditor))) {
        return;
      }
    }

    await this._editedProjectController!.deleteResource(resourceName);
  }

  public async handleNewWavestrument() {
    const newResourceName = await this._editedProjectController!.createResource('abst_wave_instrument');
    this.openResource(newResourceName);
  }

  public async handleNewFmInstrument() {
    const newResourceName = await this._editedProjectController!.createResource('fm_instrument');
    this.openResource(newResourceName);
  }

  public async handleNewScript() {
    const newResourceName = await this._editedProjectController!.createResource('script');
    this.openResource(newResourceName);    
  }

  public async handleNewPattern() {
    const newResourceName = await this._editedProjectController!.createResource('pattern');
    this.openResource(newResourceName);    
  }

  public handleRequestRename(oldResourceName: string) {
    this.renamedResourceName = oldResourceName;
    this.renamedResourceNewName = oldResourceName;
    setTimeout(() => {
      document.getElementById('resource-rename-input')?.focus();
    }, 0);
  }

  public async handleRenameResourceFieldBlurs() {
    const renamedResourceName = this.renamedResourceName;
    const renamedResourceNewName = this.renamedResourceNewName;

    this.renamedResourceName = null;
    
    if(renamedResourceName && renamedResourceNewName) {       
      await this.renameResource(renamedResourceName, renamedResourceNewName);
    }      
  }

  public async handleRenameProjectBlurs() {
    this.projectTitleEditing = false;    
  }

  async handleLoadProject() {
    const fileOpenResult = await this._fileOpenDlg.open({
      title: 'Select Project to Open',
      allowLocal: true,
      browseSources: [new SampleProjectsBrowser()]
    });

    const projectJson = JSON.parse(new TextDecoder().decode(fileOpenResult.fileBuffer));
    this.loadProject(projectJson);    
  }
  

  handleDownloadProject() {
    const file = new Blob([JSON.stringify(this._editedProjectController!.project)], {type: "application/json"});

    const url = URL.createObjectURL(file);

    const dlanchor = document.createElement("a");
    dlanchor.href = url;
    dlanchor.download = `${this._editedProjectController!.project.title}.thrush.json`;
    document.body.appendChild(dlanchor);
    dlanchor.click();
    setTimeout(function() {
        document.body.removeChild(dlanchor);
        window.URL.revokeObjectURL(url);  
    }, 0); 
  }


  async handleImportModfile() {
    if(!this._editedProjectController) {
      return;
    }

    const projectController = this._editedProjectController;

    const fileOpenResult = await this._fileOpenDlg.open({
      title: 'Select MOD file to Open',
      allowLocal: true,
      browseSources: []
    });

    const parsedFile = parseModFile(fileOpenResult.fileBuffer);
    const modImporter = new AmigaModPlayer2(parsedFile);
    const patternsAndSong = modImporter.compileSong();
    const samples = await modImporter.createAbstWavInstruments();

    let defaultSampleBindings: string[] = [];

    samples.forEach(([modSample, abstSample]) => {
      const sampleName = projectController.suggestResourceName(`${fileOpenResult.fileName}_${modSample.sampleName}`);
      projectController.saveResource(
        sampleName,
        { type: 'abst_wave_instrument', ...abstSample });
      defaultSampleBindings.push(sampleName);
    });

    patternsAndSong.patterns.forEach((pattern, patternIndex) =>  {
      pattern.defaultInstrumentBindings =defaultSampleBindings;
      projectController.saveResource(
        projectController.suggestResourceName(`${fileOpenResult.fileName}_pattern_${patternIndex}`),
        { type: 'pattern', pattern }
      )
    });
  }
  public handleCloseTab(editor: ResourceEditorDescriptor) {
    this.closeEditor(editor);
  }

   async handleSaveClicked() {
    await this._editedProjectController!.saveResource(this.activeEditor!.resourceName, 
      Object.assign({ 'type': this.activeEditor!.resourceType }, this.activeEditor?.cachedComponent!.instance.editedResource));
    this.activeEditor!.draftResourceDirty = false;
  }

  public get editedProjectResourceNames(): string[] {
    return this._editedProjectController 
      ? Object.keys(this._editedProjectController.project.resources) 
      : [];
  }

  public get editedProjectTitle(): string {
    return this._editedProjectController?.project.title || "";
  }

  public set editedProjectTitle(name: string) {
    if(this._editedProjectController) {
      this._editedProjectController.project.title = name;
    }    
  }

  private openResource(resourceName: string) {
    this.activeEditor = this.getResourceEditor(resourceName);
  }

  private async renameResource(oldName: string, newName: string) {
    if(oldName !== newName) {
      const existingEditor = this.openEditors.find(editor => editor.resourceName == oldName);

      await this._editedProjectController!.renameResource(oldName, newName);
      if(existingEditor) {
        existingEditor.resourceName = newName;
        existingEditor.title = newName;
      }
    }
  }

  private async loadProject(projectJson: ThrushProject) {
    await this.closeAllEditors();

    this._editedProjectController = new ThrushProjectController(projectJson, this._thrushEngine.sequencer);
    await this._editedProjectController.loadAllToSynthEngine();

    if(this._editedProjectController?.project.resources['main']) {
      this.openResource('main');
    }
  }


  async handlePreviewStart() {
    await this.handlePreviewStop();
    const resourceEditorComponent = this._activeEditor?.cachedComponent?.instance;
    if(resourceEditorComponent && IsResourceEditorWithPlaySupport(resourceEditorComponent)) {
      this.playingPreviewStopHandler = await resourceEditorComponent.playResourcePreview();
    }
  }

  async handlePreviewStop() {
    if(this.playingPreviewStopHandler) {
      await this.playingPreviewStopHandler();
      this.playingPreviewStopHandler = null;
    }
  }
}

const BLANK_PROJECT: ThrushProject = require('src/assets/example-projects/blank.thrush.json');


class SampleProjectsBrowser implements IFileOpenBrowseSource {
  
  async getFilesInFolder(folderId?: string | undefined): Promise<FileBrowserFileDetails[]> {
    return [
      './assets/example-projects/part-notation.thrush.json',
      './assets/example-projects/top-gun.thrush.json',
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
