import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchService, Match, MatchParticipante } from '../../service/match.service';
import { EventoService, Evento } from '../../service/evento.service';
import { AuthService } from '../../service/auth.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-match-admin',
  templateUrl: './match-admin.page.html',
  styleUrls: ['./match-admin.page.scss'],
  standalone: false
})
export class MatchAdminPage implements OnInit, OnDestroy {
  eventoId: string | null = null;
  match: Match | null = null;
  evento: Evento | null = null;
  cargando = true;
  timerInterval: any = null;
  pollingInterval: any;
  tiempoRestante: string = "00:00";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchService: MatchService,
    private eventoService: EventoService,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.eventoId = this.route.snapshot.paramMap.get('eventoId');
    if (this.eventoId) {
      this.inicializar();
      // Polling cada 5 segundos para ver los puntos de los jugadores en tiempo real
      this.pollingInterval = setInterval(() => this.actualizarDatos(), 5000);
    } else {
      this.volver();
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  async inicializar() {
    this.cargando = true;
    try {
      if (this.eventoId) {
        this.evento = await this.eventoService.getEventoById(this.eventoId);
        const matchActivo = await this.matchService.getMatchByEvento(this.eventoId);
        if (matchActivo) {
          this.match = matchActivo;
          if (this.match.estado === 'ACTIVA') this.iniciarTimer();
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.cargando = false;
    }
  }

  async actualizarDatos() {
    if (!this.eventoId) return;
    try {
      const matchActivo = await this.matchService.getMatchByEvento(this.eventoId);
      if (matchActivo) {
        this.match = matchActivo;
        // Si el estado cambió a ACTIVA y no hay timer, iniciarlo
        if (this.match.estado === 'ACTIVA' && !this.timerInterval) {
          this.iniciarTimer();
        } 
        // Si el estado cambió a FINALIZADA y hay timer, detenerlo
        else if (this.match.estado === 'FINALIZADA' && this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
      }
    } catch (error) {
      console.error('Error en polling de admin:', error);
    }
  }

  async crearMatch() {
    const user = await this.authService.getCurrentUser();
    if (!user || !this.eventoId || !this.evento) return;

    const loading = await this.loadingCtrl.create({ message: 'Preparando partida...' });
    await loading.present();

    try {
      this.match = await this.matchService.crearMatch({
        eventoId: this.eventoId,
        adminUid: user.uid,
        duracionMinutos: this.evento.duracionMinutos
      });
      this.showToast('Partida creada con los jugadores Ready.');
    } catch (error: any) {
      const msg = error.error || error.message || '¿Hay jugadores Ready?';
      this.showToast('Error al crear partida: ' + msg);
    } finally {
      loading.dismiss();
    }
  }

  async empezarMatch() {
    if (!this.match?.id) return;
    try {
      this.match = await this.matchService.iniciarMatch(this.match.id);
      this.iniciarTimer();
      this.showToast('¡La partida ha comenzado!');
    } catch (error: any) {
      const msg = error.error || error.message || 'No se pudo iniciar';
      this.showToast('Error al iniciar: ' + msg);
    }
  }

  async finalizarMatch() {
    if (!this.match?.id) return;
    try {
      this.match = await this.matchService.finalizarMatch(this.match.id);
      if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
      this.showToast('Partida finalizada. Puntajes bloqueados.');
    } catch (error: any) {
      const msg = error.error || error.message || 'No se pudo finalizar';
      this.showToast('Error al finalizar: ' + msg);
    }
  }

  async ajustarScore(p: MatchParticipante, delta: number) {
    if (!this.match?.id || this.match.estado === 'FINALIZADA') return;
    try {
      this.match = await this.matchService.actualizarScore(this.match.id, p.userUid, delta);
    } catch (error: any) {
      const msg = error.error || error.message || 'No se pudo actualizar';
      this.showToast('Error: ' + msg);
    }
  }

  iniciarTimer() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    this.timerInterval = setInterval(() => {
      if (this.match?.startedAt) {
        let inicio = new Date(this.match.startedAt).getTime();
        if (isNaN(inicio)) {
            try {
                const b = this.match.startedAt.split(/\D+/).map(Number);
                inicio = new Date(Date.UTC(b[0], b[1] - 1, b[2], b[3], b[4], b[5] || 0)).getTime();
            } catch (e) {
                return;
            }
        }
        
        const ahora = new Date().getTime();
        let diff = Math.floor((ahora - inicio) / 1000);
        if (diff < 0) diff = 0;
        
        const min = Math.floor(diff / 60).toString().padStart(2, '0');
        const sec = (diff % 60).toString().padStart(2, '0');
        this.tiempoRestante = `${min}:${sec}`;
      }
    }, 1000);
  }

  volver() {
    this.router.navigate(['/home-admin']);
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000 });
    toast.present();
  }
}
