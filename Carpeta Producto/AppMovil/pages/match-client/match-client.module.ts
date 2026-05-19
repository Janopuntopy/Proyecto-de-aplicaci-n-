import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MatchClientPageRoutingModule } from './match-client-routing.module';
import { MatchClientPage } from './match-client.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MatchClientPageRoutingModule
  ],
  declarations: [MatchClientPage]
})
export class MatchClientPageModule {}
