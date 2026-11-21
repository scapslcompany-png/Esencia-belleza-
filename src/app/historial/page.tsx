'use client';
import { useRef, useState, type FormEvent } from 'react';

import { DIAS, ESPECIALIDADES, TURNOS } from '@/lib/salon/config';
import { ejecutarComando, useInstantanea, usePerfil } from '@/lib/salon/store';
import type { Colaboradora, Comando, Evento } from '@/lib/salon/types';

const boton = 'rounded-lg bg-navy px-4 py-2 font-semibold text-sand-50 hover:bg-navy/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400';
const botonS = 'rounded-lg border-2 border-navy/30 bg-white px-3 py-1.5 text-sm font-semibold text-navy hover:bg-sand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400';
const campo = 'mt-1 block w-full rounded-lg border-2 border-navy/30 bg-white px-3 py-2 text-navy focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400';
const nuevoId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(16).padStart(2, '0')).join('');
const fecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });

const ETIQUETAS: Record<string, string> = { especialidad: 'especialidad', turno: 'turno', diaDescanso: 'descanso', comision: 'comisión' };
const resumen = (c: Partial<Colaboradora>) => Object.entries(c).map(([k, v]) => `${ETIQUETAS[k] ?? k}: ${v}`).join(', ');

/** Formulario de cambios: sirve para proponer (Revisor) y para ajustar (Operación). */
function FormCambios({ titulo, enviar, onCerrar, colaboradoras }: {
  titulo: string; onCerrar: () => void; colaboradoras?: Colaboradora[];
  enviar: (colaboradoraId: string, cambios: Partial<Colaboradora>, motivo: string, id: string) => string[];
}) {
  const [d, setD] = useState({ col: colaboradoras?.[0]?.id ?? '', especialidad: '', turno: '', diaDescanso: '', comision: '', motivo: '' });
  const [errores, setErrores] = useState<string[]>([]);
  const id = useRef(nuevoId());
  const set = (k: keyof typeof d) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }));

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    const cambios: Partial<Colaboradora> = {};
    if (d.especialidad) cambios.especialidad = d.especialidad as Colaboradora['especialidad'];
    if (d.turno) cambios.turno = d.turno as Colaboradora['turno'];
    if (d.diaDescanso) cambios.diaDescanso = d.diaDescanso as Colaboradora['diaDescanso'];
    if (d.comision.trim() !== '') cambios.comision = Number(d.comision);
    const errs = enviar(d.col, cambios, d.motivo.trim(), id.current);
    if (errs.length) setErrores(errs); else onCerrar();
  }

  return (
    <form onSubmit={alEnviar} aria-label={titulo} className="mb-4 space-y-3 rounded-2xl border-2 border-navy/20 bg-white/90 p-4">
      <h2 className="font-display text-xl text-navy">{titulo}</h2>
      {errores.length > 0 && <ul role="alert" className="list-disc rounded-lg bg-coral-100 py-2 pl-7 pr-3 text-sm font-semibold text-navy">{errores.map((m) => <li key={m}>{m}</li>)}</ul>}
      <p className="text-sm text-navy/70">Completá solo lo que cambia.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {colaboradoras && (
          <label className="block text-sm font-semibold text-navy">Colaboradora
            <select className={campo} value={d.col} onChange={set('col')}>{colaboradoras.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
          </label>
        )}
        <label className="block text-sm font-semibold text-navy">Especialidad
          <select className={campo} value={d.especialidad} onChange={set('especialidad')}><option value="">Sin cambio</option>{ESPECIALIDADES.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block text-sm font-semibold text-navy">Turno
          <select className={campo} value={d.turno} onChange={set('turno')}><option value="">Sin cambio</option>{TURNOS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block text-sm font-semibold text-navy">Día de descanso
          <select className={campo} value={d.diaDescanso} onChange={set('diaDescanso')}><option value="">Sin cambio</option>{DIAS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="block text-sm font-semibold text-navy">Comisión (%)
          <input className={campo} inputMode="decimal" value={d.comision} onChange={set('comision')} /></label>
      </div>
      <label className="block text-sm font-semibold text-navy">Motivo (obligatorio)
        <input className={campo} value={d.motivo} onChange={set('motivo')} /></label>
      <div className="flex gap-2"><button type="submit" className={boton}>Enviar</button><button type="button" className={botonS} onClick={onCerrar}>Cancelar</button></div>
    </form>
  );
}

export default function Historial() {
  const snap = useInstantanea();
  const perfil = usePerfil();
  const [abierto, setAbierto] = useState<null | 'proponer' | { ajuste: Evento }>(null);
  const [aviso, setAviso] = useState('');
  const [errDec, setErrDec] = useState<Record<string, string[]>>({});
  const [rechazando, setRechazando] = useState<{ id: string; motivo: string; cmd: string } | null>(null);
  if (!snap || !perfil) return <p className="text-navy/70">Cargando…</p>;

  const cmd = (tipo: Comando['tipo'], entidad: string, datos: Comando['datos'], id = nuevoId()): Comando =>
    ({ id, tipo, entidad, actor: perfil, instante: new Date().toISOString(), revisionEsperada: snap.revision, datos });
  const nombre = (id: string) => snap.entidades.colaboradoras.find((c) => c.id === id)?.nombre ?? 'Colaboradora eliminada';
  const propuestas = [...snap.entidades.propuestas].reverse();
  const eventos = [...snap.eventos].reverse().slice(0, 60);

  function decidir(id: string, decision: 'aprobada' | 'rechazada', motivo = '') {
    const r = ejecutarComando(cmd('decidir-propuesta', id, { decision, motivo }));
    if (!r.ok) { setErrDec((x) => ({ ...x, [id]: r.errores })); return; }
    setErrDec({}); setRechazando(null); setAviso(decision === 'aprobada' ? 'Propuesta aprobada y aplicada.' : 'Propuesta rechazada.');
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-navy">Historial</h1>
          <p className="text-navy/70">Quién cambió qué y cuándo. Nada se borra: los errores se corrigen con un ajuste.</p>
        </div>
        {perfil === 'Revisor' && <button className={boton} onClick={() => { setAbierto('proponer'); setAviso(''); }}>Proponer cambio</button>}
      </div>
      {perfil === 'Auditor' && <p className="mb-4 rounded-lg bg-sand-50 px-3 py-2 text-sm text-navy">Con el perfil Auditor solo mirás.</p>}
      {aviso && <p role="status" className="mb-4 rounded-lg bg-coral-100 px-3 py-2 text-sm font-semibold text-navy">{aviso}</p>}

      {abierto === 'proponer' && (
        <FormCambios titulo="Proponer cambio" colaboradoras={snap.entidades.colaboradoras} onCerrar={() => setAbierto(null)}
          enviar={(col, cambios, motivo, id) => {
            const r = ejecutarComando(cmd('proponer', col, { cambios, motivo }, id));
            if (r.ok) setAviso('Propuesta enviada. Operación la va a decidir.');
            return r.ok ? [] : r.errores;
          }} />
      )}
      {abierto && typeof abierto === 'object' && (
        <FormCambios titulo={`Ajustar: ${abierto.ajuste.efecto}`} onCerrar={() => setAbierto(null)}
          enviar={(_c, cambios, motivo, id) => {
            const r = ejecutarComando(cmd('ajuste', abierto.ajuste.entidad, { eventoId: (abierto as { ajuste: Evento }).ajuste.id, cambios, motivo }, id));
            if (r.ok) setAviso('Ajuste guardado y vinculado al evento.');
            return r.ok ? [] : r.errores;
          }} />
      )}

      <h2 className="mb-2 font-display text-xl text-navy">Propuestas</h2>
      {propuestas.length === 0 ? <p className="mb-6 rounded-xl border-2 border-dashed border-navy/20 p-4 text-center text-navy/70">No hay propuestas.</p> : (
        <ul className="mb-6 space-y-2">
          {propuestas.map((p) => (
            <li key={p.id} className="rounded-xl border-2 border-navy/15 bg-white/80 p-3 text-navy">
              <p className="font-semibold">{nombre(p.entidad)} <span className="font-normal text-navy/60">· {p.decision}</span></p>
              <p className="text-sm">{resumen(p.cambios)}</p>
              <p className="text-sm text-navy/70">Motivo: {p.motivo} · propone {p.creador}{p.decisor ? ` · decide ${p.decisor}` : ''}</p>
              {errDec[p.id] && <ul role="alert" className="mt-2 list-disc pl-5 text-sm font-semibold">{errDec[p.id].map((m) => <li key={m}>{m}</li>)}</ul>}
              {p.decision === 'pendiente' && perfil === 'Operación' && (
                rechazando?.id === p.id ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input aria-label="Motivo del rechazo" placeholder="Por qué la rechazás" className={`${campo} !mt-0 flex-1`} value={rechazando.motivo} onChange={(e) => setRechazando({ ...rechazando, motivo: e.target.value })} />
                    <button className={botonS} onClick={() => decidir(p.id, 'rechazada', rechazando.motivo)}>Confirmar rechazo</button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button className={botonS} onClick={() => decidir(p.id, 'aprobada')}>Aprobar</button>
                    <button className={botonS} onClick={() => setRechazando({ id: p.id, motivo: '', cmd: '' })}>Rechazar</button>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 font-display text-xl text-navy">Cambios</h2>
      <ul className="space-y-2">
        {eventos.map((e) => (
          <li key={e.id} className="rounded-xl border-2 border-navy/15 bg-white/80 p-3 text-navy">
            <p className="text-sm text-navy/70">{fecha(e.fecha)} · {e.perfil} · v{e.versionAnterior}→v{e.versionNueva}{e.ajusteDe ? ' · ajuste' : ''}</p>
            <p className="font-semibold">{e.efecto}</p>
            <p className="text-sm text-navy/70">Motivo: {e.motivo}</p>
            {perfil === 'Operación' && e.estadoNuevo && snap.entidades.colaboradoras.some((c) => c.id === e.entidad) && (
              <button className={`${botonS} mt-2`} onClick={() => { setAbierto({ ajuste: e }); setAviso(''); window.scrollTo({ top: 0 }); }}>Ajustar</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
