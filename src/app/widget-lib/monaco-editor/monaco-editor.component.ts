import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

@Component({
  selector: 'app-monaco-editor',  
  template: '<div #container class="editor-container" style="position: relative; height: 100%; width: 100%; overflow:hidden"></div>',
  encapsulation: ViewEncapsulation.None
})
export class MonacoEditorComponent implements OnInit, AfterViewInit {
  @ViewChild('container', { read: ElementRef })
  private editorContainer: ElementRef | null = null;

  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private textFromProperty: string = '';

  constructor() { }

  ngAfterViewInit(): void {    
    this.editor = monaco.editor.create(this.editorContainer!.nativeElement, {
      model: monaco.editor.createModel(this.textFromProperty, 'javascript')
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
