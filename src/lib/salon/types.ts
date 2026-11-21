import type { DIAS, ESPECIALIDADES, ESTADOS, PERFILES, TURNOS } from './config';

export type Perfil = (typeof PERFILES)[number];
export type Especialidad = (typeof ESPECIALIDADES)[number];
export type Turno = (typeof TURNOS)[number];
export type Dia = (typeof DIAS)[number];
export type Estado = (typeof ESTADOS)[number];

export type Colaboradora = {
  id: string;
  nombre: string;
  especialidad: Especialidad;
  turno: Turno;
  diaDescanso: Dia;
  estado: Estado;
  /** AAAA-MM-DD; obligatoria si el estado es Vacaciones o Baja. */
  fechaRegreso: string | null;
  /** Porcentaje de comisión. */
  comision: number;
};

export type TipoComando = 'crear' | 'editar' | 'eliminar' | 'ocupar' | 'cancelar-ocupacion' | 'ajuste' | 'decidir-propuesta';

export type Comando = {
  id: string;
  tipo: TipoComando;
  entidad: string;
  actor: Perfil;
  /** ISO 8601 */
  instante: string;
  revisionEsperada: number;
  datos: Record<string, unknown>;
};

export type Evento = {
  id: string;
  comandoId: string;
  entidad: string;
  fecha: string;
  perfil: Perfil;
  motivo: string;
  estadoAnterior: Colaboradora | null;
  estadoNuevo: Colaboradora | null;
  versionAnterior: number;
  versionNueva: number;
  efecto: string;
  /** Evento corregido, si este es un ajuste vinculado. */
  ajusteDe?: string;
};

export type Propuesta = {
  id: string;
  entidad: string;
  versionPartida: number;
  cambios: Partial<Colaboradora>;
  motivo: string;
  creador: Perfil;
  decision: 'pendiente' | 'aprobada' | 'rechazada';
  decisor: Perfil | null;
};

export type Servicio = 'Uñas' | 'Cabello';

/** Una colaboradora ocupada en un servicio durante el turno de un día. */
export type Ocupacion = { id: string; colaboradoraId: string; dia: Dia; turno: Turno; servicio: Servicio };

export type Instantanea = {
  schemaVersion: number;
  revision: number;
  entidades: { colaboradoras: Colaboradora[]; propuestas: Propuesta[]; ocupaciones?: Ocupacion[] };
  eventos: Evento[];
  comandos: Comando[];
};
