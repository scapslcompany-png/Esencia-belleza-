'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';

import { CLAVE, PERFILES } from '@/lib/salon/config';
import { cerrarSesion, iniciarSesion, usePerfil } from '@/lib/salon/store';
import type { Perfil } from '@/lib/salon/types';

const NAV = [
  { href: '/colaboradoras', label: 'Colaboradoras' },
  { href: '/cobertura', label: 'Cobertura' },
  { href: '/historial', label: 'Historial' },
  { href: '/control', label: 'Control' },
];

export const AVISO = 'Acceso local sin verificación de identidad. Demo de una sesión, datos sintéticos en este navegador';

function Entrada() {
  const [clave, setClave] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('Operación');
  const [error, setError] = useState('');
  function enviar(e: FormEvent) {
    e.preventDefault();
    if (clave !== CLAVE) { setError('Esa clave no es la correcta. Probá de nuevo.'); return; }
    iniciarSesion(perfil);
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-coral-600">Pizarrón de turnos</p>
        <h1 className="font-display text-4xl text-navy">Esencia belleza</h1>
        <p className="mt-2 text-navy/70">¡Hola! Pasá con tu clave y elegí tu perfil.</p>
      </div>
      <form onSubmit={enviar} className="space-y-4 rounded-2xl border-2 border-navy/15 bg-white/80 p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-navy">Clave</span>
          <input type="password" value={clave} onChange={(e) => { setClave(e.target.value); setError(''); }} autoComplete="off"
            className="w-full rounded-lg border-2 border-navy/25 bg-white px-3 py-2 text-navy focus:border-navy focus:outline-none" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-navy">Perfil</span>
          <select value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}
            className="w-full rounded-lg border-2 border-navy/25 bg-white px-3 py-2 text-navy focus:border-navy focus:outline-none">
            {PERFILES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        <button type="submit" className="w-full rounded-lg bg-navy px-4 py-2.5 font-semibold text-sand-50 hover:bg-navy/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-coral-400">Entrar</button>
        <p className="rounded-lg bg-coral-100 px-3 py-2 text-sm text-navy">{AVISO}.</p>
      </form>
    </main>
  );
}

export function SalonShell({ children }: { children: ReactNode }) {
  const perfil = usePerfil();
  const path = usePathname();
  if (perfil === undefined) return <div className="min-h-dvh" />;
  if (!perfil) return <Entrada />;
  return (
    <div className="min-h-dvh">
      <header className="bg-navy text-sand-50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href="/colaboradoras" className="font-display text-xl">Esencia belleza</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-coral-400 px-3 py-1 font-semibold text-navy">{perfil}</span>
            <button onClick={cerrarSesion} className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-400">Salir</button>
          </div>
        </div>
        <nav aria-label="Pantallas" className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3">
          {NAV.map((n) => {
            const on = path === n.href;
            return (
              <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined}
                className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 ${on ? 'bg-sand-100 text-navy' : 'text-sand-50/80 hover:text-white'}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <p className="mx-auto max-w-5xl px-4 pb-6 text-xs text-navy/60">{AVISO}.</p>
    </div>
  );
}
