/**
 * Functions to fetch data from Wikidata API
 */

import { WikidataApiResponse, WikidataEntity, SilverWikimediaRecord } from './types';

const WIKIDATA_API_BASE = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

/**
 * Search for Wikidata entity by INE code (P772)
 */
export async function findWikidataIdByIneCode(ineCode: string): Promise<string | null> {
  const sparqlQuery = `
    SELECT ?item WHERE {
      ?item wdt:P772 "${ineCode}" .
    }
    LIMIT 1
  `;

  const url = `${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(sparqlQuery)}&format=json`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Tenerife ETL Pipeline (https://github.com/your-repo)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SPARQL query failed: ${response.statusText}`);
    }

    const data = await response.json();
    const bindings = data.results?.bindings || [];

    if (bindings.length === 0) {
      return null;
    }

    const itemUri = bindings[0].item?.value;
    if (!itemUri) {
      return null;
    }

    // Extract Q-id from URI (e.g., "http://www.wikidata.org/entity/Q12345" -> "Q12345")
    const match = itemUri.match(/\/Q(\d+)$/);
    return match ? `Q${match[1]}` : null;
  } catch (error) {
    console.error(`Error finding Wikidata ID for INE code ${ineCode}:`, error);
    throw error;
  }
}

/**
 * Fetch entity data from Wikidata API
 */
