import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ParticipanteService, Participante } from '../../service/participante.service';
import { EventoService, Evento } from '../../service/evento.service';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-participantes-admin',
  templateUrl: './participantes-admin.page.html',
  styleUrls: ['./participantes-admin.page.scss'],
  standalone: false
})
export class ParticipantesAdminPage implements OnInit {
  eventoId: string | null = null;
  evento: Evento | null = null;
  participantes: Participante[] = [];
  cargando = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private participanteService: ParticipanteService,
    private eventoService: EventoService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.eventoId = this.route.snapshot.paramMap.get('id');
    if (this.eventoId) {
      this.cargarDatos();
    } else {
      this.volver();
    }
  }

  async cargarDatos() {
    if (!this.eventoId) return;
    this.cargando = true;
    try {
      this.evento = await this.eventoService.getEventoById(this.eventoId);
      this.participantes = await this.participanteService.getParticipantesEvento(this.eventoId);
    } catch (error) {
      this.showToast('Error al cargar datos');
    } finally {
      this.cargando = false;
    }
  }

  async refrescar(event: any) {
    await this.cargarDatos();
    event.target.complete();
  }

  async expulsar(participante: Participante) {
    const alert = await this.alertCtrl.create({
      header: 'Expulsar Participante',
      message: `¿Estás seguro de que deseas expulsar a ${participante.alias}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Expulsar',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Expulsando...' });
            await loading.present();
            try {
              if (participante.id) {
                await this.participanteService.expulsarParticipante(participante.id);
                this.participantes = this.participantes.filter(p => p.id !== participante.id);
                this.showToast(`${participante.alias} ha sido expulsado.`);
              }
            } catch (error) {
              this.showToast('Error al expulsar');
            } finally {
              loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async crearMatch() {
    if (this.evento) {
      this.router.navigate(['/match-admin', { eventoId: this.evento.id }]);
    }
  }

  volver() {
    this.router.navigate(['/home-admin']);
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }
}
