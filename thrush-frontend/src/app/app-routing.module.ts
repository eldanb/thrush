import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutPageComponent } from './about-page/about-page.component';
import { TestPageComponent } from './test-page/test-page.component';
import { ProjectEditorComponent } from './project-editor/project-editor.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'project-editor'
  },

  {
    path: 'project-editor',
    component: ProjectEditorComponent
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
