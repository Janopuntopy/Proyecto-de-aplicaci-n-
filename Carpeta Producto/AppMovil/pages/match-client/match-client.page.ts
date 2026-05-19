import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatchService, Match } from '../../service/match.service';
import { AuthService } from '../../service/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-match-client',
  templateUrl: './match-client.page.html',
  styleUrls: ['./match-client.page.scss'],
  standalone: false
})
export class MatchClientPage implements OnInit, OnDestroy {
  match: Match | null = null;
  cargando = true;
  timerInterval: any = null;
  pollingInterval: any = null;
  tiempoRestante: string = "00:00";
  userUid: string = "";

  constructor(
    private router: Router,
    private matchService: MatchService,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) { }

  async ngOnInit() {
    const user = await this.authService.getCurrentUser();
    if (user) {
      this.userUid = user.uid;
      await this.cargarMatch();
      // Polling para ver cambios de puntaje y estado del admin
      this.pollingInterval = setInterval(() => this.cargarMatch(), 5000);
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy() {
    this.detenerTimer();
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async cargarMatch() {
    try {
      const activeMatch = await this.matchService.getMatchActualUsuario(this.userUid);
      if (activeMatch) {
        this.match = activeMatch;

        if (this.match.estado === 'ACTIVA') {
          // Solo iniciar el timer si no está corriendo ya
          if (!this.timerInterval) {
            this.iniciarTimer();
          }
        } else {
          // Si no está ACTIVA (ESPERANDO o FINALIZADA), detener el timer
          this.detenerTimer();
        }
      } else {
        this.match = null;
        this.detenerTimer();
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.cargando = false;
    }
  }

  async reportarPuntos(delta: number) {
    if (!this.match?.id || this.match.estado !== 'ACTIVA') return;
    try {
      this.match = await this.matchService.selfScore(this.match.id, this.userUid, delta);
      this.showToast(`Puntaje actualizado: ${delta > 0 ? '+' : ''}${delta}`);
    } catch (error) {
      this.showToast('No puedes modificar puntos ahora');
    }
  }

  iniciarTimer() {
    this.detenerTimer(); // Asegura que no haya timers duplicados
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

  detenerTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null; // <-- Crucial: poner a null para que !this.timerInterval funcione
    }
  }

  get misPuntos(): number {
    const p = this.match?.participantes?.find(x => x.userUid === this.userUid);
    return p ? p.puntos : 0;
  }

  volver() {
    this.router.navigate(['/home']);
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, position: 'top' });
    toast.present();
  }
}
