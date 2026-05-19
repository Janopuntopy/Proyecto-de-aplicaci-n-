import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface MatchParticipante {
  userUid: string;
  alias: string;
  puntos: number;
  activo: boolean;
}

export interface Match {
  id?: string;
  eventoId: string;
  adminUid: string;
  estado: 'ESPERANDO' | 'ACTIVA' | 'FINALIZADA';
  participantes: MatchParticipante[];
  duracionMinutos: number;
  startedAt?: any;
  finishedAt?: any;
}

export interface MatchDTO {
  eventoId: string;
  adminUid: string;
  duracionMinutos: number;
}

export interface ScoreDTO {
  puntos: number;
}

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private urlBase = 'https://match-microservice-902749656527.us-central1.run.app/api/match';

  constructor(private http: HttpClient) {}

  async crearMatch(matchData: MatchDTO): Promise<Match> {
    try {
      return await firstValueFrom(this.http.post<Match>(this.urlBase, matchData));
    } catch (error) {
      console.error('Error al crear match:', error);
      throw error;
    }
  }

  async iniciarMatch(id: string): Promise<Match> {
    try {
      return await firstValueFrom(this.http.post<Match>(`${this.urlBase}/${id}/start`, {}));
    } catch (error) {
      console.error('Error al iniciar match:', error);
      throw error;
    }
  }

  async finalizarMatch(id: string): Promise<Match> {
    try {
      return await firstValueFrom(this.http.post<Match>(`${this.urlBase}/${id}/finish`, {}));
    } catch (error) {
      console.error('Error al finalizar match:', error);
      throw error;
    }
  }

  async actualizarScore(id: string, uid: string, score: number): Promise<Match> {
    try {
      const dto: ScoreDTO = { puntos: score };
      return await firstValueFrom(this.http.put<Match>(`${this.urlBase}/${id}/score/${uid}`, dto));
    } catch (error) {
      console.error('Error al actualizar score:', error);
      throw error;
    }
  }

  async selfScore(id: string, uid: string, score: number): Promise<Match> {
    try {
      const dto: ScoreDTO = { puntos: score };
      return await firstValueFrom(this.http.post<Match>(`${this.urlBase}/${id}/self-score?uid=${uid}`, dto));
    } catch (error) {
      console.error('Error en self-score:', error);
      throw error;
    }
  }

  async getMatchActualUsuario(uid: string): Promise<Match | null> {
    try {
      const matches = await firstValueFrom(this.http.get<Match[]>(`${this.urlBase}/user/${uid}`));
      if (matches && matches.length > 0) {
        // Retornar el primero que no esté finalizado, o simplemente el primero
        return matches.find(m => m.estado !== 'FINALIZADA') || matches[0];
      }
      return null;
    } catch (error) {
      console.warn('No se encontró match activo para el usuario');
      return null;
    }
  }

  async getMatchByEvento(eventoId: string): Promise<Match | null> {
    try {
      const matches = await firstValueFrom(this.http.get<Match[]>(`${this.urlBase}/evento/${eventoId}`));
      if (matches && matches.length > 0) {
        return matches.find(m => m.estado !== 'FINALIZADA') || matches[0];
      }
      return null;
    } catch (error) {
      console.warn('No hay match creado para este evento aún');
      return null;
    }
  }
}
