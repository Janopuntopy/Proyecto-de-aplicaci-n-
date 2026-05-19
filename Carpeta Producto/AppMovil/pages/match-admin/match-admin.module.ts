import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MatchAdminPageRoutingModule } from './match-admin-routing.module';
import { MatchAdminPage } from './match-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MatchAdminPageRoutingModule
  ],
  declarations: [MatchAdminPage]
})
export class MatchAdminPageModule {}
