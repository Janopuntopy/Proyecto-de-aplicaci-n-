import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ParticipantesAdminPage } from './participantes-admin.page';

const routes: Routes = [
  {
    path: '',
    component: ParticipantesAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ParticipantesAdminPageRoutingModule {}
