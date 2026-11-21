import { ESPECIALIDADES, ESTADOS, SCHEMA_VERSION, TURNOS, DIAS } from './config';
import type { Instantanea } from './types';

const esObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Convierte una copia (versión 1 o 2) a la versión actual. Devuelve los errores si no sirve. */
export function migrar(x: unknown): { ok: true; snap: Instantanea; migrada: boolean } | { ok: false; error: string } {
  if (!esObj(x)) return { ok: false, error: 'El archivo no tiene el formato de una copia de Esencia belleza.' };
  const version = x.schemaVersion;
  if (version !== 1 && version !== SCHEMA_VERSION) {
    return { ok: false, error: `La copia es de una versión que no conozco (${String(version)}). No cambié nada.` };
  }
  const ent = esObj(x.entidades) ? x.entidades : null;
  if (!ent || !Array.isArray(ent.colaboradoras) || !Array.isArray(x.eventos) || !Array.isArray(x.comandos) || typeof x.revision !== 'number') {
    return { ok: false, error: 'La copia está incompleta o dañada. No cambié nada.' };
  }
  for (const c of ent.colaboradoras) {
    if (!esObj(c) || typeof c.id !== 'string' || typeof c.nombre !== 'string' || typeof c.comision !== 'number'
      || !(ESPECIALIDADES as readonly unknown[]).includes(c.especialidad) || !(TURNOS as readonly unknown[]).includes(c.turno)
      || !(DIAS as readonly unknown[]).includes(c.diaDescanso) || !(ESTADOS as readonly unknown[]).includes(c.estado)) {
      return { ok: false, error: 'Hay colaboradoras con datos inválidos en la copia. No cambié nada.' };
    }
  }
  const snap = {
    ...x,
    schemaVersion: SCHEMA_VERSION,
    entidades: {
      colaboradoras: ent.colaboradoras,
      propuestas: Array.isArray(ent.propuestas) ? ent.propuestas : [],
      ocupaciones: Array.isArray(ent.ocupaciones) ? ent.ocupaciones : [],
    },
  } as unknown as Instantanea;
  return { ok: true, snap, migrada: version !== SCHEMA_VERSION };
}

/** Celda CSV: comillas dobles y un apóstrofo delante si pudiera leerse como fórmula. */
function celda(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function aCsv(cabecera: string[], filas: unknown[][]): string {
  return '﻿' + [cabecera, ...filas].map((f) => f.map(celda).join(',')).join('\r\n') + '\r\n';
}

export function colaboradorasCsv(s: Instantanea): string {
  return aCsv(['id', 'nombre', 'especialidad', 'turno', 'dia_descanso', 'estado', 'fecha_regreso', 'comision_pct'],
    s.entidades.colaboradoras.map((c) => [c.id, c.nombre, c.especialidad, c.turno, c.diaDescanso, c.estado, c.fechaRegreso, c.comision]));
}

export function historialCsv(s: Instantanea): string {
  return aCsv(['fecha', 'perfil', 'entidad', 'efecto', 'motivo', 'version_anterior', 'version_nueva', 'ajuste_de'],
    s.eventos.map((e) => [e.fecha, e.perfil, e.entidad, e.efecto, e.motivo, e.versionAnterior, e.versionNueva, e.ajusteDe]));
}

export function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
