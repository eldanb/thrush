import { EventEmitter } from "@angular/core";
import { BehaviorSubject } from "rxjs";

 export interface ResourceEditor<R, C = never> {
  editedResource?: R;
  editorConfig?: C;

  resourceEdited: EventEmitter<boolean>;
 }