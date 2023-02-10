import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

@Component({
  selector: 'app-monaco-editor',  
  styles: [':host { flex: 1; overflow: hidden; }'],
  template: '<div #container class="editor-container" style="position: relative; height: 100%; width: 100%; overflow:hidden"></div>',
  
})
export class MonacoEditorComponent implements OnInit, AfterViewInit {
  @ViewChild('container', { read: ElementRef })
  private _editorContainer: ElementRef | null = null;
  private _editor: monaco.editor.IStandaloneCodeEditor | null = null;  
  private _textFromProperty: string = "";

  @Output()
  public editorTextChanged = new EventEmitter<string>();

  constructor() { }

  ngAfterViewInit(): void {    
    const textModel = monaco.editor.createModel(this._textFromProperty, 'javascript');
    textModel.onDidChangeContent((e) => this.editorTextChanged.next(textModel.getValue()));

    this._editor = monaco.editor.create(this._editorContainer!.nativeElement, {
      model: textModel,
      automaticLayout: true
    });

    const thrushDts = require('!raw-loader!generated/ThrushFunctionGeneratorInterfaces.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(thrushDts.default);
  }
 
  ngOnInit(): void {
  }

  @Input()
  get text(): string {
    return this._editor?.getModel()?.getValue()!;
  }

  set text(t: string) {
    this._textFromProperty = t;
    let model = this._editor?.getModel();
    if(model && model.getValue() != t) {
      this._editor?.getModel()?.setValue(t);
    }    
  }
}
