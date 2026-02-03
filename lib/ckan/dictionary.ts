/**
 * CKAN Data Dictionary utilities
 * Fetches and parses data dictionaries to understand unique keys and field definitions
 */

export interface CkanFieldDefinition {
  id: string;
  type: string;
  info?: {
    label?: string;
    notes?: string;
    type_override?: string;
    [key: string]: unknown;
  };
}

export interface CkanDataDictionary {
  fields: CkanFieldDefinition[];
  primary_key?: string[];
  unique_keys?: string[];
  [key: string]: unknown;
}

/**
 * Fetch data dictionary from CKAN resource
 */
export async function fetchDataDictionary(
  resourceId: string,
  baseUrl: string = 'https://datos.tenerife.es/ckan/api/3/action'
): Promise<CkanDataDictionary | null> {
  try {
    // Try to get resource info which may contain dictionary
    const resourceUrl = `${baseUrl}/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=0`;
    const response = await fetch(resourceUrl, {
      headers: {
        'User-Agent': 'Tenerife ETL Pipeline',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch resource info: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.success || !data.result) {
      return null;
    }

    // Extract field definitions
    const fields: CkanFieldDefinition[] = (data.result.fields || []).map((field: { id: string; type: string; info?: unknown }) => ({
      id: field.id,
      type: field.type,
      info: field.info as CkanFieldDefinition['info'],
    }));

    // Look for primary key or unique constraints in field info
    const primaryKey: string[] = [];
    const uniqueKeys: string[] = [];

    for (const field of fields) {
      if (field.info) {
        // Check if field is marked as primary key
        if (field.info.type_override === 'primary_key' || 
            (field.info as Record<string, unknown>).primary_key === true) {
          primaryKey.push(field.id);
        }
        // Check if field is marked as unique
        if ((field.info as Record<string, unknown>).unique === true) {
          uniqueKeys.push(field.id);
        }
      }
    }

    return {
      fields,
      primary_key: primaryKey.length > 0 ? primaryKey : undefined,
      unique_keys: uniqueKeys.length > 0 ? uniqueKeys : undefined,
    };
  } catch (error) {
    console.warn('Error fetching data dictionary:', error);
    return null;
  }
}

/**
 * Fetch data dictionary JSON file from CKAN package resources
 * Looks for a resource with format "JSON" and name containing "diccionario"
 */
export async function fetchDataDictionaryFromResource(
  packageId: string,
  baseUrl: string = 'https://datos.tenerife.es/ckan/api/3/action'
): Promise<CkanDataDictionary | null> {
  try {
    // Get package info
    const packageUrl = `${baseUrl}/package_show?id=${encodeURIComponent(packageId)}`;
    const response = await fetch(packageUrl, {
      headers: {
        'User-Agent': 'Tenerife ETL Pipeline',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch package info: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.success || !data.result || !data.result.resources) {
      return null;
    }

    // Find dictionary resource (usually JSON format with "diccionario" in name)
    const dictionaryResource = data.result.resources.find((resource: { format?: string; name?: string; url?: string }) => {
      const format = (resource.format || '').toLowerCase();
      const name = (resource.name || '').toLowerCase();
      return format === 'json' && (name.includes('diccionario') || name.includes('dictionary'));
    });

    if (!dictionaryResource || !dictionaryResource.url) {
      console.warn('No dictionary resource found in package');
      return null;
    }

    // Fetch dictionary JSON
    const dictResponse = await fetch(dictionaryResource.url, {
      headers: {
        'User-Agent': 'Tenerife ETL Pipeline',
        'Accept': 'application/json',
      },
    });

    if (!dictResponse.ok) {
      console.warn(`Failed to fetch dictionary file: ${dictResponse.status}`);
      return null;
    }

    const dictionary = await dictResponse.json();
    return dictionary as CkanDataDictionary;
  } catch (error) {
    console.warn('Error fetching data dictionary from resource:', error);
    return null;
  }
}

/**
 * Analyze data dictionary to suggest unique key
 * Returns suggested unique key fields based on dictionary and data patterns
 */
export function suggestUniqueKey(
  dictionary: CkanDataDictionary | null,
  sampleRecords: Array<Record<string, unknown>>,
  maxSamples: number = 100
): string[] {
  const suggestions: string[] = [];

  // If dictionary specifies primary key, use that
  if (dictionary?.primary_key && dictionary.primary_key.length > 0) {
    return dictionary.primary_key;
  }

  // If dictionary specifies unique keys, use those
  if (dictionary?.unique_keys && dictionary.unique_keys.length > 0) {
    return dictionary.unique_keys;
  }

  // Analyze sample data to find potential unique combinations
  const samples = sampleRecords.slice(0, maxSamples);
  
  // Common patterns for unique keys in CKAN datasets
  const candidateFields = [
    'nombre',
    'municipio_nombre',
    'municipio_codigo',
    'direccion_nombre_via',
    'direccion_numero',
    'direccion_codigo_postal',
    'latitud',
    'longitud',
  ];

  // Check which fields exist in the data
  const availableFields = candidateFields.filter(field => 
    samples.some(record => record[field] !== undefined && record[field] !== null && record[field] !== '')
  );

  // Try combinations to find unique ones
  // Start with most specific combinations
  const combinations = [
    ['nombre', 'municipio_codigo', 'direccion_nombre_via', 'direccion_numero'],
    ['nombre', 'municipio_codigo', 'direccion_codigo_postal'],
    ['nombre', 'municipio_codigo', 'latitud', 'longitud'],
    ['nombre', 'municipio_nombre', 'direccion_nombre_via', 'direccion_numero'],
    ['nombre', 'municipio_nombre'],
  ];

  for (const combo of combinations) {
    const availableCombo = combo.filter(field => availableFields.includes(field));
    if (availableCombo.length === 0) continue;

    // Check if this combination is unique in samples
    const uniqueValues = new Set<string>();
    let allUnique = true;

    for (const record of samples) {
      const key = availableCombo.map(field => String(record[field] || '')).join('|');
      if (uniqueValues.has(key)) {
        allUnique = false;
        break;
      }
      uniqueValues.add(key);
    }

    if (allUnique && availableCombo.length > 0) {
      return availableCombo;
    }
  }

  // Fallback: return most common combination
  if (availableFields.includes('nombre') && availableFields.includes('municipio_nombre')) {
    return ['nombre', 'municipio_nombre'];
  }

  return availableFields.slice(0, 2);
}
