export interface CsvRow {
  [column: string]: string;
}

/**
 * Minimal RFC-4180-ish CSV parser. Handles quoted fields, embedded commas,
 * line breaks and doubled quotes. Returns an array of row objects keyed by
 * the header row, trimmed of surrounding whitespace.
 */
export function parseCsv(csv: string): CsvRow[] {
  const lines = splitLines(csv);
  if (lines.length === 0) return [];

  const header = parseLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) continue;
    const values = parseLine(line);
    const row: CsvRow = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = values[j] ?? '';
    }
    rows.push(row);
  }

  return rows;
}

function splitLines(csv: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      current += ch;
      if (ch === '"') {
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          current += csv[++i];
        } else {
          inQuotes = false;
        }
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      current += ch;
    } else if (ch === '\r') {
      // skip carriage return; handle \r\n and lone \r
      if (i + 1 < csv.length && csv[i + 1] === '\n') {
        i++;
      }
      lines.push(current);
      current = '';
    } else if (ch === '\n') {
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.length > 0 || lines.length === 0) {
    lines.push(current);
  }

  return lines;
}

function parseLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      current += ch;
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += line[++i];
        } else {
          inQuotes = false;
        }
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      current += ch;
    } else if (ch === ',') {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  values.push(current);

  // Strip surrounding quotes from each value and unescape doubled quotes
  return values.map((value) => {
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1).replace(/""/g, '"');
    }
    return value;
  });
}
