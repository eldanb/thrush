import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutPageComponent } from './about-page/about-page.component';
import { CodeSynthPageComponent } from './code-synth-page/code-synth-page.component';
import { TestPageComponent } from './test-page/test-page.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'codesynth'
  },

  {
    path: 'codesynth',
    component: CodeSynthPageComponent
  },

  {
    path: 'about',
    component: AboutPageComponent
  },

  {
    path: 'dragons',
    component: TestPageComponent
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
