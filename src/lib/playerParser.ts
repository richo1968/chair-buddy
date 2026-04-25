export interface ParsedPlayerRow {
  number: string;
  name?: string;
  /** Index of the source line (0-based) for diagnostics. */
  sourceLine: number;
  /** Original text from that line (for displaying errors). */
  raw: string;
}

export interface ParseError {
  sourceLine: number;
  raw: string;
  reason: string;
}

export interface ParsedRoster {
  rows: ParsedPlayerRow[];
  errors: ParseError[];
}

/**
 * Parse a freeform roster paste into player rows. Accepts:
 *   • comma-separated:  3,Lilli Heijkoop
 *   • tab-separated:     3<TAB>Lilli Heijkoop
 *   • whitespace-only:   3 Lilli Heijkoop
 *   • number-only:       7
 * Empty lines are skipped silently. Names containing commas survive because
 * we split on the FIRST separator only (e.g. "7,Smith, John" → name "Smith, John").
 */
export function parseRoster(input: string): ParsedRoster {
  const rows: ParsedPlayerRow[] = [];
  const errors: ParseError[] = [];

  const lines = input.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    let number: string;
    let rest: string;

    const firstComma = trimmed.indexOf(',');
    const firstTab = trimmed.indexOf('\t');
    const firstWs = trimmed.search(/\s/);

    let splitAt = -1;
    if (firstComma >= 0) splitAt = firstComma;
    else if (firstTab >= 0) splitAt = firstTab;
    else if (firstWs >= 0) splitAt = firstWs;

    if (splitAt >= 0) {
      number = trimmed.slice(0, splitAt).trim();
      rest = trimmed.slice(splitAt + 1).trim();
    } else {
      number = trimmed;
      rest = '';
    }

    if (!number) {
      errors.push({
        sourceLine: idx,
        raw,
        reason: 'Missing jersey number'
      });
      return;
    }

    rows.push({
      number,
      name: rest.length > 0 ? rest : undefined,
      sourceLine: idx,
      raw
    });
  });

  return { rows, errors };
}

export type RowStatus = 'ok' | 'duplicate-existing' | 'duplicate-paste';

export interface ClassifiedRow extends ParsedPlayerRow {
  status: RowStatus;
}

/** Classify each parsed row: ok, duplicate of existing player, or duplicate within the paste. */
export function classifyRows(
  rows: readonly ParsedPlayerRow[],
  existingNumbers: ReadonlySet<string>
): ClassifiedRow[] {
  const seenInPaste = new Set<string>();
  return rows.map(row => {
    const key = row.number.trim();
    let status: RowStatus = 'ok';
    if (existingNumbers.has(key)) status = 'duplicate-existing';
    else if (seenInPaste.has(key)) status = 'duplicate-paste';
    seenInPaste.add(key);
    return { ...row, status };
  });
}
