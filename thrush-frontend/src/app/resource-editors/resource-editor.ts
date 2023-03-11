import { EventEmitter } from "@angular/core";

 export interface ResourceEditor<R, S = never> {
  editedResource?: R;
  editorState?: S;

  resourceEdited: EventEmitter<boolean>;
 }

 export type PlayingPreviewStopHandler = () => Promise<void>;
 
 export interface ResourceEditorWithPlaySupport {
    playResourcePreview(): Promise<PlayingPreviewStopHandler | null>;
 }

 export function IsResourceEditorWithPlaySupport<R, C>(resourceEditor: ResourceEditor<R, C>): resourceEditor is ResourceEditor<R, C> & ResourceEditorWithPlaySupport {
    return !!(resourceEditor as any).playResourcePreview;
 }