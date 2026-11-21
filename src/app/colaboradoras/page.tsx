'use client';
import { useRef, useState, type FormEvent } from 'react';

import { DIAS, ESPECIALIDADES, ESTADOS, TURNOS, TURNO_HORARIO } from '@/lib/salon/config';
import { ejecutarComando, useInstantanea, usePerfil } from '@/lib/salon/store';
import type { Colaboradora, Comando } from '@/lib/salon/types';

const IMANES = ['bg-coral-400', 'bg-sky-300', 'bg-amber-300', 'bg-emerald-300', 'bg-violet-300', 'bg-pink-300', 'bg-orange-300'];
const FILTROS = ['Todas', 'Uñas', 'Cabello'] as const;
// randomUUID no existe en páginas sin https: se arma el id con getRandomValues.
const nuevoId = () => {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};

type Borrador = { nombre: string; especialidad: string; turno: string; diaDescanso: string; estado: string; fechaRegreso: string; comision: string };
const VACIO: Borrador = { nombre: '', especialidad: 'Uñas', turno: 'Mañana', diaDescanso: 'Lunes', estado: 'Activa', fechaRegreso: '', comision: '40' };

const campo = 'w-full rounded-lg border-2 border-navy/25 bg-white px-3 py-2 text-navy focus:border-navy focus:outline-none';
const botonP = 'rounded-lg bg-navy px-4 py-2 font-semibold text-sand-50 hover:bg-navy/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400';
const botonS = 'rounded-lg border-2 border-navy/30 bg-white px-3 py-1.5 text-sm font-semibold text-navy hover:bg-sand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400';

