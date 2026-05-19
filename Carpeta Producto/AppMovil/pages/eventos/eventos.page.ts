import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth } from 'firebase/auth';
import { EventoService, Evento } from '../../service/evento.service';
import { UsuarioService, UsuarioPerfil } from '../../service/usuario.service';
import { ParticipanteService } from '../../service/participante.service';

@Component({
  selector: 'app-eventos',
  templateUrl: './eventos.page.html',
  styleUrls: ['./eventos.page.scss'],
  standalone: false
})
export class EventosPage implements OnInit {
  eventos: Evento[] = [];
  perfil: UsuarioPerfil | null = null;
  cargando = true;

  constructor(
    private router: Router,
    private eventoService: EventoService,
    private usuarioService: UsuarioService,
    private participanteService: ParticipanteService
  ) {}

  ngOnInit() {
    this.cargarDatosUsuario();
  }

  ionViewWillEnter() {
    if (this.perfil) {
      this.cargarEventos();
    }
  }

  async cargarDatosUsuario() {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      await this.cargarEventos();
      return;
    }

    try {
      const perfil = await this.usuarioService.consultarUsuario(user.uid);
      if (perfil) {
        this.perfil = perfil;
        await this.cargarEventos();
      }
    } catch (err) {
      console.error('Error al obtener perfil:', err);
      await this.cargarEventos();
    }
  }

  async cargarEventos() {
    this.cargando = true;
    try {
      if (this.perfil?.role === 'ADMIN') {
        this.eventos = await this.eventoService.getEventosAdmin(this.perfil.uid);
      } else {
        // 1. Obtener eventos publicados generales
        const publicados = await this.eventoService.getEventosPublicados();
        
        let misEventos: Evento[] = [];
        
        // 2. Obtener los eventos donde el usuario ya está inscrito (pueden estar EN_CURSO)
        if (this.perfil) {
          const participaciones = await this.participanteService.getParticipacionesUsuario(this.perfil.uid);
          
          for (const p of participaciones) {
            // Evitar duplicados si ya vino en la lista de publicados
            if (!publicados.some(e => e.id === p.eventoId)) {
              try {
                const eventoInscrito = await this.eventoService.getEventoById(p.eventoId);
                misEventos.push(eventoInscrito);
              } catch (e) {
                console.error('Error al recuperar evento inscrito individual', e);
              }
            }
          }
        }
        
        // Unir ambas listas
        this.eventos = [...publicados, ...misEventos];
      }
    } catch (error) {
      console.error('Error al cargar eventos', error);
    } finally {
      this.cargando = false;
    }
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }

  verDetalle(id?: string) {
    if (id) {
      this.router.navigate(['/evento-detalle', { id }]);
    }
  }

  crearEvento() {
    this.router.navigate(['/evento-form']);
  }
}
