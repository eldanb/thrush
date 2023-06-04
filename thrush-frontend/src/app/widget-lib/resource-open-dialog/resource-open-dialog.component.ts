import { AfterContentInit, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';


export type OpenFileResult = {
  fileBuffer: ArrayBuffer;
  fileName: string;
}

export type FileBrowserFileDetails = {
  id: string;
  name: string;
  isFolder: boolean;
}

export interface IFileOpenBrowseSource {
  readonly displayName: string;

  getFilesInFolder(folderId?: string): Promise<FileBrowserFileDetails[]>;
  getFileContent(fileId: string): Promise<ArrayBuffer>;
}

export type ResourceOpenDialogConfig = {
  title: string;
  allowLocal: boolean;
  browseSources?: IFileOpenBrowseSource[];
};

export type ResourceOpenDialogData = {
  config: ResourceOpenDialogConfig;
};

@Component({
  templateUrl: './resource-open-dialog.component.html',
  styleUrls: ['./resource-open-dialog.component.scss']
})
export class ResourceOpenDialogComponent implements OnInit, AfterContentInit {
  private _currentFileSystem: IFileOpenBrowseSource | null = null;
  private _currentFolderStack: (string | undefined)[] = [undefined];
  public currentFolderItems: FileBrowserFileDetails[] = [];
  private _loading: boolean = false;
   
  constructor(
    private _dialogRef: MatDialogRef<ResourceOpenDialogComponent, OpenFileResult | null>,
    @Inject(MAT_DIALOG_DATA) public dialogData: ResourceOpenDialogData

    ) { 
      if(dialogData.config.browseSources) {
        this.selectedBrowserSource = dialogData.config.browseSources[0];
      }
  }

  ngOnInit(): void {
  }

  ngAfterContentInit(): void {
    if(!this.dialogData.config.browseSources?.length) {
      this.handleOpenLocal();
    }
  }


  handleOpenLocal() {
    document.getElementById('fileLoadControl')?.click();
  }

  handleCancelClicked() {
    this._dialogRef.close(null);
  }

  async handleBrowserItemClicked(browserItem: FileBrowserFileDetails) {
    if(browserItem.isFolder) {

    } else {
      this._loading = true;
      try {
        const fileContent = await this._currentFileSystem!.getFileContent(browserItem.id);
        this._dialogRef.close({
          fileBuffer: fileContent,
          fileName: browserItem.name
        });
      } finally {
        this._loading = false;
      }
    }
  }


  handleLocalFileSelected(eventTarget: EventTarget) {
    const filePicker = eventTarget as HTMLInputElement;
    const sampleFile = filePicker!.files![0];    
    const reader = new FileReader();

    reader.onloadend = () => { 
      this._dialogRef.close({
        fileBuffer: reader.result as ArrayBuffer,
        fileName: sampleFile.name
      });
    };

    reader.readAsArrayBuffer(sampleFile);  
  }
 
  set selectedBrowserSource(browserSource: IFileOpenBrowseSource | null) {
    this._currentFileSystem = browserSource;    
    this.currentFolderItems = [];
    this._currentFolderStack = [undefined];

    if(this._currentFileSystem) {
      this.refreshBrowseFolder();
    }
  }

  get selectedBrowserSource(): IFileOpenBrowseSource | null {
    return this._currentFileSystem;
  }

  private async refreshBrowseFolder() {
    this._loading = true;
    try {
      if(this._currentFileSystem) {
        this.currentFolderItems = 
          await this._currentFileSystem.getFilesInFolder(this._currentFolderStack[this._currentFolderStack.length-1]);
      } else {
        this.currentFolderItems = [];
      }
    } finally {
      this._loading = false;
    }
  }
}