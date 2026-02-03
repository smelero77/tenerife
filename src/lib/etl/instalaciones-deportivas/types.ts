/**
 * Type definitions for CKAN Instalaciones Deportivas ETL pipeline
 */

/**
 * Raw CKAN DataStore record structure for installations
 */
export interface RawCkanInstalacionRecord {
  instalacion_codigo?: string;
  instalacion_nombre?: string;
  municipio_nombre?: string;
  codigo_postal?: string | number;
  email?: string;
  telefono_fijo?: string | number;
  web?: string;
  fax?: string | number;
  propiedad?: string;
  tipo_gestion?: string;
  observaciones?: string;
  longitud?: string | number;
  latitud?: string | number;
  ultima_modificacion?: string;
  [key: string]: unknown;
}

/**
 * Raw CKAN DataStore record structure for sports spaces
 */
export interface RawCkanEspacioDeportivoRecord {
  instalacion_codigo?: string;
  espacio_codigo?: string;
  espacio_nombre?: string;
  espacio_tipo?: string;
  espacio_clase?: string;
  espacio_actividad_principal?: string;
  pavimento_tipo?: string;
  pavimento_conservacion?: string;
  espacio_cerramiento?: string;
  espacio_estado_uso?: string;
  espacio_calefaccion?: string;
  espacio_climatizacion?: string;
  espacio_iluminacion?: string;
  ultima_modificacion?: string;
  [key: string]: unknown;
}

/**
 * Raw CKAN DataStore record structure for complementary spaces
 */
export interface RawCkanEspacioComplementarioRecord {
  instalacion_codigo?: string;
  espacio_complementario_codigo?: string;
  espacio_complementario_nombre?: string;
  espacio_complementario_tipo?: string;
  espacio_complementario_clase?: string;
  ultima_modificacion?: string;
  [key: string]: unknown;
}

/**
 * Raw CKAN DataStore record structure for installation characteristics
 */
export interface RawCkanCaracteristicaInstalacionRecord {
  instalacion_codigo?: string;
  instalacion_nombre?: string;
  categoria?: string;
  subcategoria?: string;
  caracteristica?: string;
  [key: string]: unknown;
}

/**
 * Raw CKAN DataStore record structure for sports space characteristics
 */
export interface RawCkanCaracteristicaEspacioRecord {
  espacio_codigo?: string;
  espacio_nombre?: string;
  categoria?: string;
  caracteristica?: string;
  [key: string]: unknown;
}

/**
 * Bronze layer record
 */
export interface BronzeInstalacionDeportivaRecord {
  source_dataset_id: string;
  source_resource_id: string;
  resource_type: string;
  raw_row: Record<string, unknown>;
}

/**
 * Silver layer records
 */
export interface SilverInstalacionDeportivaRecord {
  source_dataset_id: string;
  source_resource_id: string;
  instalacion_codigo: string;
  instalacion_nombre: string;
  municipio_nombre: string;
  ine_code: string | null;
  codigo_postal: string | null;
  email: string | null;
  telefono_fijo: string | null;
  web: string | null;
  fax: string | null;
  propiedad: string | null;
  tipo_gestion: string | null;
  observaciones: string | null;
  longitud: number | null;
  latitud: number | null;
  ultima_modificacion: Date | null;
}

export interface SilverEspacioDeportivoRecord {
  source_dataset_id: string;
  source_resource_id: string;
  instalacion_codigo: string;
  espacio_codigo: string;
  espacio_nombre: string;
  espacio_tipo: string | null;
  espacio_clase: string | null;
  espacio_actividad_principal: string | null;
  pavimento_tipo: string | null;
  pavimento_conservacion: string | null;
  espacio_cerramiento: string | null;
  espacio_estado_uso: string | null;
  espacio_calefaccion: string | null;
  espacio_climatizacion: string | null;
  espacio_iluminacion: string | null;
  ultima_modificacion: Date | null;
}

export interface SilverEspacioComplementarioRecord {
  source_dataset_id: string;
  source_resource_id: string;
  instalacion_codigo: string;
  espacio_complementario_codigo: string;
  espacio_complementario_nombre: string;
  espacio_complementario_tipo: string | null;
  espacio_complementario_clase: string | null;
  ultima_modificacion: Date | null;
}

export interface SilverCaracteristicaInstalacionRecord {
  source_dataset_id: string;
  source_resource_id: string;
  instalacion_codigo: string;
  instalacion_nombre: string;
  categoria: string;
  subcategoria: string | null;
  caracteristica: string;
}

export interface SilverCaracteristicaEspacioRecord {
  source_dataset_id: string;
  source_resource_id: string;
  espacio_codigo: string;
  espacio_nombre: string;
  categoria: string;
  caracteristica: string;
}

/**
 * Fact layer record
 */
export interface FactInstalacionDeportivaRecord {
  ine_code: string;
  total_instalaciones: number;
  total_espacios_deportivos: number;
  total_espacios_complementarios: number;
}
