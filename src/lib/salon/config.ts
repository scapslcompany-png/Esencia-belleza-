// Clave simple de la demo. Para cambiarla, editá este valor y volvé a publicar.
export const CLAVE = 'esencia2024';

export const SNAPSHOT_KEY = 'esencia-belleza:instantanea';
export const SESSION_KEY = 'esencia-belleza:sesion';
export const SCHEMA_VERSION = 2;

export const PERFILES = ['Operación', 'Revisor', 'Auditor'] as const;
export const ESPECIALIDADES = ['Uñas', 'Cabello', 'Ambas'] as const;
export const TURNOS = ['Mañana', 'Tarde'] as const;
export const TURNO_HORARIO: Record<(typeof TURNOS)[number], string> = { Mañana: '9-15', Tarde: '16-22' };
export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
export const ESTADOS = ['Activa', 'Vacaciones', 'Baja'] as const;

// Servicios reales del salón. Los precios (MXN) son solo de referencia, no se usan en cálculos.
export const SERVICIOS = {
  Uñas: [
    { nombre: 'Uñas acrílicas tip', precio: '$350' },
    { nombre: 'Uñas esculturales', precio: '$450' },
    { nombre: 'Baño de acrílico', precio: '$350' },
    { nombre: 'Manicura spa', precio: '$250' },
    { nombre: 'Pedicura spa clásico', precio: '$380' },
    { nombre: 'Pedicura jelly spa', precio: '$480' },
    { nombre: 'Gelish por uña (según nivel de diseño)', precio: '$28 a $68' },
    { nombre: 'Nail art por uña', precio: 'desde $25' },
    { nombre: 'Retiro', precio: '$100' },
  ],
  Cabello: [
    { nombre: 'Corte de dama con blower', precio: '' },
    { nombre: 'Balayage y babylights', precio: '' },
    { nombre: 'Alaciado permanente', precio: '' },
  ],
} as const;
