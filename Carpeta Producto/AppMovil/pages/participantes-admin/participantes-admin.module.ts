import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ParticipantesAdminPageRoutingModule } from './participantes-admin-routing.module';
import { ParticipantesAdminPage } from './participantes-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ParticipantesAdminPageRoutingModule
  ],
  declarations: [ParticipantesAdminPage]
})
export class ParticipantesAdminPageModule {}
