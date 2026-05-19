import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MatchAdminPage } from './match-admin.page';

const routes: Routes = [
  {
    path: '',
    component: MatchAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MatchAdminPageRoutingModule {}
