/**
 * CSV parser for sex distribution file (semicolon-delimited, multi-year format)
 * Each row contains data for multiple years (2000-2025)
 */

import { createReadStream } from 'fs';
import { RawSexCsvRow } from './types';

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
  // This is a fallback in case the header format is different
  if (years.length === 0) {
    for (let year = 2025; year >= 2000; year--) {
      years.push(year);
    }
  }
  
  return years.sort((a, b) => b - a); // Descending order (2025, 2024, ...)
}

/**
 * Parse CSV file stream and yield sex rows (one per unit x year)
 */
export async function* parseSexCsvStream(
  filePath: string
): AsyncGenerator<{ row: RawSexCsvRow; year: number }, void, unknown> {
  const fs = await import('fs/promises');
  
  try {
    await fs.access(filePath);
    console.log(`Sex CSV file found: ${filePath}`);
  } catch (error) {
    console.error(`Sex CSV file not found: ${filePath}`);
    throw new Error(`Sex CSV file not found: ${filePath}`);
  }
  
  console.log('Sex file opened, starting to read...');

  // Use createReadStream with latin1 encoding
  const stream = createReadStream(filePath, { encoding: 'latin1' });
  let buffer = '';
  let lineNumber = 0;
  let headerLine1: string | null = null;
  let headerLine2: string | null = null;
  let years: number[] = [];
  let rowsYielded = 0;

  // Queue for async generator
  const queue: Array<{ row: RawSexCsvRow; year: number }> = [];
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
      // [5-7] Año 2025 (Total, Hombres, Mujeres)
      // [8-10] Año 2024 (Total, Hombres, Mujeres)
      // ...

      if (fields.length < 5) continue;

      const tipo = fields[4]?.trim().toUpperCase();
      if (!tipo || !['M', 'ES', 'NUC', 'DIS'].includes(tipo)) {
        continue;
      }

      // Base row data
      const baseRow: RawSexCsvRow = {
        Provincia: fields[0]?.trim() || '',
        Municipio: fields[1]?.trim() || '',
        'Código Unidad Poblacional': fields[2]?.trim() || '',
        'Unidad Poblacional': fields[3]?.trim() || '',
        Tipo: tipo as 'M' | 'ES' | 'NUC' | 'DIS',
        yearData: new Map(),
      };

      // Extract data for each year
      // Start at index 5 (after Tipo)
      let dataIndex = 5;
      for (const year of years) {
        if (dataIndex + 2 >= fields.length) break;

        const total = fields[dataIndex]?.trim() || '0';
        const hombres = fields[dataIndex + 1]?.trim() || '0';
        const mujeres = fields[dataIndex + 2]?.trim() || '0';

        // Skip if all values are empty or invalid
        if (total === '0' && hombres === '0' && mujeres === '0') {
          dataIndex += 3;
          continue;
        }

        baseRow.yearData.set(year, {
          Total: total,
          Hombres: hombres,
          Mujeres: mujeres,
        });

        // Yield one record per year
        rowsYielded++;
        if (rowsYielded <= 10) {
          console.log(`Sex row ${rowsYielded}: Tipo=${tipo}, Year=${year}, Provincia=${fields[0]?.substring(0, 20)}`);
        }

        queue.push({
          row: {
            ...baseRow,
            yearData: new Map([[year, { Total: total, Hombres: hombres, Mujeres: mujeres }]]),
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
    console.log(`Sex CSV parsing complete. Years found: ${years.length}, Rows yielded: ${rowsYielded}`);
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
