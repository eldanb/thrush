import { EventEmitter } from "@angular/core";

 export interface ResourceEditor<R, C = never> {
  editedResource?: R;
  editorConfig?: C;

  resourceEdited: EventEmitter<boolean>;
 }