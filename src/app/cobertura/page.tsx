'use client';
import { useRef, useState } from 'react';

import { grilla } from '@/lib/salon/cobertura';
import { DIAS, TURNO_HORARIO, TURNOS } from '@/lib/salon/config';
import { ejecutarComando, useInstantanea, usePerfil } from '@/lib/salon/store';
import type { Comando, Dia, Servicio } from '@/lib/salon/types';

const nuevoId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(16).padStart(2, '0')).join('');
const campo = 'w-full rounded-lg border-2 border-navy/25 bg-white px-3 py-2 text-navy focus:border-navy focus:outline-none';
const boton = 'rounded-lg bg-navy px-4 py-2 font-semibold text-sand-50 hover:bg-navy/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400';

export default function Pantalla() {
  const snap = useInstantanea();
  const perfil = usePerfil();
  const [colab, setColab] = useState('');
  const [dia, setDia] = useState<Dia>('Lunes');
  const [servicio, setServicio] = useState<Servicio>('Uñas');
  const [msg, setMsg] = useState<{ ok: boolean; textos: string[] } | null>(null);
  const ids = useRef<Record<string, string>>({});
  if (!snap) return <p className="text-navy/70">Cargando…</p>;

  const cs = snap.entidades.colaboradoras;
  const ocu = snap.entidades.ocupaciones ?? [];
  const celdas = grilla(snap);
  const nombre = (id: string) => cs.find((c) => c.id === id)?.nombre ?? id;
  const puede = perfil === 'Operación';

  function lanzar(clave: string, tipo: 'ocupar' | 'cancelar-ocupacion', entidad: string, datos: Record<string, unknown>) {
    // Mismo id para la misma acción mientras no se guarde: un reintento no duplica.
    const id = (ids.current[clave] ??= nuevoId());
    const cmd: Comando = { id, tipo, entidad, actor: perfil ?? 'Operación', instante: new Date().toISOString(), revisionEsperada: snap!.revision, datos };
    const r = ejecutarComando(cmd);
    if (r.ok) { delete ids.current[clave]; setMsg({ ok: true, textos: [r.evento?.efecto ?? 'Listo.'] }); }
    else setMsg({ ok: false, textos: r.errores });
  }

  return (
    <section>
      <h1 className="font-display text-3xl text-navy">Cobertura</h1>
      <p className="mt-1 text-navy/70">Activas por turno, sin contar a quien descansa ese día. Se actualiza sola.</p>

      {cs.length === 0 ? (
        <p className="mt-4 rounded-xl border-2 border-navy/20 bg-white p-4 font-semibold text-navy">Sin datos: todavía no cargaste colaboradoras.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border-2 border-navy bg-white">
          <table className="w-full table-fixed border-collapse text-center text-navy" aria-label="Cobertura de 7 días por 2 turnos">
            <thead>
              <tr className="bg-navy text-sand-50">
                <th scope="col" className="w-[22%] p-1.5 text-left text-xs sm:text-sm">Día</th>
                {TURNOS.map((t) => (
                  <th key={t} scope="col" className="p-1.5 text-xs sm:text-sm">{t} <span className="block font-normal opacity-80">{TURNO_HORARIO[t]}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIAS.map((d) => (
                <tr key={d} className="border-t-2 border-navy/20">
                  <th scope="row" className="p-1.5 text-left text-xs font-bold sm:text-sm">{d.slice(0, 3)}<span className="hidden sm:inline">{d.slice(3)}</span></th>
                  {TURNOS.map((t) => {
                    const c = celdas.find((x) => x.dia === d && x.turno === t)!;
                    const sinUnas = c.unas === 0;
                    return (
                      <td key={t} data-testid={`celda-${d}-${t}`} className={`border-l-2 border-navy/20 p-1.5 ${sinUnas ? 'bg-red-50' : ''}`}>
                        {sinUnas ? <p className="text-sm font-extrabold text-red-700">Sin uñas</p> : <p className="text-sm font-bold">Uñas {c.unas}</p>}
                        <p className="text-sm">Cabello {c.cabello}</p>
                        {c.total === 0 ? (
                          <p className="text-xs text-navy/70">Sin datos</p>
                        ) : (
                          (c.unasLibres !== c.unas || c.cabelloLibres !== c.cabello) && (
                            <p className="text-xs text-navy/70">Libres: {c.unasLibres} u · {c.cabelloLibres} c</p>
                          )
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-8 font-display text-2xl text-navy">Ocupaciones</h2>
      <p className="text-navy/70">Si ocupás a una «Ambas» en un servicio, ese turno no queda libre para el otro hasta que cancelés.</p>
      {puede ? (
        <form
          className="mt-3 grid gap-3 rounded-xl border-2 border-navy/20 bg-white p-4 sm:grid-cols-4"
          onSubmit={(e) => { e.preventDefault(); lanzar(`o|${colab}|${dia}|${servicio}`, 'ocupar', colab, { dia, servicio }); }}
        >
          <label className="text-sm font-semibold text-navy">Colaboradora
            <select className={campo} value={colab} onChange={(e) => setColab(e.target.value)} required>
              <option value="">Elegí…</option>
              {cs.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.especialidad})</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-navy">Día
            <select className={campo} value={dia} onChange={(e) => setDia(e.target.value as Dia)}>{DIAS.map((d) => <option key={d}>{d}</option>)}</select>
          </label>
          <label className="text-sm font-semibold text-navy">Servicio
            <select className={campo} value={servicio} onChange={(e) => setServicio(e.target.value as Servicio)}><option>Uñas</option><option>Cabello</option></select>
          </label>
          <div className="flex items-end"><button className={`${boton} w-full`} type="submit">Ocupar</button></div>
        </form>
      ) : (
        <p className="mt-3 text-sm text-navy/70">Solo Operación puede ocupar o cancelar.</p>
      )}

      {msg && (
        <div role={msg.ok ? 'status' : 'alert'} className={`mt-3 rounded-lg border-2 p-3 text-sm font-semibold ${msg.ok ? 'border-navy/30 bg-coral-100 text-navy' : 'border-red-700 bg-white text-red-700'}`}>
          {msg.textos.map((t) => <p key={t}>{t}</p>)}
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {ocu.length === 0 && <li className="text-navy/70">No hay ocupaciones.</li>}
        {ocu.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border-2 border-navy/20 bg-white p-3 text-navy">
            <span><b>{nombre(o.colaboradoraId)}</b> · {o.servicio} · {o.dia} {o.turno.toLowerCase()}</span>
            {puede && <button className="rounded-lg border-2 border-navy/30 px-3 py-1.5 text-sm font-semibold hover:bg-sand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400" onClick={() => lanzar(`c|${o.id}`, 'cancelar-ocupacion', o.colaboradoraId, { ocupacionId: o.id })}>Cancelar</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
