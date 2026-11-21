import { DIAS, ESPECIALIDADES, ESTADOS, TURNOS } from './config';
import type { Colaboradora, Comando, Evento, Instantanea } from './types';

export type Resultado =
  | { ok: true; snap: Instantanea; repetido: boolean; evento: Evento | null }
  | { ok: false; errores: string[] };

const fallo = (...errores: string[]): Resultado => ({ ok: false, errores });

/** JSON con las claves ordenadas, para comparar datos sin importar el orden. */
function estable(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(estable).join(',')}]`;
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${estable(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(x) ?? 'null';
}

const esFecha = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Revisa los requisitos de una colaboradora; devuelve cada condición que falla. */
export function validarColaboradora(c: Partial<Colaboradora>): string[] {
  const e: string[] = [];
  if (!c.nombre || !String(c.nombre).trim()) e.push('Falta el nombre.');
  if (!ESPECIALIDADES.includes(c.especialidad as never)) e.push('Elegí una especialidad.');
  if (!TURNOS.includes(c.turno as never)) e.push('Elegí un turno.');
  if (!DIAS.includes(c.diaDescanso as never)) e.push('Elegí el día de descanso.');
  if (!ESTADOS.includes(c.estado as never)) e.push('Elegí un estado.');
  else if (c.estado !== 'Activa' && !esFecha(c.fechaRegreso)) e.push('La fecha de regreso es obligatoria en Vacaciones o Baja.');
  if (typeof c.comision !== 'number' || !Number.isFinite(c.comision) || c.comision < 0 || c.comision > 100) e.push('La comisión tiene que ser un número entre 0 y 100.');
  return e;
}

function normalizar(d: Record<string, unknown>, id: string): Colaboradora {
  const estado = d.estado as Colaboradora['estado'];
  return {
    id,
    nombre: String(d.nombre ?? '').trim(),
    especialidad: d.especialidad as Colaboradora['especialidad'],
    turno: d.turno as Colaboradora['turno'],
    diaDescanso: d.diaDescanso as Colaboradora['diaDescanso'],
    estado,
    fechaRegreso: estado === 'Activa' ? null : (d.fechaRegreso as string),
    comision: d.comision as number,
  };
}

function versionActual(snap: Instantanea, entidad: string) {
  for (let i = snap.eventos.length - 1; i >= 0; i--) if (snap.eventos[i].entidad === entidad) return snap.eventos[i].versionNueva;
  return 0;
}

/**
 * Aplica un comando sin tocar el estado recibido. Devuelve la instantánea nueva completa o los errores:
 * nunca hay cambios parciales. Mismo id y mismos datos: sin efecto nuevo, mismo resultado.
 */
export function ejecutar(snap: Instantanea, cmd: Comando): Resultado {
  const previo = snap.comandos.find((c) => c.id === cmd.id);
  if (previo) {
    const igual = previo.tipo === cmd.tipo && previo.entidad === cmd.entidad && estable(previo.datos) === estable(cmd.datos);
    if (!igual) return fallo(`El id de comando ${cmd.id} ya se usó con otros datos. No se escribió nada.`);
    return { ok: true, snap, repetido: true, evento: snap.eventos.find((e) => e.comandoId === cmd.id) ?? null };
  }
  if (cmd.revisionEsperada !== snap.revision) {
    return fallo(`Los datos cambiaron: esperabas la revisión ${cmd.revisionEsperada} y la actual es la ${snap.revision}. Recargá y probá de nuevo.`);
  }
  if (cmd.actor !== 'Operación') return fallo(`El perfil ${cmd.actor} no puede modificar colaboradoras. Solo Operación.`);

  const lista = snap.entidades.colaboradoras;
  const actual = lista.find((c) => c.id === cmd.entidad) ?? null;
  const motivo = typeof cmd.datos.motivo === 'string' && cmd.datos.motivo.trim() ? cmd.datos.motivo.trim() : '';
  let nuevo: Colaboradora | null = null;
  let efecto = '';
  let nuevaLista: Colaboradora[];

  if (cmd.tipo === 'crear') {
    if (actual) return fallo(`Ya existe una colaboradora con el id ${cmd.entidad}.`);
    const errores = validarColaboradora(cmd.datos as Partial<Colaboradora>);
    if (errores.length) return { ok: false, errores };
    nuevo = normalizar(cmd.datos, cmd.entidad);
    nuevaLista = [...lista, nuevo];
    efecto = `Alta de ${nuevo.nombre}`;
  } else if (cmd.tipo === 'editar') {
    if (!actual) return fallo('Esa colaboradora ya no existe.');
    const errores = validarColaboradora({ ...actual, ...(cmd.datos as Partial<Colaboradora>) });
    if (errores.length) return { ok: false, errores };
    nuevo = normalizar({ ...actual, ...cmd.datos }, actual.id);
    nuevaLista = lista.map((c) => (c.id === actual.id ? nuevo! : c));
    efecto = `Cambios en ${nuevo.nombre}`;
  } else if (cmd.tipo === 'eliminar') {
    if (!actual) return fallo('Esa colaboradora ya no existe.');
    nuevaLista = lista.filter((c) => c.id !== actual.id);
    efecto = `Baja del registro de ${actual.nombre}`;
  } else {
    return fallo(`Comando ${cmd.tipo} todavía no disponible.`);
  }

  const vAnt = versionActual(snap, cmd.entidad);
  const evento: Evento = {
    id: `evt-${cmd.id}`,
    comandoId: cmd.id,
    entidad: cmd.entidad,
    fecha: cmd.instante,
    perfil: cmd.actor,
    motivo: motivo || { crear: 'Alta', editar: 'Edición', eliminar: 'Eliminación' }[cmd.tipo] || cmd.tipo,
    estadoAnterior: actual,
    estadoNuevo: nuevo,
    versionAnterior: vAnt,
    versionNueva: vAnt + 1,
    efecto,
  };
  return {
    ok: true,
    repetido: false,
    evento,
    snap: {
      ...snap,
      revision: snap.revision + 1,
      entidades: { ...snap.entidades, colaboradoras: nuevaLista },
      eventos: [...snap.eventos, evento],
      comandos: [...snap.comandos, cmd],
    },
  };
}
