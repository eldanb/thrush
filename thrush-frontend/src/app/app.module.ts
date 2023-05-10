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
import { AboutPageComponent } from './about-page/about-page.component';
import { TestPageComponent } from './test-page/test-page.component';
import { WaveformEditorComponent } from './widget-lib/waveform-editor/waveform-editor.component';
import { WaveInstrumentEditorComponent } from './resource-editors/wave-instrument-editor/wave-instrument-editor.component';
import { EnvelopeEditorComponent } from './widget-lib/envelope-editor/envelope-editor.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { ResourceEditorDialogService } from './resource-editors/resource-editor-dialog-service/resource-editor-dialog.service';
import { ResourceEditorDialogComponent } from './resource-editors/resource-editor-dialog-service/resource-editor-dialog.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ProjectEditorComponent } from './project-editor/project-editor.component';
import { SynthScriptEditorComponent } from './resource-editors/synth-script-editor/synth-script-editor.component';
import { UiRegionContentComponent } from './widget-lib/ui-region-content/ui-region-content.component';
import { UiRegionComponent } from './widget-lib/ui-region/ui-region.component';
import { ResourceOpenDialogComponent } from './widget-lib/resource-open-dialog/resource-open-dialog.component';
import { ResourceOpenDialogService } from './widget-lib/resource-open-dialog/resource-open-dialog-service';
import { FmInstrumentEditorComponent } from './resource-editors/fm-instrument-editor/fm-instrument-editor.component';
import { ChorusFilterEditorComponent } from './widget-lib/effect-chain-editor/chorus-filter-editor/chorus-filter-editor.component';
import { FmAlgorithmTreeDisplayComponent } from './widget-lib/fm-algorithm-tree-display/fm-algorithm-tree-display.component';
import { FilterChainEditorComponent } from './widget-lib/effect-chain-editor/filter-chain-editor/filter-chain-editor.component';
import { FilterEditorContainerComponent } from './widget-lib/effect-chain-editor/filter-editor-container/filter-editor-container.component';
import { EqualizerFilterEditorComponent } from './widget-lib/effect-chain-editor/equalizer-filter-editor/equalizer-filter-editor.component';
import { ResonantFilterEditorComponent } from './widget-lib/effect-chain-editor/resonant-filter-editor/resonant-filter-editor.component';
@NgModule({
  declarations: [
    AppComponent,
    MonacoEditorComponent,
    AboutPageComponent,
    TestPageComponent,
    WaveformEditorComponent,
    EnvelopeEditorComponent,
    WaveInstrumentEditorComponent,
    ResourceEditorDialogComponent,
    ProjectEditorComponent,
    SynthScriptEditorComponent,
    UiRegionContentComponent,
    UiRegionComponent,
    ResourceOpenDialogComponent,
    FmInstrumentEditorComponent,
    ChorusFilterEditorComponent,
    FmAlgorithmTreeDisplayComponent,
    FilterChainEditorComponent,
    FilterEditorContainerComponent,
    EqualizerFilterEditorComponent,
    ResonantFilterEditorComponent,
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
    MatDialogModule,
    MatButtonToggleModule,
    MatMenuModule,
    MatToolbarModule,
    MatSlideToggleModule
  ],
  providers: [
    ResourceEditorDialogService, 
    ResourceOpenDialogService],
  bootstrap: [AppComponent]
})
export class AppModule { }
