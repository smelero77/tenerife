/**
 * CSV parser for semicolon-delimited INE Nomenclátor file
 */

import { createReadStream } from 'fs';
import { RawCsvRow } from './types';

/**
 * Parse a CSV line (semicolon-delimited)
 * Handles quoted fields and empty values
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
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      // Field separator
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  // Push last field
  fields.push(current.trim());

  return fields;
}

/**
 * Parse CSV file stream and yield rows
 * Skips header rows and empty lines
 */
export async function* parseCsvStream(
  filePath: string
): AsyncGenerator<RawCsvRow, void, unknown> {
  const fs = await import('fs/promises');
  
  // Check if file exists
  try {
    await fs.access(filePath);
    console.log(`CSV file found: ${filePath}`);
  } catch (error) {
    console.error(`CSV file not found: ${filePath}`);
    throw new Error(`CSV file not found: ${filePath}`);
  }
  
  console.log('File opened, starting to read...');

  // Use createReadStream with latin1 encoding for Spanish characters
  const stream = createReadStream(filePath, { encoding: 'latin1' });
  let buffer = '';
  let lineNumber = 0;
  let headerFound = false;
  let rowsYielded = 0;

  // Queue for async generator
  const queue: RawCsvRow[] = [];
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

      if (!headerFound) {
        if (trimmed.includes('Provincia') && trimmed.includes('Municipio')) {
          headerFound = true;
          console.log(`Header found at line ${lineNumber}: ${trimmed.substring(0, 100)}`);
        }
        continue;
      }

      const fields = parseCsvLine(trimmed);

      if (fields.length < 8) continue;

      let tipoIndex = 4;
      let totalIndex = 5;
      let hombresIndex = 6;
      let mujeresIndex = 7;
      
      const tipoAt4 = fields[4]?.trim().toUpperCase();
      const tipoAt5 = fields[5]?.trim().toUpperCase();
      
      if (['M', 'ES', 'NUC', 'DIS'].includes(tipoAt4)) {
        tipoIndex = 4;
        totalIndex = 5;
        hombresIndex = 6;
        mujeresIndex = 7;
      } else if (['M', 'ES', 'NUC', 'DIS'].includes(tipoAt5)) {
        tipoIndex = 5;
        totalIndex = 6;
        hombresIndex = 7;
        mujeresIndex = 8;
      } else {
        continue;
      }

      const tipo = fields[tipoIndex]?.trim().toUpperCase();
      if (!['M', 'ES', 'NUC', 'DIS'].includes(tipo)) {
        continue;
      }

      rowsYielded++;
      if (rowsYielded <= 5) {
        console.log(`Row ${rowsYielded}: Tipo=${tipo}, Provincia=${fields[0]?.substring(0, 20)}, Municipio=${fields[1]?.substring(0, 20)}`);
      }

      const row: RawCsvRow = {
        Provincia: fields[0]?.trim() || '',
        Municipio: fields[1]?.trim() || '',
        'Código Unidad Poblacional': fields[2]?.trim() || '',
        'Unidad Poblacional': fields[3]?.trim() || '',
        Tipo: tipo as 'M' | 'ES' | 'NUC' | 'DIS',
        Total: fields[totalIndex]?.trim() || '0',
        Hombres: fields[hombresIndex]?.trim() || '0',
        Mujeres: fields[mujeresIndex]?.trim() || '0',
      };

      queue.push(row);
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    }
  };

  stream.on('data', processChunk);

  stream.on('end', () => {
    // Process remaining buffer
    if (buffer.trim()) {
      const fields = parseCsvLine(buffer.trim());
      if (fields.length >= 8) {
        const tipoAt4 = fields[4]?.trim().toUpperCase();
        const tipoAt5 = fields[5]?.trim().toUpperCase();
        
        let tipoIndex = 4;
        let totalIndex = 5;
        let hombresIndex = 6;
        let mujeresIndex = 7;
        
        if (['M', 'ES', 'NUC', 'DIS'].includes(tipoAt4)) {
          tipoIndex = 4;
          totalIndex = 5;
          hombresIndex = 6;
          mujeresIndex = 7;
        } else if (['M', 'ES', 'NUC', 'DIS'].includes(tipoAt5)) {
          tipoIndex = 5;
          totalIndex = 6;
          hombresIndex = 7;
          mujeresIndex = 8;
        }
        
        const tipo = fields[tipoIndex]?.trim().toUpperCase();
        if (['M', 'ES', 'NUC', 'DIS'].includes(tipo)) {
          queue.push({
            Provincia: fields[0]?.trim() || '',
            Municipio: fields[1]?.trim() || '',
            'Código Unidad Poblacional': fields[2]?.trim() || '',
            'Unidad Poblacional': fields[3]?.trim() || '',
            Tipo: tipo as 'M' | 'ES' | 'NUC' | 'DIS',
            Total: fields[totalIndex]?.trim() || '0',
            Hombres: fields[hombresIndex]?.trim() || '0',
            Mujeres: fields[mujeresIndex]?.trim() || '0',
          });
        }
      }
    }
    streamEnded = true;
    console.log(`CSV parsing complete. Header found: ${headerFound}, Rows yielded: ${rowsYielded}`);
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
