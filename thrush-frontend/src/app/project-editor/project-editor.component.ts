import { ComponentType } from '@angular/cdk/portal';
import { AfterViewInit, Component, ComponentRef, Input, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ResourceType } from 'src/lib/project-datamodel/project-datamodel';
import { ThrushProjectController } from 'src/lib/project-datamodel/thrush-project-controller';
import { ResourceEditor } from '../resource-editors/resource-editor';
import { SynthScriptEditorComponent } from '../resource-editors/synth-script-editor/synth-script-editor.component';
import { WaveInstrumentEditorComponent } from '../resource-editors/wave-instrument-editor/wave-instrument-editor.component';


type ResourceEditorDescriptor = {
  title: string;
  resourceName: string;
  resourceType: ResourceType;
  cachedComponent?: ComponentRef<ResourceEditor<any, any>>;
  draftResource: any;
  draftResourceDirty: boolean;
  dirtySubscription: Subscription | null;
}

const ResourceEditorTypes: Record<ResourceType, ComponentType<ResourceEditor<any, never>>>  = {
  abst_wave_instrument: WaveInstrumentEditorComponent,
  script: SynthScriptEditorComponent,
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

  @Input()
  public set editedProjectController(editedProjectController: ThrushProjectController | null) {
    (async () => {
      await this.closeAllEditors();
      this._editedProjectController = editedProjectController;  
    
      if(this._editedProjectController?.project.resources['main']) {
        this.openResource('main');
      }
    })();
  }
  
  public get editedProjectController(): ThrushProjectController | null {
    return this._editedProjectController;
  }

  openEditors: ResourceEditorDescriptor[] = [ 
  ];

  private _activeEditor: ResourceEditorDescriptor | null = null;

  constructor() { }

  ngOnInit(): void {
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
        editor.draftResource);

      editor.dirtySubscription = editor.cachedComponent!.instance.resourceEdited.subscribe((r) => {
        editor.draftResourceDirty = true;
        editor.draftResource = r;
      });
    }
  }

  private destroyCachedEditor(editor: ResourceEditorDescriptor) {
    if(editor.cachedComponent) {
      editor.draftResource = editor.cachedComponent.instance.editedResource;
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

  private createEditorComponentForResource(resourceType: ResourceType, resource: any): ComponentRef<ResourceEditor<any, never>> | undefined {
    const component = this._editorHost!.createComponent(ResourceEditorTypes[resourceType]);
    component.instance.editedResource = resource;
    return component;
  }

  private getResourceEditor(resourceName: string): ResourceEditorDescriptor {
    let existingEditor = this.openEditors.find(editor => editor.resourceName == resourceName);
    if(existingEditor) {
      return existingEditor;
    }

    const editedResource = this.editedProjectController!.project.resources[resourceName];
    const newEditor: ResourceEditorDescriptor = {
      title: resourceName,
      resourceName: resourceName,
      draftResource: Object.assign({}, editedResource),
      draftResourceDirty: false,
      dirtySubscription: null,
      resourceType: editedResource.type,      
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
    const newResourceName = await this.editedProjectController!.createResource('abst_wave_instrument');
    this.openResource(newResourceName);
  }

  public async handleNewScript() {
    const newResourceName = await this.editedProjectController!.createResource('script');
    this.openResource(newResourceName);
    
  }

  public handleRequestRename(oldResourceName: string) {
    this.renamedResourceName = oldResourceName;
    this.renamedResourceNewName = oldResourceName;
    setTimeout(() => {
      document.getElementById('resource-rename-input')?.focus();
    }, 0);
  }

  public async handleRenameFieldBlurs() {
    const renamedResourceName = this.renamedResourceName;
    const renamedResourceNewName = this.renamedResourceNewName;

    this.renamedResourceName = null;
    
    if(renamedResourceName && renamedResourceNewName) {       
      await this.renameResource(renamedResourceName, renamedResourceNewName);
    }      
  }

  public handleCloseTab(editor: ResourceEditorDescriptor) {
    this.closeEditor(editor);
  }

   async handleSaveClicked() {
    await this.editedProjectController!.saveResource(this.activeEditor!.resourceName, 
      Object.assign({ 'type': this.activeEditor!.resourceType }, this.activeEditor?.cachedComponent!.instance.editedResource));
    this.activeEditor!.draftResourceDirty = false;
  }

  public get editedProjectResourceNames(): string[] {
    return Object.keys(this.editedProjectController!.project.resources);
  }

  private openResource(resourceName: string) {
    this.activeEditor = this.getResourceEditor(resourceName);
  }

  private async renameResource(oldName: string, newName: string) {
    if(oldName !== newName) {
      const existingEditor = this.openEditors.find(editor => editor.resourceName == oldName);

      await this.editedProjectController!.renameResource(oldName, newName);
      if(existingEditor) {
        existingEditor.resourceName = newName;
        existingEditor.title = newName;
      }
    }
  }
}
