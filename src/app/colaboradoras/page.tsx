'use client';
import { TURNO_HORARIO } from '@/lib/salon/config';
import { useInstantanea } from '@/lib/salon/store';

const IMANES = ['bg-coral-400', 'bg-sky-300', 'bg-amber-300', 'bg-emerald-300', 'bg-violet-300'];

export default function Colaboradoras() {
  const snap = useInstantanea();
  if (!snap) return null;
  const lista = snap.entidades.colaboradoras;
  return (
    <section>
      <h1 className="font-display text-3xl text-navy">Colaboradoras</h1>
      <p className="mb-4 text-navy/70">{lista.length} en el pizarrón · revisión {snap.revision}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {lista.map((c, i) => (
          <li key={c.id} className="flex items-start gap-3 rounded-xl border-2 border-navy/15 bg-white/80 p-3">
            <span aria-hidden className={`mt-1 h-6 w-6 shrink-0 rounded-full ${IMANES[i % IMANES.length]} shadow`} />
            <div className="text-navy">
              <p className="font-semibold">{c.nombre} <span className="font-normal text-navy/60">· {c.especialidad}</span></p>
              <p className="text-sm">{c.turno} {TURNO_HORARIO[c.turno]} · descansa {c.diaDescanso.toLowerCase()} · {c.estado} · {c.comision} %</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
