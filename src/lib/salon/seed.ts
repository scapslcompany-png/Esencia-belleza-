import { SCHEMA_VERSION } from './config';
import type { Colaboradora, Comando, Evento, Instantanea } from './types';

function enDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function colaboradorasEjemplo(): Colaboradora[] {
  return [
    { id: 'col-001', nombre: 'Marina', especialidad: 'Uñas', turno: 'Mañana', diaDescanso: 'Lunes', estado: 'Activa', fechaRegreso: null, comision: 40 },
    { id: 'col-002', nombre: 'Valeria', especialidad: 'Uñas', turno: 'Mañana', diaDescanso: 'Martes', estado: 'Activa', fechaRegreso: null, comision: 40 },
    { id: 'col-003', nombre: 'Daniela', especialidad: 'Uñas', turno: 'Mañana', diaDescanso: 'Miércoles', estado: 'Activa', fechaRegreso: null, comision: 40 },
    { id: 'col-004', nombre: 'Rocío', especialidad: 'Uñas', turno: 'Tarde', diaDescanso: 'Domingo', estado: 'Activa', fechaRegreso: null, comision: 40 },
    { id: 'col-005', nombre: 'Camila', especialidad: 'Uñas', turno: 'Tarde', diaDescanso: 'Domingo', estado: 'Activa', fechaRegreso: null, comision: 40 },
    { id: 'col-006', nombre: 'Julia', especialidad: 'Ambas', turno: 'Tarde', diaDescanso: 'Domingo', estado: 'Activa', fechaRegreso: null, comision: 45 },
    { id: 'col-007', nombre: 'Cande', especialidad: 'Cabello', turno: 'Mañana', diaDescanso: 'Martes', estado: 'Activa', fechaRegreso: null, comision: 35 },
    { id: 'col-008', nombre: 'Fede', especialidad: 'Cabello', turno: 'Tarde', diaDescanso: 'Lunes', estado: 'Activa', fechaRegreso: null, comision: 38 },
    { id: 'col-009', nombre: 'Lucía', especialidad: 'Uñas', turno: 'Tarde', diaDescanso: 'Jueves', estado: 'Vacaciones', fechaRegreso: enDias(7), comision: 40 },
  ];
}

export function crearSemilla(): Instantanea {
  const instante = '2026-01-01T09:00:00.000Z';
  const SEMILLA = colaboradorasEjemplo();
  const comandos: Comando[] = [];
  const eventos: Evento[] = [];
  SEMILLA.forEach((c, i) => {
    comandos.push({ id: `seed-cmd-${i + 1}`, tipo: 'crear', entidad: c.id, actor: 'Operación', instante, revisionEsperada: i, datos: { ...c } });
    eventos.push({
      id: `seed-evt-${i + 1}`, comandoId: `seed-cmd-${i + 1}`, entidad: c.id, fecha: instante, perfil: 'Operación',
      motivo: 'Datos de ejemplo', estadoAnterior: null, estadoNuevo: { ...c }, versionAnterior: 0, versionNueva: 1,
      efecto: `Alta de ${c.nombre}`,
    });
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: SEMILLA.length,
    entidades: { colaboradoras: SEMILLA.map((c) => ({ ...c })), propuestas: [] },
    eventos,
    comandos,
  };
}