export async function fetchWikidataEntity(qid: string, includeLabels = false): Promise<WikidataEntity | null> {
  // Include labels if requested (needed for mayor name extraction)
  // Using 'claims|sitelinks|labels|descriptions' to get all available data
  const props = includeLabels ? 'claims|sitelinks|labels|descriptions' : 'claims|sitelinks|labels|descriptions';
  const url = `${WIKIDATA_API_BASE}?action=wbgetentities&ids=${qid}&format=json&props=${props}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Tenerife ETL Pipeline (https://github.com/your-repo)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Wikidata API failed: ${response.statusText}`);
    }

    const data: WikidataApiResponse = await response.json();
    const entity = data.entities?.[qid];

    if (!entity || entity.type === 'item') {
      return entity || null;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Wikidata entity ${qid}:`, error);
    throw error;
  }
}

/**
 * Extract property value from Wikidata claim
 */
function extractPropertyValue(claims: WikidataEntity['claims'], property: string): unknown | null {
  if (!claims || !claims[property] || claims[property].length === 0) {
    return null;
  }

  const claim = claims[property][0];
  if (claim.mainsnak.snaktype !== 'value' || !claim.mainsnak.datavalue) {
    return null;
  }

  return claim.mainsnak.datavalue.value;
}

/**
 * Extract coordinates (P625)
 */
function extractCoordinates(claims: WikidataEntity['claims']): { lat: number; lon: number } | null {
  const value = extractPropertyValue(claims, 'P625') as { latitude?: number; longitude?: number } | null;
  if (!value || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
    return null;
  }
  return { lat: value.latitude, lon: value.longitude };
}

/**
 * Extract quantity value (for surface area, altitude)
 * Wikidata quantities have format: { amount: "+1234567", unit: "http://..." }
 * The amount is a string that may include a sign (+ or -)
 */
function extractQuantity(claims: WikidataEntity['claims'], property: string): number | null {
  const value = extractPropertyValue(claims, property) as { amount?: string | number; unit?: string } | null;
  if (!value) {
    return null;
  }
  
  // Handle both string and number amounts
  let amountValue: number;
  if (typeof value.amount === 'number') {
    amountValue = value.amount;
  } else if (typeof value.amount === 'string') {
    // Remove leading + sign if present, parse as float
    const cleanAmount = value.amount.replace(/^\+/, '');
    amountValue = parseFloat(cleanAmount);
  } else {
    return null;
  }
  
  if (isNaN(amountValue) || !isFinite(amountValue)) {
    return null;
  }
  
  return amountValue;
}

/**
 * Extract string value
 */
function extractString(claims: WikidataEntity['claims'], property: string): string | null {
  const value = extractPropertyValue(claims, property);
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'text' in value) {
    return String((value as { text: string }).text);
  }
  return null;
}

/**
 * Extract date value (P571)
 * Wikidata dates can be incomplete (year only: "1496-00-00")
 * We only return complete dates (with valid month and day)
 */
function extractDate(claims: WikidataEntity['claims'], property: string): string | null {
  const value = extractPropertyValue(claims, property) as { time?: string } | null;
  if (!value || !value.time) {
    return null;
  }
  // Wikidata dates are in format: +2024-01-01T00:00:00Z or +1496-00-00T00:00:00Z (incomplete)
  const match = value.time.match(/\+(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }
  
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  
  // Validate: month and day must be > 0 (not 00)
  // Also validate reasonable ranges
  if (month === 0 || day === 0 || month > 12 || day > 31) {
    return null; // Incomplete date, skip it
  }
  
  // Validate year range
  if (year < 1000 || year > 2100) {
    return null;
  }
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Extract image URL (P18, P94, P41)
 */
function extractImageUrl(claims: WikidataEntity['claims'], property: string): string | null {
  const value = extractString(claims, property);
  if (!value) {
    return null;
  }
  // Convert filename to Commons URL
  // Format: "File:Example.jpg" -> "https://commons.wikimedia.org/wiki/Special:FilePath/Example.jpg"
  if (value.startsWith('File:')) {
    const filename = value.substring(5);
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
  }
  return value;
}

/**
 * Extract entity reference (for mayor - P6)
 */
function extractEntityReference(claims: WikidataEntity['claims'], property: string): string | null {
  const value = extractPropertyValue(claims, property) as { id?: string } | null;
  if (!value || !value.id) {
    return null;
  }
  return value.id; // Returns Q-id, will need to fetch name separately
}

/**
 * Transform Wikidata entity to Silver record
 */
export async function transformWikidataToSilver(
  ineCode: string,
  entity: WikidataEntity
): Promise<SilverWikimediaRecord> {
  const claims = entity.claims || {};
  
  // Log all available properties for debugging
  const allProperties = Object.keys(claims || {});
  console.log(`  All available properties for ${ineCode}: ${allProperties.join(', ')}`);
  
  // Log all property values for debugging (first 10 properties)
  if (allProperties.length > 0) {
    console.log(`  Total properties found: ${allProperties.length}`);
    // Show first few properties with their values for debugging
    for (const prop of allProperties.slice(0, 5)) {
      const claim = claims[prop]?.[0];
      if (claim?.mainsnak?.datavalue) {
        const value = claim.mainsnak.datavalue.value;
        let displayValue = '';
        if (typeof value === 'string') {
          displayValue = value.substring(0, 50);
        } else if (value && typeof value === 'object') {
          if ('amount' in value) {
            displayValue = `amount: ${value.amount}`;
          } else if ('id' in value) {
            displayValue = `entity: ${value.id}`;
          } else if ('latitude' in value && 'longitude' in value) {
            displayValue = `coords: ${value.latitude}, ${value.longitude}`;
          } else {
            displayValue = JSON.stringify(value).substring(0, 50);
          }
        } else {
          displayValue = String(value).substring(0, 50);
        }
        console.log(`    ${prop}: ${displayValue}`);
      }
    }
  }

  // Extract coordinates
  const coords = extractCoordinates(claims);
  
  // Extract surface area (P2046)
  // Wikidata may store area in m² or km² depending on the unit
  // We need to check the unit to convert correctly
  const surfaceAreaValue = extractQuantity(claims, 'P2046');
  let surfaceAreaKm2: number | undefined;
  
  if (surfaceAreaValue !== null && surfaceAreaValue > 0) {
    // Check the unit from the raw claim
    const rawClaim = claims?.['P2046']?.[0];
    const value = rawClaim?.mainsnak?.datavalue?.value;
    const unit = (value && typeof value === 'object' && 'unit' in value) ? (value as { unit?: string }).unit : undefined;
    
    // Q25343 = square metre (m²), Q712226 = square kilometre (km²)
    // If unit is m² (Q25343) or undefined (assume m²), convert to km²
    // If unit is km² (Q712226), use directly
    if (unit && unit.includes('Q712226')) {
      // Already in km²
      surfaceAreaKm2 = surfaceAreaValue;
      console.log(`  Surface area for ${ineCode}: ${surfaceAreaValue} km² (already in km²)`);
    } else {
      // Assume m², convert to km²
      // But check if value is suspiciously small (likely already in km²)
      if (surfaceAreaValue < 1000) {
        // Value is less than 1000, likely already in km²
        surfaceAreaKm2 = surfaceAreaValue;
        console.log(`  Surface area for ${ineCode}: ${surfaceAreaValue} km² (assumed km², value < 1000)`);
      } else {
        // Value is >= 1000, likely in m², convert
        surfaceAreaKm2 = surfaceAreaValue / 1000000;
        console.log(`  Surface area for ${ineCode}: ${surfaceAreaValue} m² = ${surfaceAreaKm2} km²`);
      }
    }
    
    // Round to 2 decimal places
    if (surfaceAreaKm2) {
      surfaceAreaKm2 = Math.round(surfaceAreaKm2 * 100) / 100;
    }
  } else {
    surfaceAreaKm2 = undefined;
    if (claims && claims['P2046']) {
      console.log(`  Surface area for ${ineCode}: P2046 found but value is null or 0. Raw value:`, JSON.stringify(claims['P2046'][0]?.mainsnak?.datavalue));
    } else {
      console.log(`  Surface area for ${ineCode}: P2046 property not found`);
    }
  }

  // Extract altitude (P2044)
  const altitude = extractQuantity(claims, 'P2044');

  // Extract postal code (P281)
  // Wikidata may return ranges (e.g., "38000-38099") or multiple codes
  // We'll store the full value (up to 50 chars) as it may be useful
  const postalCodeRaw = extractString(claims, 'P281');
  const postalCode = postalCodeRaw ? postalCodeRaw.substring(0, 50) : undefined;

  // Extract mayor (P6) - get Q-id, then fetch name
  const mayorQid = extractEntityReference(claims, 'P6');
  let mayorName: string | undefined;
  if (mayorQid) {
    try {
      // Fetch mayor entity with labels included
      const mayorEntity = await fetchWikidataEntity(mayorQid, true);
      if (mayorEntity && mayorEntity.labels) {
        // Get labels from the entity (prefer Spanish, fallback to English)
        mayorName = mayorEntity.labels.es?.value || mayorEntity.labels.en?.value || undefined;
        if (mayorName) {
          console.log(`  Mayor for ${ineCode}: ${mayorName}`);
        } else {
          console.log(`  Mayor for ${ineCode}: Q-id found (${mayorQid}) but no label available`);
        }
      } else {
        console.log(`  Mayor for ${ineCode}: Q-id found (${mayorQid}) but entity fetch failed`);
      }
    } catch (error) {
      console.warn(`  Mayor for ${ineCode}: Error fetching mayor entity ${mayorQid}:`, error);
    }
  } else {
    console.log(`  Mayor for ${ineCode}: P6 property not found`);
  }

  // Extract official website (P856)
  const officialWebsite = extractString(claims, 'P856');

  // Extract foundation date (P571)
  const foundationDate = extractDate(claims, 'P571');

  // Extract email (P968)
  // Also try P968 (email) or check if it's in the official website entity
  let email = extractString(claims, 'P968');
  if (!email) {
    // Try alternative properties or check website entity
    email = extractString(claims, 'P2378'); // email address (alternative)
  }
  if (email) {
    console.log(`  Email for ${ineCode}: ${email}`);
  } else {
    // Log available properties for debugging
    const availableProps = Object.keys(claims || {}).filter(p => p.startsWith('P'));
    console.log(`  Email for ${ineCode}: P968/P2378 not found. Available properties: ${availableProps.slice(0, 20).join(', ')}`);
  }

  // Extract phone number (P1329)
  // Also try P1329 (phone number) or P4733 (mobile phone)
  let phoneNumber = extractString(claims, 'P1329');
  if (!phoneNumber) {
    phoneNumber = extractString(claims, 'P4733'); // mobile phone
  }
  if (phoneNumber) {
    console.log(`  Phone for ${ineCode}: ${phoneNumber}`);
  } else {
    console.log(`  Phone for ${ineCode}: P1329/P4733 properties not found`);
  }

  // Extract CIF (Código de Identificación Fiscal)
  // Try multiple properties: P3608 (tax ID), P2139 (ISNI), P2137 (ORCID), P1146 (LEI)
  let cif = extractString(claims, 'P3608') || 
            extractString(claims, 'P2139') || 
            extractString(claims, 'P2137') ||
            extractString(claims, 'P1146');
  if (cif) {
    console.log(`  CIF for ${ineCode}: ${cif}`);
  } else {
    console.log(`  CIF for ${ineCode}: P3608/P2139/P2137/P1146 properties not found`);
  }

  // Extract town hall address (P159 - headquarters)
  // P159 is a reference to another entity (the town hall building)
  // We'll try to extract the address from that entity
  let townHallAddress: string | undefined;
  const headquartersQid = extractEntityReference(claims, 'P159');
  if (headquartersQid) {
    try {
      console.log(`  Town hall for ${ineCode}: Fetching headquarters entity ${headquartersQid}`);
      const headquartersEntity = await fetchWikidataEntity(headquartersQid);
      if (headquartersEntity) {
        // Try multiple address properties: P6375 (location), P969 (street address), P669 (located on street)
        const address = extractString(headquartersEntity.claims, 'P6375') || 
                       extractString(headquartersEntity.claims, 'P969') ||
                       extractString(headquartersEntity.claims, 'P669');
        if (address) {
          townHallAddress = address;
          console.log(`  Town hall address for ${ineCode}: ${address}`);
        } else {
          // Try to get address from labels or sitelinks
          if (headquartersEntity.labels?.es?.value) {
            townHallAddress = headquartersEntity.labels.es.value;
            console.log(`  Town hall address for ${ineCode}: ${townHallAddress} (from label)`);
          } else {
            console.log(`  Town hall for ${ineCode}: Entity found but no address (P6375/P969/P669) available`);
          }
        }
      } else {
        console.log(`  Town hall for ${ineCode}: Entity ${headquartersQid} not found`);
      }
    } catch (error) {
      console.warn(`  Town hall for ${ineCode}: Failed to fetch headquarters entity ${headquartersQid}:`, error);
    }
  } else {
    // Try direct address properties on the municipality entity
    townHallAddress = extractString(claims, 'P6375') || 
                     extractString(claims, 'P969') ||
                     extractString(claims, 'P669') || undefined;
    if (townHallAddress) {
      console.log(`  Town hall address for ${ineCode}: ${townHallAddress} (direct property)`);
    } else {
      console.log(`  Town hall for ${ineCode}: P159/P6375/P969/P669 properties not found`);
    }
  }

  // Extract images
  const imageUrl = extractImageUrl(claims, 'P18');
  const coatOfArmsUrl = extractImageUrl(claims, 'P94');
  const flagUrl = extractImageUrl(claims, 'P41');

  return {
    ine_code: ineCode,
    coordinates_lat: coords?.lat,
    coordinates_lon: coords?.lon,
    surface_area_km2: surfaceAreaKm2 || undefined,
    altitude_m: altitude ? Math.round(altitude) : undefined,
    postal_code: postalCode || undefined,
    mayor_name: mayorName,
    official_website: officialWebsite || undefined,
    foundation_date: foundationDate || undefined,
    town_hall_address: townHallAddress || undefined,
    email: email || undefined,
    phone_number: phoneNumber || undefined,
    cif: cif || undefined,
    image_url: imageUrl || undefined,
    coat_of_arms_url: coatOfArmsUrl || undefined,
    flag_url: flagUrl || undefined,
  };
}
