import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { getAuth } from 'firebase/auth';
import { EventoService, Evento } from '../../service/evento.service';
import { UsuarioService, UsuarioPerfil } from '../../service/usuario.service';
import { ParticipanteService, Participante } from '../../service/participante.service';
import { MatchService } from '../../service/match.service';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-evento-detalle',
  templateUrl: './evento-detalle.page.html',
  styleUrls: ['./evento-detalle.page.scss'],
  standalone: false
})
export class EventoDetallePage implements OnInit {
  evento: Evento | null = null;
  perfil: UsuarioPerfil | null = null;
  participante: Participante | null = null;
  cargando = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventoService: EventoService,
    private usuarioService: UsuarioService,
    private participanteService: ParticipanteService,
    private matchService: MatchService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    await this.cargarDatosUsuario();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.cargarEvento(id);
      await this.verificarParticipacion();
    } else {
      this.volver();
    }
  }

  async cargarDatosUsuario() {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      try {
        this.perfil = await this.usuarioService.consultarUsuario(user.uid);
      } catch (err) {
        console.error('Error al obtener perfil:', err);
      }
    }
  }

  async cargarEvento(id: string) {
    this.cargando = true;
    try {
      this.evento = await this.eventoService.getEventoById(id);
    } catch (error) {
      console.error('Error al cargar evento', error);
      this.volver();
    } finally {
      this.cargando = false;
    }
  }

  get esCreador(): boolean {
    return this.perfil?.uid === this.evento?.adminUid;
  }

  async verificarParticipacion() {
    if (!this.perfil || !this.evento?.id) return;
    try {
      const participaciones = await this.participanteService.getParticipacionesUsuario(this.perfil.uid);
      this.participante = participaciones.find(p => p.eventoId === this.evento?.id) || null;
    } catch (error) {
      console.error('Error al verificar participación:', error);
    }
  }

  async inscribirse() {
    if (!this.perfil || !this.evento?.id) return;
    try {
      const dto = {
        eventoId: this.evento.id,
        userUid: this.perfil.uid,
        alias: this.perfil.alias,
        rolEvento: 'JUGADOR'
      };
      this.participante = await this.participanteService.unirseAEvento(dto);
      this.showToast('¡Te has inscrito con éxito!');
    } catch (error) {
      this.showToast('No se pudo completar la inscripción');
    }
  }

  async marcarAsistencia() {
    if (!this.participante?.id) return;
    try {
      this.participante = await this.participanteService.marcarReady(this.participante.id);
      this.showToast('¡Ahora estás READY! Prepárate para jugar.');
    } catch (error) {
      this.showToast('Error al marcar asistencia');
    }
  }

  async irAlMatch() {
    this.router.navigate(['/match-client']);
  }

  async gestionarParticipantes() {
    if (!this.evento?.id) return;
    this.router.navigate(['/participantes-admin', { id: this.evento.id }]);
  }

  async gestionarMatch() {
    if (!this.evento?.id) return;
    this.router.navigate(['/match-admin', { eventoId: this.evento.id }]);
  }

  volver() {
    this.router.navigate(['/eventos']);
  }

  async cambiarEstado(accion: 'publicar' | 'iniciar' | 'finalizar') {
    if (!this.evento?.id) return;
    try {
      if (accion === 'publicar') {
        this.evento = await this.eventoService.publicarEvento(this.evento.id);
      } else if (accion === 'iniciar') {
        this.evento = await this.eventoService.iniciarEvento(this.evento.id);
      } else if (accion === 'finalizar') {
        this.evento = await this.eventoService.finalizarEvento(this.evento.id);
      }
    } catch (error) {
      console.error(`Error al ${accion} evento:`, error);
    }
  }

  async eliminarEvento() {
    if (!this.evento?.id) return;
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Evento',
      message: '¿Estás seguro de eliminar este evento?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.eventoService.deleteEvento(this.evento!.id!);
              this.volver();
            } catch (error) {
              console.error('Error al eliminar evento:', error);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000 });
    toast.present();
  }
}
