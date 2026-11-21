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
