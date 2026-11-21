import { SCHEMA_VERSION } from './config';
import type { Colaboradora, Comando, Evento, Instantanea } from './types';

const SEMILLA: Colaboradora[] = [
  { id: 'col-001', nombre: 'Marina', especialidad: 'Uñas', turno: 'Mañana', diaDescanso: 'Lunes', estado: 'Activa', fechaRegreso: null, comision: 40 },
  { id: 'col-002', nombre: 'Cande', especialidad: 'Cabello', turno: 'Mañana', diaDescanso: 'Martes', estado: 'Activa', fechaRegreso: null, comision: 35 },
  { id: 'col-003', nombre: 'Julia', especialidad: 'Ambas', turno: 'Tarde', diaDescanso: 'Miércoles', estado: 'Activa', fechaRegreso: null, comision: 45 },
  { id: 'col-004', nombre: 'Rocío', especialidad: 'Uñas', turno: 'Tarde', diaDescanso: 'Jueves', estado: 'Activa', fechaRegreso: null, comision: 40 },
  { id: 'col-005', nombre: 'Fede', especialidad: 'Cabello', turno: 'Tarde', diaDescanso: 'Domingo', estado: 'Activa', fechaRegreso: null, comision: 38 },
];

export function crearSemilla(): Instantanea {
  const instante = '2026-01-01T09:00:00.000Z';
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
