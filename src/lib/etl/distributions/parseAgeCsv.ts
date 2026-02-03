/**
 * CSV parser for age distribution file (semicolon-delimited, multi-year format)
 * Each row contains data for multiple years (2000-2025)
 * Age ranges vary by year (e.g., 2025: "Entre 0 y 15", 2024: "Entre 0 y 14")
 */

import { createReadStream } from 'fs';
import { RawAgeCsvRow } from './types';

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
 * Format: ;;;;Año 2025;;;;Año 2024;;;;...
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
 * Parse CSV file stream and yield age rows (one per unit x year)
 */
export async function* parseAgeCsvStream(
  filePath: string
): AsyncGenerator<{ row: RawAgeCsvRow; year: number }, void, unknown> {
  const fs = await import('fs/promises');
  
  try {
    await fs.access(filePath);
    console.log(`Age CSV file found: ${filePath}`);
  } catch (error) {
    console.error(`Age CSV file not found: ${filePath}`);
    throw new Error(`Age CSV file not found: ${filePath}`);
  }
  
  console.log('Age file opened, starting to read...');

  // Use createReadStream with latin1 encoding
  const stream = createReadStream(filePath, { encoding: 'latin1' });
  let buffer = '';
  let lineNumber = 0;
  let headerLine1: string | null = null;
  let headerLine2: string | null = null;
  let years: number[] = [];
  let rowsYielded = 0;

  // Queue for async generator
  const queue: Array<{ row: RawAgeCsvRow; year: number }> = [];
  let streamEnded = false;
  let streamError: Error | null = null;
  let resolveWait: (() => void) | null = null;

  const processChunk = (chunk: string | Buffer) => {
    buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
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
      // [5-8] Año 2025 (Total, Rango1, Rango2, Rango3)
      // [9-12] Año 2024 (Total, Rango1, Rango2, Rango3)
      // ...

      const tipo = fields[4]?.trim().toUpperCase();
      if (!tipo || !['M', 'ES', 'NUC', 'DIS'].includes(tipo)) {
        continue;
      }

      // Base row data
      const baseRow: RawAgeCsvRow = {
        Provincia: fields[0]?.trim() || '',
        Municipio: fields[1]?.trim() || '',
        'Código Unidad Poblacional': fields[2]?.trim() || '',
        'Unidad Poblacional': fields[3]?.trim() || '',
        Tipo: tipo as 'M' | 'ES' | 'NUC' | 'DIS',
        yearData: new Map(),
      };

      // Extract data for each year
      // Start at index 5 (after Tipo)
      // Each year has 4 columns: Total, Rango1, Rango2, Rango3
      let dataIndex = 5;
      for (const year of years) {
        if (dataIndex + 3 >= fields.length) break;

        const total = fields[dataIndex]?.trim() || '0';
        const rango1 = fields[dataIndex + 1]?.trim() || '0';
        const rango2 = fields[dataIndex + 2]?.trim() || '0';
        const rango3 = fields[dataIndex + 3]?.trim() || '0';

        // Skip if all values are empty, invalid, or ".." (not available)
        if (
          (total === '0' || total === '..' || total === '') &&
          (rango1 === '0' || rango1 === '..' || rango1 === '') &&
          (rango2 === '0' || rango2 === '..' || rango2 === '') &&
          (rango3 === '0' || rango3 === '..' || rango3 === '')
        ) {
          dataIndex += 4;
          continue;
        }

        baseRow.yearData.set(year, {
          Total: total === '..' ? '0' : total,
          Rango1: rango1 === '..' ? '0' : rango1,
          Rango2: rango2 === '..' ? '0' : rango2,
          Rango3: rango3 === '..' ? '0' : rango3,
        });

        // Yield one record per year
        rowsYielded++;
        if (rowsYielded <= 10) {
          console.log(`Age row ${rowsYielded}: Tipo=${tipo}, Year=${year}, Provincia=${fields[0]?.substring(0, 20)}`);
        }

        queue.push({
          row: {
            ...baseRow,
            yearData: new Map([[year, {
              Total: total === '..' ? '0' : total,
              Rango1: rango1 === '..' ? '0' : rango1,
              Rango2: rango2 === '..' ? '0' : rango2,
              Rango3: rango3 === '..' ? '0' : rango3,
            }]]),
          },
          year,
        });

        dataIndex += 4;
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
    console.log(`Age CSV parsing complete. Years found: ${years.length}, Rows yielded: ${rowsYielded}`);
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
