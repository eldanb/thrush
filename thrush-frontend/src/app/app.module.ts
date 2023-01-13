import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MonacoEditorComponent } from './widget-lib/monaco-editor/monaco-editor.component';
import { CodeSynthPageComponent } from './code-synth-page/code-synth-page.component';
import { AboutPageComponent } from './about-page/about-page.component';
import { TestPageComponent } from './test-page/test-page.component';
import { WaveformEditorComponent } from './widget-lib/waveform-editor/waveform-editor.component';
import { WaveInstrumentEditorComponent } from './resource-editors/wave-instrument-editor/wave-instrument-editor.component';
import { EnvelopeEditorComponent } from './widget-lib/envelope-editor/envelope-editor.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { ResourceEditorDialogService } from './resource-editors/resource-editor-dialog-service/resource-editor-dialog.service';
import { ResourceEditorDialogComponent } from './resource-editors/resource-editor-dialog-service/resource-editor-dialog.component';
@NgModule({
  declarations: [
    AppComponent,
    MonacoEditorComponent,
    CodeSynthPageComponent,
    AboutPageComponent,
    TestPageComponent,
    WaveformEditorComponent,
    EnvelopeEditorComponent,
    WaveInstrumentEditorComponent,
    ResourceEditorDialogComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    BrowserAnimationsModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    MatCardModule,
    MatSidenavModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule
  ],
  providers: [ResourceEditorDialogService],
  bootstrap: [AppComponent]
})
export class AppModule { }
