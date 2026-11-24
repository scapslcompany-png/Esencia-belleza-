import { DIAS, ESPECIALIDADES, ESTADOS, TURNOS, serviciosPermitidos } from './config';
import type { Colaboradora, Comando, Evento, Instantanea, Ocupacion, Perfil, Propuesta, Servicio, TipoComando } from './types';
import { hace } from './cobertura';

export type Resultado =
  | { ok: true; snap: Instantanea; repetido: boolean; evento: Evento | null }
  | { ok: false; errores: string[] };

/** Qué perfil puede dar cada comando. Auditor solo mira: no figura en ninguno. */
const QUIEN: Record<TipoComando, Perfil> = {
  crear: 'Operación', editar: 'Operación', eliminar: 'Operación', ocupar: 'Operación', 'cancelar-ocupacion': 'Operación',
  ajuste: 'Operación', 'decidir-propuesta': 'Operación', proponer: 'Revisor',
};

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
  if (c.servicios !== undefined) {
    const ok = serviciosPermitidos(String(c.especialidad));
    if (!Array.isArray(c.servicios)) e.push('Los servicios no son válidos.');
    else {
      const fuera = c.servicios.filter((s) => !ok.includes(s));
      if (fuera.length) e.push(`Con la especialidad ${c.especialidad} no se puede asignar: ${fuera.join(', ')}.`);
    }
  }
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
    ...(Array.isArray(d.servicios) ? { servicios: d.servicios as string[] } : {}),
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
  const quien = QUIEN[cmd.tipo];
  if (!quien) return fallo(`Comando ${cmd.tipo} desconocido.`);
  if (cmd.actor !== quien) {
    return fallo(cmd.actor === 'Auditor'
      ? 'El perfil Auditor solo mira: no puede cambiar nada.'
      : `El perfil ${cmd.actor} no puede hacer esto. Lo hace ${quien}.`);
  }

  const lista = snap.entidades.colaboradoras;
  const actual = lista.find((c) => c.id === cmd.entidad) ?? null;
  const motivo = typeof cmd.datos.motivo === 'string' && cmd.datos.motivo.trim() ? cmd.datos.motivo.trim() : '';
  let nuevo: Colaboradora | null = null;
  let efecto = '';
  let nuevaLista: Colaboradora[];
  const ocupaciones = snap.entidades.ocupaciones ?? [];
  let nuevasOcupaciones = ocupaciones;
  const propuestas = snap.entidades.propuestas ?? [];
  let nuevasPropuestas = propuestas;
  let evEntidad = cmd.entidad;
  let evAntes: Colaboradora | null = actual;
  let ajusteDe: string | undefined;

  if (cmd.tipo === 'crear') {
    if (actual) return fallo(`Ya existe una colaboradora con el id ${cmd.entidad}.`);
    const errores = validarColaboradora(cmd.datos as Partial<Colaboradora>);
    if (!Array.isArray(cmd.datos.servicios) || cmd.datos.servicios.length === 0) errores.push('Elegí al menos un servicio del catálogo.');
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
    nuevasOcupaciones = ocupaciones.filter((o) => o.colaboradoraId !== actual.id);
    efecto = `Baja del registro de ${actual.nombre}`;
  } else if (cmd.tipo === 'ocupar' || cmd.tipo === 'cancelar-ocupacion') {
    if (!actual) return fallo('Esa colaboradora no existe.');
    nuevo = actual;
    nuevaLista = lista;
    if (cmd.tipo === 'ocupar') {
      const dia = cmd.datos.dia as Ocupacion['dia'];
      const servicio = cmd.datos.servicio as Servicio;
      if (!DIAS.includes(dia as never)) return fallo('Elegí un día.');
      if (servicio !== 'Uñas' && servicio !== 'Cabello') return fallo('Elegí un servicio.');
      if (actual.estado !== 'Activa') return fallo(`${actual.nombre} está de ${actual.estado.toLowerCase()}: no se la puede ocupar.`);
      if (!hace(actual, servicio)) return fallo(`${actual.nombre} es de ${actual.especialidad}: no hace ${servicio.toLowerCase()}.`);
      if (actual.diaDescanso === dia) return fallo(`${actual.nombre} descansa el ${dia.toLowerCase()}.`);
      const choque = ocupaciones.find((o) => o.colaboradoraId === actual.id && o.dia === dia && o.turno === actual.turno);
      if (choque) return fallo(`${actual.nombre} ya está ocupada en ${choque.servicio.toLowerCase()} ese ${dia.toLowerCase()} (${actual.turno.toLowerCase()}).`);
      nuevasOcupaciones = [...ocupaciones, { id: `ocu-${cmd.id}`, colaboradoraId: actual.id, dia, turno: actual.turno, servicio }];
      efecto = `${actual.nombre} ocupada en ${servicio.toLowerCase()}, ${dia.toLowerCase()} ${actual.turno.toLowerCase()}`;
    } else {
      const o = ocupaciones.find((x) => x.id === cmd.datos.ocupacionId && x.colaboradoraId === actual.id);
      if (!o) return fallo('Esa ocupación no existe o ya se canceló.');
      nuevasOcupaciones = ocupaciones.filter((x) => x.id !== o.id);
      efecto = `Ocupación cancelada: ${actual.nombre} vuelve a estar libre en ${o.servicio.toLowerCase()}, ${o.dia.toLowerCase()} ${o.turno.toLowerCase()}`;
    }
  } else if (cmd.tipo === 'proponer') {
    if (!actual) return fallo('Esa colaboradora no existe.');
    if (!motivo) return fallo('Contá el motivo de la propuesta.');
    const cambios = (cmd.datos.cambios ?? {}) as Partial<Colaboradora>;
    if (!cambios || typeof cambios !== 'object' || Object.keys(cambios).length === 0) return fallo('La propuesta no cambia nada.');
    const errores = validarColaboradora({ ...actual, ...cambios });
    if (errores.length) return { ok: false, errores };
    const prop: Propuesta = {
      id: `prop-${cmd.id}`, entidad: actual.id, versionPartida: versionActual(snap, actual.id), cambios, motivo,
      creador: cmd.actor, decision: 'pendiente', decisor: null,
    };
    nuevasPropuestas = [...propuestas, prop];
    nuevaLista = lista;
    nuevo = actual;
    evEntidad = prop.id;
    evAntes = null;
    nuevo = null;
    efecto = `Propuesta para ${actual.nombre}: ${motivo}`;
  } else if (cmd.tipo === 'decidir-propuesta') {
    const prop = propuestas.find((x) => x.id === cmd.entidad);
    if (!prop) return fallo('Esa propuesta no existe.');
    if (prop.decision !== 'pendiente') return fallo(`Esa propuesta ya está ${prop.decision}.`);
    const decision = cmd.datos.decision;
    if (decision !== 'aprobada' && decision !== 'rechazada') return fallo('Elegí aprobar o rechazar.');
    if (decision === 'rechazada' && !motivo) return fallo('Contá por qué la rechazás.');
    nuevaLista = lista;
    nuevo = null;
    evAntes = null;
    if (decision === 'aprobada') {
      const col = lista.find((c) => c.id === prop.entidad);
      if (!col) return fallo('La colaboradora de esa propuesta ya no existe. Rechazala.');
      if (versionActual(snap, col.id) !== prop.versionPartida) return fallo('La ficha cambió desde que se propuso: la propuesta quedó vieja. Rechazala y pedí una nueva.');
      const errores = validarColaboradora({ ...col, ...prop.cambios });
      if (errores.length) return { ok: false, errores };
      nuevo = normalizar({ ...col, ...prop.cambios }, col.id);
      nuevaLista = lista.map((c) => (c.id === col.id ? nuevo! : c));
      evEntidad = col.id;
      evAntes = col;
      efecto = `Propuesta aprobada: cambios en ${nuevo.nombre} (${prop.motivo})`;
    } else {
      efecto = `Propuesta rechazada: ${motivo}`;
    }
    nuevasPropuestas = propuestas.map((x) => (x.id === prop.id ? { ...x, decision, decisor: cmd.actor } : x));
  } else if (cmd.tipo === 'ajuste') {
    const origen = snap.eventos.find((e) => e.id === cmd.datos.eventoId);
    if (!origen) return fallo('Ese evento del historial no existe.');
    if (!motivo) return fallo('Un ajuste necesita su motivo.');
    const col = lista.find((c) => c.id === origen.entidad);
    if (!col) return fallo('La colaboradora de ese evento ya no existe.');
    const cambios = (cmd.datos.cambios ?? {}) as Partial<Colaboradora>;
    if (!cambios || typeof cambios !== 'object' || Object.keys(cambios).length === 0) return fallo('El ajuste no cambia nada.');
    const errores = validarColaboradora({ ...col, ...cambios });
    if (errores.length) return { ok: false, errores };
    nuevo = normalizar({ ...col, ...cambios }, col.id);
    nuevaLista = lista.map((c) => (c.id === col.id ? nuevo! : c));
    evEntidad = col.id;
    evAntes = col;
    ajusteDe = origen.id;
    efecto = `Ajuste sobre «${origen.efecto}»: ${motivo}`;
  } else {
    return fallo(`Comando ${cmd.tipo} desconocido.`);
  }

  const vAnt = versionActual(snap, evEntidad);
  const evento: Evento = {
    id: `evt-${cmd.id}`,
    comandoId: cmd.id,
    entidad: evEntidad,
    fecha: cmd.instante,
    perfil: cmd.actor,
    motivo: motivo || { crear: 'Alta', editar: 'Edición', eliminar: 'Eliminación', ocupar: 'Ocupación', 'cancelar-ocupacion': 'Cancelación de ocupación', proponer: 'Propuesta', 'decidir-propuesta': 'Decisión de propuesta', ajuste: 'Ajuste' }[cmd.tipo] || cmd.tipo,
    estadoAnterior: evAntes,
    estadoNuevo: nuevo,
    versionAnterior: vAnt,
    versionNueva: vAnt + 1,
    efecto,
    ...(ajusteDe ? { ajusteDe } : {}),
  };
  return {
    ok: true,
    repetido: false,
    evento,
    snap: {
      ...snap,
      revision: snap.revision + 1,
      entidades: { ...snap.entidades, colaboradoras: nuevaLista, ocupaciones: nuevasOcupaciones, propuestas: nuevasPropuestas },
      eventos: [...snap.eventos, evento],
      comandos: [...snap.comandos, cmd],
    },
  };
}
