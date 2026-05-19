import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Participante {
  id?: string;
  eventoId: string;
  userUid: string;
  alias: string;
  rolEvento: 'JUGADOR' | 'JUEZ';
  ready: boolean;
  inscritoAt?: string;
}

export interface ParticipanteDTO {
  eventoId: string;
  userUid: string;
  alias: string;
  rolEvento: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParticipanteService {
  private urlBase = 'https://participante-microservice-902749656527.us-central1.run.app/api/participantes';

  constructor(private http: HttpClient) {}

  async unirseAEvento(participante: ParticipanteDTO): Promise<Participante> {
    try {
      return await firstValueFrom(this.http.post<Participante>(`${this.urlBase}/unirse`, participante));
    } catch (error) {
      console.error('Error al unirse al evento:', error);
      throw error;
    }
  }

  async marcarReady(id: string): Promise<Participante> {
    try {
      return await firstValueFrom(this.http.post<Participante>(`${this.urlBase}/${id}/ready`, {}));
    } catch (error) {
      console.error('Error al marcar ready:', error);
      throw error;
    }
  }

  async abandonarEvento(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<void>(`${this.urlBase}/${id}/salir`));
    } catch (error) {
      console.error('Error al abandonar evento:', error);
      throw error;
    }
  }

  async getParticipacionesUsuario(uid: string): Promise<Participante[]> {
    try {
      return await firstValueFrom(this.http.get<Participante[]>(`${this.urlBase}/user/${uid}`));
    } catch (error) {
      console.error('Error al obtener participaciones:', error);
      return [];
    }
  }

  async getParticipantesEvento(eventoId: string): Promise<Participante[]> {
    try {
      return await firstValueFrom(this.http.get<Participante[]>(`${this.urlBase}/evento/${eventoId}`));
    } catch (error) {
      console.error('Error al obtener participantes del evento:', error);
      return [];
    }
  }

  async getParticipantesReady(eventoId: string): Promise<Participante[]> {
    try {
      return await firstValueFrom(this.http.get<Participante[]>(`${this.urlBase}/evento/${eventoId}/ready`));
    } catch (error) {
      console.error('Error al obtener participantes ready:', error);
      return [];
    }
  }

  async getCountParticipantes(eventoId: string): Promise<number> {
    try {
      return await firstValueFrom(this.http.get<number>(`${this.urlBase}/evento/${eventoId}/count`));
    } catch (error) {
      console.error('Error al obtener conteo de participantes:', error);
      return 0;
    }
  }

  async expulsarParticipante(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<void>(`${this.urlBase}/${id}`));
    } catch (error) {
      console.error('Error al expulsar participante:', error);
      throw error;
    }
  }
}
