/**
 * CSV parser for nationality distribution file (semicolon-delimited, multi-year format)
 * Each row contains data for multiple years (2000-2025)
 * Note: Header may have incorrect labels, but data follows: Total, Españoles, Extranjeros
 */

import { createReadStream } from 'fs';
import { RawNationalityCsvRow } from './types';

/**
 * Parse a CSV line (semicolon-delimited)
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());

  return fields;
}

/**
 * Extract years from header line
 * Format: ;;;;Año 2025;;;Año 2024;;;...
 */
function extractYears(headerLine: string): number[] {
  const years: number[] = [];
  const fields = parseCsvLine(headerLine);
  
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i].trim();
    // Match "Año" or "Ao" (with encoding issues) followed by 4 digits
    const match = field.match(/A[ño]\s+(\d{4})/i);
    if (match) {
      const year = parseInt(match[1], 10);
      if (year >= 2000 && year <= 2100) {
        years.push(year);
      }
    }
  }
  
  // If no years found, assume years from 2025 down to 2000 (26 years)
  if (years.length === 0) {
    for (let year = 2025; year >= 2000; year--) {
      years.push(year);
    }
  }
  
  return years.sort((a, b) => b - a); // Descending order (2025, 2024, ...)
}

/**
 * Parse CSV file stream and yield nationality rows (one per unit x year)
 */
export async function* parseNationalityCsvStream(
  filePath: string
): AsyncGenerator<{ row: RawNationalityCsvRow; year: number }, void, unknown> {
  const fs = await import('fs/promises');
  
  try {
    await fs.access(filePath);
    console.log(`Nationality CSV file found: ${filePath}`);
  } catch (error) {
    console.error(`Nationality CSV file not found: ${filePath}`);
    throw new Error(`Nationality CSV file not found: ${filePath}`);
  }
  
  console.log('Nationality file opened, starting to read...');

  // Use createReadStream with latin1 encoding
  const stream = createReadStream(filePath, { encoding: 'latin1' });
  let buffer = '';
  let lineNumber = 0;
  let headerLine1: string | null = null;
  let headerLine2: string | null = null;
  let years: number[] = [];
  let rowsYielded = 0;

  // Queue for async generator
  const queue: Array<{ row: RawNationalityCsvRow; year: number }> = [];
  let streamEnded = false;
  let streamError: Error | null = null;
  let resolveWait: (() => void) | null = null;

  const processChunk = (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const line of lines) {
      lineNumber++;
      const trimmed = line.trim();

      if (!trimmed) continue;

      // Line 1: Extract years
      if (lineNumber === 1) {
        headerLine1 = trimmed;
        years = extractYears(trimmed);
        console.log(`Found ${years.length} years: ${years.slice(0, 5).join(', ')}...`);
        continue;
      }

      // Line 2: Column headers (skip)
      if (lineNumber === 2) {
        headerLine2 = trimmed;
        continue;
      }

      // Data rows
      const fields = parseCsvLine(trimmed);

      if (fields.length < 5) continue;

      // Expected structure:
      // [0] Provincia
      // [1] Municipio
      // [2] Código Unidad Poblacional
      // [3] Unidad Poblacional
      // [4] Tipo
      // [5-7] Año 2025 (Total, Españoles, Extranjeros)
      // [8-10] Año 2024 (Total, Españoles, Extranjeros)
      // ...
      // Note: Header may have incorrect labels, but data follows this pattern

      const tipo = fields[4]?.trim().toUpperCase();
      if (!tipo || !['M', 'ES', 'NUC', 'DIS'].includes(tipo)) {
        continue;
      }

      // Base row data
      const baseRow: RawNationalityCsvRow = {
        Provincia: fields[0]?.trim() || '',
        Municipio: fields[1]?.trim() || '',
        'Código Unidad Poblacional': fields[2]?.trim() || '',
        'Unidad Poblacional': fields[3]?.trim() || '',
        Tipo: tipo as 'M' | 'ES' | 'NUC' | 'DIS',
        yearData: new Map(),
      };

      // Extract data for each year
      // Start at index 5 (after Tipo)
      // Each year has 3 columns: Total, Españoles, Extranjeros
      let dataIndex = 5;
      for (const year of years) {
        if (dataIndex + 2 >= fields.length) break;

        const total = fields[dataIndex]?.trim() || '0';
        const espanoles = fields[dataIndex + 1]?.trim() || '0';
        const extranjeros = fields[dataIndex + 2]?.trim() || '0';

        // Skip if all values are empty, invalid, or ".." (not available)
        if (
          (total === '0' || total === '..' || total === '') &&
          (espanoles === '0' || espanoles === '..' || espanoles === '') &&
          (extranjeros === '0' || extranjeros === '..' || extranjeros === '')
        ) {
          dataIndex += 3;
          continue;
        }

        // CRITICAL: Skip if Total has value but Españoles or Extranjeros are ".."
        // This violates the constraint: population_spanish + population_foreign = population_total
        if (
          (total !== '0' && total !== '..' && total !== '') &&
          (espanoles === '..' || extranjeros === '..')
        ) {
          dataIndex += 3;
          continue;
        }

        baseRow.yearData.set(year, {
          Total: total === '..' ? '0' : total,
          Españoles: espanoles === '..' ? '0' : espanoles,
          Extranjeros: extranjeros === '..' ? '0' : extranjeros,
        });

        // Yield one record per year
        rowsYielded++;
        if (rowsYielded <= 10) {
          console.log(`Nationality row ${rowsYielded}: Tipo=${tipo}, Year=${year}, Provincia=${fields[0]?.substring(0, 20)}`);
        }

        queue.push({
          row: {
            ...baseRow,
            yearData: new Map([[year, {
              Total: total === '..' ? '0' : total,
              Españoles: espanoles === '..' ? '0' : espanoles,
              Extranjeros: extranjeros === '..' ? '0' : extranjeros,
            }]]),
          },
          year,
        });

        dataIndex += 3;
      }

      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    }
  };

  stream.on('data', processChunk);

  stream.on('end', () => {
    streamEnded = true;
    console.log(`Nationality CSV parsing complete. Years found: ${years.length}, Rows yielded: ${rowsYielded}`);
    if (resolveWait) {
      resolveWait();
      resolveWait = null;
    }
  });

  stream.on('error', (error) => {
    streamError = error;
    if (resolveWait) {
      resolveWait();
      resolveWait = null;
    }
  });

  // Async generator implementation
  while (true) {
    if (streamError) {
      throw streamError;
    }

    if (queue.length > 0) {
      yield queue.shift()!;
    } else if (streamEnded) {
      break;
    } else {
      // Wait for next chunk
      await new Promise<void>((resolve) => {
        resolveWait = resolve;
      });
    }
  }
}