function Formulario({ editar, revision, onCerrar }: { editar: Colaboradora | null; revision: number; onCerrar: (msg: string) => void }) {
  const perfil = usePerfil();
  const [d, setD] = useState<Borrador>(editar ? { ...editar, fechaRegreso: editar.fechaRegreso ?? '', comision: String(editar.comision) } : VACIO);
  const [errores, setErrores] = useState<string[]>([]);
  // El id del comando y el de la colaboradora se crean una vez: un reintento usa los mismos.
  const ids = useRef({ comando: nuevoId(), entidad: editar?.id ?? `col-${nuevoId().slice(0, 8)}` });
  const set = (k: keyof Borrador) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }));
  const conRegreso = d.estado !== 'Activa';

  function enviar(e: FormEvent) {
    e.preventDefault();
    const cmd: Comando = {
      id: ids.current.comando,
      tipo: editar ? 'editar' : 'crear',
      entidad: ids.current.entidad,
      actor: perfil ?? 'Operación',
      instante: new Date().toISOString(),
      revisionEsperada: revision,
      datos: {
        nombre: d.nombre, especialidad: d.especialidad, turno: d.turno, diaDescanso: d.diaDescanso, estado: d.estado,
        fechaRegreso: conRegreso ? d.fechaRegreso || null : null, comision: d.comision.trim() === '' ? null : Number(d.comision),
      },
    };
    const r = ejecutarComando(cmd);
    if (!r.ok) { setErrores(r.errores); return; }
    onCerrar(editar ? 'Listo, guardamos los cambios.' : 'Listo, sumamos a la colaboradora.');
  }

  return (
    <form onSubmit={enviar} aria-label={editar ? 'Editar colaboradora' : 'Agregar colaboradora'} className="mb-6 space-y-3 rounded-2xl border-2 border-navy/20 bg-white/90 p-4">
      <h2 className="font-display text-xl text-navy">{editar ? `Editar a ${editar.nombre}` : 'Agregar colaboradora'}</h2>
      {errores.length > 0 && (
        <ul role="alert" className="list-disc rounded-lg bg-coral-100 py-2 pl-7 pr-3 text-sm font-semibold text-navy">
          {errores.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-navy">Nombre<input className={campo} value={d.nombre} onChange={set('nombre')} /></label>
        <label className="block text-sm font-semibold text-navy">Especialidad
          <select className={campo} value={d.especialidad} onChange={set('especialidad')}>{ESPECIALIDADES.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block text-sm font-semibold text-navy">Turno
          <select className={campo} value={d.turno} onChange={set('turno')}>{TURNOS.map((x) => <option key={x} value={x}>{x} {TURNO_HORARIO[x]}</option>)}</select></label>
        <label className="block text-sm font-semibold text-navy">Día de descanso
          <select className={campo} value={d.diaDescanso} onChange={set('diaDescanso')}>{DIAS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block text-sm font-semibold text-navy">Estado
          <select className={campo} value={d.estado} onChange={set('estado')}>{ESTADOS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block text-sm font-semibold text-navy">Fecha de regreso{conRegreso ? ' (obligatoria)' : ''}
          <input type="date" className={`${campo} disabled:opacity-50`} value={d.fechaRegreso} onChange={set('fechaRegreso')} disabled={!conRegreso} /></label>
        <label className="block text-sm font-semibold text-navy">Comisión (%)
          <input type="number" min={0} max={100} step="any" className={campo} value={d.comision} onChange={set('comision')} /></label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className={botonP}>Guardar</button>
        <button type="button" onClick={() => onCerrar('')} className={botonS}>Cancelar</button>
      </div>
    </form>
  );
}

export default function Colaboradoras() {
  const snap = useInstantanea();
  const perfil = usePerfil();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>('Todas');
  const [form, setForm] = useState<{ editar: Colaboradora | null; clave: number } | null>(null);
  const [borrar, setBorrar] = useState<Colaboradora | null>(null);
  const [errBorrar, setErrBorrar] = useState<string[]>([]);
  const [aviso, setAviso] = useState('');
  const idBorrado = useRef('');
  if (!snap) return null;
  const todas = snap.entidades.colaboradoras;
  const lista = todas.filter((c) => filtro === 'Todas' || c.especialidad === filtro || c.especialidad === 'Ambas');
  const puede = perfil === 'Operación';

  function pedirBorrar(c: Colaboradora) { idBorrado.current = nuevoId(); setErrBorrar([]); setBorrar(c); setAviso(''); }
  function confirmarBorrar() {
    if (!borrar || !snap) return;
    const r = ejecutarComando({
      id: idBorrado.current, tipo: 'eliminar', entidad: borrar.id, actor: perfil ?? 'Operación',
      instante: new Date().toISOString(), revisionEsperada: snap.revision, datos: {},
    });
    if (!r.ok) { setErrBorrar(r.errores); return; }
    setAviso(`Listo, sacamos a ${borrar.nombre} del pizarrón.`);
    setBorrar(null);
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-navy">Colaboradoras</h1>
          <p className="text-navy/70">{lista.length} {filtro === 'Todas' ? 'en el pizarrón' : `hacen ${filtro.toLowerCase()}`} · revisión {snap.revision}</p>
        </div>
        {puede && <button className={botonP} onClick={() => { setForm({ editar: null, clave: Date.now() }); setAviso(''); setBorrar(null); }}>Agregar</button>}
      </div>
      {!puede && <p className="mb-4 rounded-lg bg-sand-50 px-3 py-2 text-sm text-navy">Con el perfil {perfil} podés mirar, pero solo Operación modifica colaboradoras.</p>}
      {aviso && <p role="status" className="mb-4 rounded-lg bg-coral-100 px-3 py-2 text-sm font-semibold text-navy">{aviso}</p>}

      <div role="group" aria-label="Filtrar por servicio" className="mb-4 flex gap-2">
        {FILTROS.map((f) => (
          <button key={f} aria-pressed={filtro === f} onClick={() => setFiltro(f)}
            className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400 ${filtro === f ? 'border-navy bg-navy text-sand-50' : 'border-navy/30 bg-white text-navy'}`}>{f}</button>
        ))}
      </div>

      {form && <Formulario key={form.clave} editar={form.editar} revision={snap.revision} onCerrar={(m) => { setForm(null); setAviso(m); }} />}

      {borrar && (
        <div role="alertdialog" aria-label="Confirmar eliminación" className="mb-6 rounded-2xl border-2 border-coral-600 bg-white p-4">
          <p className="font-semibold text-navy">¿Seguro que querés eliminar a {borrar.nombre}? Queda anotado en el historial.</p>
          {errBorrar.length > 0 && <ul role="alert" className="mt-2 list-disc pl-5 text-sm font-semibold text-navy">{errBorrar.map((m) => <li key={m}>{m}</li>)}</ul>}
          <div className="mt-3 flex gap-2">
            <button className={botonP} onClick={confirmarBorrar}>Sí, eliminar</button>
            <button className={botonS} onClick={() => setBorrar(null)}>No, dejala</button>
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-navy/20 p-6 text-center text-navy/70">Acá no hay nadie todavía.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lista.map((c) => (
            <li key={c.id} className="rounded-xl border-2 border-navy/15 bg-white/80 p-3">
              <div className="flex items-start gap-3">
                <span aria-hidden className={`mt-1 h-6 w-6 shrink-0 rounded-full shadow ${IMANES[todas.indexOf(c) % IMANES.length]}`} />
                <div className="text-navy">
                  <p className="font-semibold">{c.nombre} <span className="font-normal text-navy/60">· {c.especialidad}</span></p>
                  <p className="text-sm">{c.turno} {TURNO_HORARIO[c.turno]} · descansa {c.diaDescanso.toLowerCase()} · {c.comision} %</p>
                  <p className="text-sm">{c.estado}{c.fechaRegreso ? ` · vuelve el ${c.fechaRegreso}` : ''}</p>
                </div>
              </div>
              {puede && (
                <div className="mt-3 flex gap-2">
                  <button className={botonS} aria-label={`Editar a ${c.nombre}`} onClick={() => { setForm({ editar: c, clave: Date.now() }); setAviso(''); setBorrar(null); }}>Editar</button>
                  <button className={botonS} aria-label={`Eliminar a ${c.nombre}`} onClick={() => pedirBorrar(c)}>Eliminar</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
