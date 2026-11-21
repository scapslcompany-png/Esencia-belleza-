import { DIAS, TURNOS } from './config';
import type { Colaboradora, Dia, Instantanea, Servicio, Turno } from './types';

/** ¿Hace este servicio? Ambas hace los dos; Uñas no hace cabello y al revés. */
export const hace = (c: Pick<Colaboradora, 'especialidad'>, s: Servicio) => c.especialidad === 'Ambas' || c.especialidad === s;

/** Suma en la franja: activa, de ese turno y sin descansar ese día. */
export const trabaja = (c: Colaboradora, dia: Dia, turno: Turno) => c.estado === 'Activa' && c.turno === turno && c.diaDescanso !== dia;

export type Casillero = { dia: Dia; turno: Turno; unas: number; cabello: number; total: number; unasLibres: number; cabelloLibres: number };

/** Colaboradoras ofrecibles en un servicio en la franja: trabajan, lo hacen y no están ocupadas en ningún servicio. */
export function elegibles(snap: Instantanea, dia: Dia, turno: Turno, servicio: Servicio): Colaboradora[] {
  const ocu = snap.entidades.ocupaciones ?? [];
  return snap.entidades.colaboradoras.filter(
    (c) => trabaja(c, dia, turno) && hace(c, servicio) && !ocu.some((o) => o.colaboradoraId === c.id && o.dia === dia && o.turno === turno),
  );
}

export function grilla(snap: Instantanea): Casillero[] {
  const cs = snap.entidades.colaboradoras;
  return TURNOS.flatMap((turno) =>
    DIAS.map((dia) => {
      const act = cs.filter((c) => trabaja(c, dia, turno));
      return {
        dia,
        turno,
        unas: act.filter((c) => hace(c, 'Uñas')).length,
        cabello: act.filter((c) => hace(c, 'Cabello')).length,
        total: act.length,
        unasLibres: elegibles(snap, dia, turno, 'Uñas').length,
        cabelloLibres: elegibles(snap, dia, turno, 'Cabello').length,
      };
    }),
  );
}
