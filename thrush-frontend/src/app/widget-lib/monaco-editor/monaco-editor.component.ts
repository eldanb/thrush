import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

@Component({
  selector: 'app-monaco-editor',  
  styles: [':host { flex: 1; overflow: hidden; }'],
  template: '<div #container class="editor-container" style="position: relative; height: 100%; width: 100%; overflow:hidden"></div>',
  
})
export class MonacoEditorComponent implements OnInit, AfterViewInit {
  @ViewChild('container', { read: ElementRef })
  private editorContainer: ElementRef | null = null;

  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private textFromProperty: string = '';

  @Output()
  public editorTextChanged = new EventEmitter<string>();

  constructor() { }

  ngAfterViewInit(): void {    
    const textModel = monaco.editor.createModel(this.textFromProperty, 'javascript');
    textModel.onDidChangeContent((e) => this.editorTextChanged.next(textModel.getValue()));

    this.editor = monaco.editor.create(this.editorContainer!.nativeElement, {
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
    return this.editor?.getModel()?.getValue()!;
  }

  set text(t: string) {
    this.textFromProperty = t;
    if(this.editor?.getModel()) {
      this.editor?.getModel()?.setValue(t);
    }
  }
}
