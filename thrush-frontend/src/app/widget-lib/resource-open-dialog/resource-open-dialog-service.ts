import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ResourceOpenDialogComponent, ResourceOpenDialogConfig, ResourceOpenDialogData } from "./resource-open-dialog.component";
import { firstValueFrom } from "rxjs";

@Injectable()
export class ResourceOpenDialogService {
  constructor(private _dlgService: MatDialog) {

  }

  async open(config: ResourceOpenDialogConfig): Promise<ArrayBuffer> {
    const dlgRef = this._dlgService.open<ResourceOpenDialogComponent, ResourceOpenDialogData>(ResourceOpenDialogComponent, {
      minHeight: '50vh',
      data: { 
        config
      }
    });
    const result = await firstValueFrom(dlgRef.afterClosed());
    return result;
  }
}