'use client';
import { useRef, useState } from 'react';

import { colaboradorasCsv, descargar, historialCsv, migrar } from '@/lib/salon/io';
import { guardar, useInstantanea, usePerfil } from '@/lib/salon/store';
import type { Instantanea } from '@/lib/salon/types';

const botonS = 'rounded-lg border-2 border-navy/30 bg-white px-4 py-2 font-semibold text-navy hover:bg-sand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400';
const boton = 'rounded-lg bg-navy px-4 py-2 font-semibold text-sand-50 hover:bg-navy/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400';
const hoy = () => new Date().toISOString().slice(0, 10);

export default function Pantalla() {
  const snap = useInstantanea();
  const perfil = usePerfil();
  const [pendiente, setPendiente] = useState<{ snap: Instantanea; migrada: boolean; nombre: string } | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  if (!snap) return null;
  const puede = perfil === 'Operación';

  async function elegir(file: File | undefined) {
    setAviso(null); setPendiente(null);
    if (!file) return;
    if (file.size > 5_000_000) { setAviso({ ok: false, texto: 'El archivo es demasiado grande. No cambié nada.' }); return; }
    let datos: unknown;
    try { datos = JSON.parse(await file.text()); } catch { setAviso({ ok: false, texto: 'No pude leer el archivo: no es un JSON válido. No cambié nada.' }); return; }
    const r = migrar(datos);
    if (!r.ok) { setAviso({ ok: false, texto: r.error }); return; }
    setPendiente({ snap: r.snap, migrada: r.migrada, nombre: file.name });
  }

  function restaurar() {
    if (!pendiente) return;
    try {
      guardar(pendiente.snap);
      setAviso({ ok: true, texto: `Listo, restauré la copia (${pendiente.snap.entidades.colaboradoras.length} colaboradoras).${pendiente.migrada ? ' Era de la versión 1 y la actualicé.' : ''}` });
    } catch {
      setAviso({ ok: false, texto: 'No se pudo guardar. Tus datos siguen como estaban.' });
    }
    setPendiente(null);
    if (input.current) input.current.value = '';
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-navy">Control y exportación</h1>
        <p className="mt-1 text-navy/70">Descargá tus datos o volvé a una copia anterior.</p>
      </div>

      <div className="rounded-2xl border-2 border-navy/20 bg-white/90 p-4">
        <h2 className="font-display text-xl text-navy">Descargas</h2>
        <p className="mt-1 text-sm text-navy/70">{snap.entidades.colaboradoras.length} colaboradoras, {snap.eventos.length} cambios registrados.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={botonS} onClick={() => descargar(`colaboradoras-${hoy()}.csv`, colaboradorasCsv(snap), 'text/csv;charset=utf-8')}>Colaboradoras (CSV)</button>
          <button className={botonS} onClick={() => descargar(`historial-${hoy()}.csv`, historialCsv(snap), 'text/csv;charset=utf-8')}>Historial (CSV)</button>
          <button className={boton} onClick={() => descargar(`esencia-belleza-copia-${hoy()}.json`, JSON.stringify(snap, null, 2), 'application/json')}>Copia completa (JSON)</button>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-navy/20 bg-white/90 p-4">
        <h2 className="font-display text-xl text-navy">Restaurar una copia</h2>
        {!puede ? (
          <p className="mt-2 text-sm text-navy">Con el perfil {perfil} podés mirar, pero solo Operación restaura copias.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-navy/70">Elegí una copia JSON descargada antes. Reemplaza todos los datos actuales; si es de la versión 1, la actualizo sola.</p>
            <label className="mt-3 block text-sm font-semibold text-navy">Archivo de copia
              <input ref={input} type="file" accept="application/json,.json" onChange={(e) => elegir(e.target.files?.[0])}
                className="mt-1 block w-full rounded-lg border-2 border-navy/30 bg-white px-3 py-2 text-navy" />
            </label>
            {pendiente && (
              <div role="alertdialog" aria-label="Confirmar restauración" className="mt-3 rounded-lg bg-sand-50 p-3 text-sm text-navy">
                <p className="font-semibold">¿Reemplazar todo con «{pendiente.nombre}»?</p>
                <p className="mt-1">La copia tiene {pendiente.snap.entidades.colaboradoras.length} colaboradoras y {pendiente.snap.eventos.length} cambios. Lo actual se pierde.{pendiente.migrada ? ' Es de la versión 1: la actualizo al restaurar.' : ''}</p>
                <div className="mt-2 flex gap-2">
                  <button className={boton} onClick={restaurar}>Sí, restaurar</button>
                  <button className={botonS} onClick={() => { setPendiente(null); if (input.current) input.current.value = ''; }}>Cancelar</button>
                </div>
              </div>
            )}
          </>
        )}
        {aviso && <p role={aviso.ok ? 'status' : 'alert'} className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-navy ${aviso.ok ? 'bg-sand-50' : 'bg-coral-100'}`}>{aviso.texto}</p>}
      </div>
    </section>
  );
}
