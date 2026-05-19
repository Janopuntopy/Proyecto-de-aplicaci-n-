import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MatchClientPage } from './match-client.page';

const routes: Routes = [
  {
    path: '',
    component: MatchClientPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MatchClientPageRoutingModule {}
