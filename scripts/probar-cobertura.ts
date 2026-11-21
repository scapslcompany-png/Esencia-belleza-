import assert from 'node:assert/strict';
import { elegibles, grilla } from '../src/lib/salon/cobertura';
import { ejecutar } from '../src/lib/salon/engine';
import { crearSemilla } from '../src/lib/salon/seed';
import type { Comando, Instantanea } from '../src/lib/salon/types';

const base: Instantanea = crearSemilla();
const cmd = (id: string, tipo: Comando['tipo'], entidad: string, datos: Record<string, unknown>, snap: Instantanea): Comando =>
  ({ id, tipo, entidad, actor: 'Operación', instante: '2026-01-01T10:00:00Z', revisionEsperada: snap.revision, datos });

const cs = base.entidades.colaboradoras;
const ambas = cs.find((c) => c.especialidad === 'Ambas')!;
const dia = (['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const).find((d) => d !== ambas.diaDescanso)!;

// Conteos: cada una cuenta 6 días y no su descanso; Ambas suma en los dos servicios.
const g = grilla(base);
for (const c of cs) {
  const dias = g.filter((x) => x.turno === c.turno && x.dia !== c.diaDescanso).length;
  assert.equal(dias, 6);
}
const sumaU = g.reduce((a, x) => a + x.unas, 0), sumaC = g.reduce((a, x) => a + x.cabello, 0);
assert.equal(sumaU, cs.filter((c) => c.estado === 'Activa' && c.especialidad !== 'Cabello').length * 6);
assert.equal(sumaC, cs.filter((c) => c.estado === 'Activa' && c.especialidad !== 'Uñas').length * 6);

// Vacaciones no suma.
const vac = ejecutar(base, cmd('v1', 'editar', ambas.id, { estado: 'Vacaciones', fechaRegreso: '2026-12-01' }, base));
assert.ok(vac.ok);
if (vac.ok) assert.ok(grilla(vac.snap).reduce((a, x) => a + x.unas + x.cabello, 0) < sumaU + sumaC);

// Compatibilidad: especialidad Uñas no hace cabello.
const unas = cs.find((c) => c.especialidad === 'Uñas')!;
const dU = (['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const).find((d) => d !== unas.diaDescanso)!;
const mal = ejecutar(base, cmd('x1', 'ocupar', unas.id, { dia: dU, servicio: 'Cabello' }, base));
assert.ok(!mal.ok);

// Dominio: Ambas ocupada en uñas no figura libre en cabello en esa franja.
assert.ok(elegibles(base, dia, ambas.turno, 'Cabello').some((c) => c.id === ambas.id));
const o1 = ejecutar(base, cmd('o1', 'ocupar', ambas.id, { dia, servicio: 'Uñas' }, base));
assert.ok(o1.ok);
if (!o1.ok) throw 0;
assert.ok(!elegibles(o1.snap, dia, ambas.turno, 'Cabello').some((c) => c.id === ambas.id));
assert.ok(!elegibles(o1.snap, dia, ambas.turno, 'Uñas').some((c) => c.id === ambas.id));
// Otra franja sigue libre.
const otro = (['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const).find((d) => d !== dia && d !== ambas.diaDescanso)!;
assert.ok(elegibles(o1.snap, otro, ambas.turno, 'Cabello').some((c) => c.id === ambas.id));
// Ocupar en cabello esa franja: rechazo sin escrituras.
const choque = ejecutar(o1.snap, cmd('o2', 'ocupar', ambas.id, { dia, servicio: 'Cabello' }, o1.snap));
assert.ok(!choque.ok);
// Repetido: un solo efecto.
const rep = ejecutar(o1.snap, cmd('o1', 'ocupar', ambas.id, { dia, servicio: 'Uñas' }, base));
assert.ok(rep.ok && rep.repetido && rep.snap === o1.snap && o1.snap.entidades.ocupaciones!.length === 1);

// Cancelar: vuelve elegible una sola vez.
const ocuId = o1.snap.entidades.ocupaciones![0].id;
const c1 = ejecutar(o1.snap, cmd('c1', 'cancelar-ocupacion', ambas.id, { ocupacionId: ocuId }, o1.snap));
assert.ok(c1.ok);
if (!c1.ok) throw 0;
assert.equal(elegibles(c1.snap, dia, ambas.turno, 'Cabello').filter((c) => c.id === ambas.id).length, 1);
assert.equal((c1.snap.entidades.ocupaciones ?? []).length, 0);
const c2 = ejecutar(c1.snap, cmd('c2', 'cancelar-ocupacion', ambas.id, { ocupacionId: ocuId }, c1.snap));
assert.ok(!c2.ok);
const c1b = ejecutar(c1.snap, cmd('c1', 'cancelar-ocupacion', ambas.id, { ocupacionId: ocuId }, o1.snap));
assert.ok(c1b.ok && c1b.repetido && c1b.snap === c1.snap);
console.log('OK: cobertura y ocupaciones');
