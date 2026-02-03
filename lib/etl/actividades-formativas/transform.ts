/**
 * Transform raw CKAN records to Silver layer records
 */

import { RawCkanActividadRecord, SilverActividadRecord } from './types';
import { mapMunicipioToIneCode, buildMunicipiosMap } from '../ckan/transform';

/**
 * Normalize string value (trim and handle empty strings)
 */
function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  return str === '' ? null : str;
}

/**
 * Normalize integer value (handle strings and numbers)
 */
function normalizeInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : Math.floor(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'NULL') {
      return null;
    }
    const num = parseInt(trimmed, 10);
    return isNaN(num) || !isFinite(num) ? null : num;
  }
  return null;
}

/**
 * Normalize numeric value (handle strings and numbers)
 */
function normalizeNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? null : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'NULL') {
      return null;
    }
    const num = parseFloat(trimmed);
    return isNaN(num) || !isFinite(num) ? null : num;
  }
  return null;
}

/**
 * Parse ISO date string to ISO string for PostgreSQL
 */
function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  if (str === '' || str === 'null' || str === 'NULL') {
    return null;
  }
  
  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Transform raw CKAN record to Silver record
 */
export function transformActividadRecord(
  rawRecord: RawCkanActividadRecord,
  sourceDatasetId: string,
  sourceResourceId: string
): SilverActividadRecord | null {
  // Required fields
  const actividadId = normalizeString(rawRecord.actividad_id);
  const actividadTitulo = normalizeString(rawRecord.actividad_titulo);
  const actividadTipo = normalizeString(rawRecord.actividad_tipo);
  const agenciaNombre = normalizeString(rawRecord.agencia_nombre);
  const municipioNombre = normalizeString(rawRecord.municipio_nombre);
  const actividadEstado = normalizeString(rawRecord.actividad_estado);

  // Validate required fields
  if (!actividadId || !actividadTitulo || !actividadTipo || !agenciaNombre || !municipioNombre || !actividadEstado) {
    return null; // Skip records with missing required fields
  }

  // Optional fields
  const lugarNombre = normalizeString(rawRecord.lugar_nombre);
  const actividadDias = normalizeInteger(rawRecord.actividad_dias);
  const actividadHoras = normalizeNumeric(rawRecord.actividad_horas);
  const actividadPlazas = normalizeInteger(rawRecord.actividad_plazas);
  const actividadHorario = normalizeString(rawRecord.actividad_horario);
  const inscripcionEstado = normalizeString(rawRecord.inscripcion_estado);
  const actividadInicio = parseDate(rawRecord.actividad_inicio);
  const actividadFin = parseDate(rawRecord.actividad_fin);

  return {
    source_dataset_id: sourceDatasetId,
    source_resource_id: sourceResourceId,
    actividad_id: actividadId,
    actividad_titulo: actividadTitulo,
    actividad_tipo: actividadTipo,
    agencia_nombre: agenciaNombre,
    lugar_nombre: lugarNombre,
    municipio_nombre: municipioNombre,
    ine_code: null, // Will be populated by mapping step
    actividad_dias: actividadDias,
    actividad_horas: actividadHoras,
    actividad_plazas: actividadPlazas,
    actividad_horario: actividadHorario,
    actividad_estado: actividadEstado,
    actividad_inicio: actividadInicio,
    actividad_fin: actividadFin,
    inscripcion_estado: inscripcionEstado,
  };
}

/**
 * Re-export mapping functions from ckan/transform
 */
export { mapMunicipioToIneCode, buildMunicipiosMap };
