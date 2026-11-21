'use client';
import { useSyncExternalStore } from 'react';

import { SCHEMA_VERSION, SESSION_KEY, SNAPSHOT_KEY } from './config';
import { ejecutar, type Resultado } from './engine';
import { migrar } from './io';
import { crearSemilla } from './seed';
import type { Comando, Instantanea, Perfil } from './types';

const listeners = new Set<() => void>();
let cache: Instantanea | null = null;

function valida(x: unknown): x is Instantanea {
  const s = x as Instantanea;
  return !!s && s.schemaVersion === SCHEMA_VERSION && typeof s.revision === 'number' && Array.isArray(s.entidades?.colaboradoras)
    && Array.isArray(s.eventos) && Array.isArray(s.comandos);
}

/** Lee la instantánea guardada; si no existe o está dañada, siembra los datos de ejemplo. */
export function leer(): Instantanea {
  if (cache) return cache;
  let snap: Instantanea | null = null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (raw) { const p = JSON.parse(raw); if (valida(p)) snap = p; else { const m = migrar(p); if (m.ok) snap = m.snap; } }
  } catch { /* se siembra de nuevo */ }
  if (!snap) {
    snap = crearSemilla();
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap)); } catch { /* sin almacenamiento */ }
  }
  cache = snap;
  return snap;
}

/** Guarda una instantánea completa (todo o nada). Lanza si no se puede guardar. */
export function guardar(snap: Instantanea) {
  // Gancho de prueba: `window.__esenciaFallaGuardado = true` simula un fallo de almacenamiento.
  if ((globalThis as { __esenciaFallaGuardado?: boolean }).__esenciaFallaGuardado) throw new Error('Fallo de guardado simulado');
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  cache = snap;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === SNAPSHOT_KEY) { cache = null; l(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage); };
}

/** La instantánea actual, o null mientras carga en el navegador. */
export function useInstantanea(): Instantanea | null {
  return useSyncExternalStore(subscribe, leer, () => null);
}

// Sesión de la demo: solo dura mientras la pestaña está abierta.
const sesionListeners = new Set<() => void>();
export function iniciarSesion(perfil: Perfil) { sessionStorage.setItem(SESSION_KEY, perfil); sesionListeners.forEach((l) => l()); }
export function cerrarSesion() { sessionStorage.removeItem(SESSION_KEY); sesionListeners.forEach((l) => l()); }
const leerSesion = () => (sessionStorage.getItem(SESSION_KEY) as Perfil | null) ?? null;
export function usePerfil(): Perfil | null | undefined {
  return useSyncExternalStore((l) => { sesionListeners.add(l); return () => { sesionListeners.delete(l); }; }, leerSesion, () => undefined);
}

/** Ejecuta un comando sobre el estado guardado. Si no se puede guardar, el estado queda como estaba. */
export function ejecutarComando(cmd: Comando): Resultado {
  const r = ejecutar(leer(), cmd);
  if (!r.ok || r.repetido) return r;
  try {
    guardar(r.snap);
  } catch {
    return { ok: false, errores: ['No se pudo guardar. Tus datos siguen como estaban y el formulario conserva lo que escribiste: probá de nuevo.'] };
  }
  return r;
}
