import assert from 'node:assert/strict';
import { ejecutar } from '../src/lib/salon/engine';
import { elegibles, grilla } from '../src/lib/salon/cobertura';
import { crearSemilla } from '../src/lib/salon/seed';
import type { Comando } from '../src/lib/salon/types';

let n = 0;
const cmd = (s: ReturnType<typeof crearSemilla>, p: Partial<Comando>): Comando =>
  ({ id: `t${++n}`, tipo: 'ocupar', entidad: 'col-006', actor: 'Operación', instante: '2026-02-01T10:00:00Z', revisionEsperada: s.revision, datos: {}, ...p });

let s = crearSemilla();
// Disponibilidad frente a capacidades: Julia (Ambas, Tarde) ocupada en uñas no está libre para cabello
assert(elegibles(s, 'Lunes', 'Tarde', 'Cabello').some((c) => c.id === 'col-006'));
const oc = ejecutar(s, cmd(s, { datos: { dia: 'Lunes', servicio: 'Uñas' } }));
assert(oc.ok); s = oc.snap;
assert(!elegibles(s, 'Lunes', 'Tarde', 'Cabello').some((c) => c.id === 'col-006'));
assert(!elegibles(s, 'Lunes', 'Tarde', 'Uñas').some((c) => c.id === 'col-006'));
// Cancelar: vuelve elegible una sola vez
const id = s.entidades.ocupaciones![0].id;
const ca = ejecutar(s, cmd(s, { tipo: 'cancelar-ocupacion', datos: { ocupacionId: id } }));
assert(ca.ok); s = ca.snap;
assert.equal(elegibles(s, 'Lunes', 'Tarde', 'Cabello').filter((c) => c.id === 'col-006').length, 1);
// Idempotencia
const c1 = cmd(s, { datos: { dia: 'Martes', servicio: 'Uñas' } });
const r1 = ejecutar(s, c1); assert(r1.ok);
const r2 = ejecutar(r1.snap, c1); assert(r2.ok && r2.repetido && r2.snap === r1.snap);
const r3 = ejecutar(r1.snap, { ...c1, datos: { dia: 'Martes', servicio: 'Cabello' } }); assert(!r3.ok);
// Revisión vieja
assert(!ejecutar(s, cmd(s, { revisionEsperada: 0, datos: { dia: 'Martes', servicio: 'Uñas' } })).ok);
// Permisos
const prop = ejecutar(s, cmd(s, { tipo: 'proponer', actor: 'Revisor', entidad: 'col-001', datos: { motivo: 'x', cambios: { turno: 'Tarde' } } }));
assert(prop.ok);
assert.equal(prop.snap.entidades.colaboradoras.find((c) => c.id === 'col-001')!.turno, 'Mañana');
const pid = prop.snap.entidades.propuestas[0].id;
assert(!ejecutar(prop.snap, cmd(prop.snap, { tipo: 'decidir-propuesta', actor: 'Revisor', entidad: pid, datos: { decision: 'aprobada' } })).ok);
assert(!ejecutar(prop.snap, cmd(prop.snap, { tipo: 'editar', actor: 'Auditor', entidad: 'col-001', datos: { nombre: 'Z' } })).ok);
// Vacaciones sin fecha
assert(!ejecutar(s, cmd(s, { tipo: 'editar', entidad: 'col-001', datos: { estado: 'Vacaciones', fechaRegreso: null } })).ok);
// Grilla: Lucía (vacaciones) no suma; descanso no suma
const g = grilla(crearSemilla());
assert.equal(g.find((x) => x.dia === 'Jueves' && x.turno === 'Tarde')!.total, 4);
assert.equal(g.find((x) => x.dia === 'Domingo' && x.turno === 'Tarde')!.total, 1);
console.log('Todo bien');
