export type Usuario = {
  id_usuario: string;
  nombre: string;
  contrasena: string;
  fecha_nacimiento: string | null;
  peso: number | null;
  relacion_insulina_carbohidrato: number | null;
  created_at: string;
};

export type Insulina = {
  id_insulina: string;
  id_usuario?: string;
  nombre: string;
  tipo: string;
  caducidad: string | null;
  notas: string | null;
  activo?: number;
  created_at?: string;
};

export type Dosis = {
  id_dosis: string;
  insulina_id: string;
  etiqueta: string | null;
  horario: string;
  unidades: number;
};

export type DosisDB = Dosis;

export type DosisForm = {
  id_dosis?: string;
  etiqueta: string;
  horario: string;
  unidades: string;
};

export type Medicamento = {
  id_medicamento: string;
  id_usuario?: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
  horario: string;
  caducidad: string | null;
  indicaciones: string | null;
  activo: number;
  duracion_dias?: number;
  created_at?: string;
};

export type AplicacionInsulina = {
  id_aplicacion_insulina: string;
  insulina_id: string;
  dosis_id?: string | null;
  unidades: number;
  fecha: string;
  hora: string;
  zona: string;
  sitio_detalle?: string | null;
  notas?: string | null;
};

export type TomaMedicamento = {
  id_toma_medicamento: string;
  medicamento_id: string;
  fecha: string;
  hora: string;
  estado: string;
  notas?: string | null;
};

export type ProximaDosis = {
  insulina: Insulina;
  dosis: Dosis;
};

export type ZonaInyeccion = 'abdomen' | 'brazo' | 'muslo';

export type InfoPunto = {
  usadoReciente: boolean;
  diasDesdeUso: number | null;
  nivel: 'ok' | 'precaucion' | 'advertencia';
};

export type EstadisticasUsuario = {
  diasUsando: number;
  totalAplicaciones: number;
  totalTomas: number;
  adherenciaPromedio: number;
};
