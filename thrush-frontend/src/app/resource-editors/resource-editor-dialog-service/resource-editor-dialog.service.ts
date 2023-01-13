import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { firstValueFrom } from "rxjs";
import { ResourceEditorDialogComponent } from "./resource-editor-dialog.component";


export interface ResourceEditor<R, C = never> {
    editedResource?: R;
    editorConfig?: C;
}

export type ResourceEditorConstructor<R, C> = new(...args: any) => ResourceEditor<R, C>;

export type ResourceEditorDialogData<R, C> = {
    editorComponent: ResourceEditorConstructor<R, C>;
    editorConfig?: C;
    editedResource?: R;
    cancelled: boolean;
}


@Injectable()
export class ResourceEditorDialogService {
    constructor(private _matDialog: MatDialog) {

    }

    public async runResourceDialog<R, C>(
        editorComponent: ResourceEditorConstructor<R, C>, 
        editedResource?: R, 
        editorConfig?: C): Promise<R | null> {
        const dialogData: ResourceEditorDialogData<R, C> = {
            editorComponent,
            editedResource,
            editorConfig,            
            cancelled: false
        };

        const dlgRef = this._matDialog.open<ResourceEditorDialogComponent<R, C>, ResourceEditorDialogData<R, C>, R>(ResourceEditorDialogComponent, {
            data: dialogData
        });

        return (await firstValueFrom(dlgRef.afterClosed())) || null;        
    }
}