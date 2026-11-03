import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** True when running inside the iPad app (Capacitor), false in the browser/PWA. */
export const isNative = Capacitor.isNativePlatform();

/** Voice entry and team-sheet scanning use Apple frameworks — iPad app only for now. */
export const isIOS = Capacitor.getPlatform() === 'ios';

interface PrinterPlugin {
  print(options?: { jobName?: string }): Promise<{ completed: boolean }>;
}

// Implemented in ios/App/App/ChairBuddyViewController.swift.
const Printer = registerPlugin<PrinterPlugin>('Printer');

/** window.print() is a no-op in WKWebView — route through the native print sheet. */
export async function printPage(jobName?: string): Promise<void> {
  if (!isNative) {
    window.print();
    return;
  }
  // The print: Tailwind variants key off @media print, which the native
  // formatter applies, so GamePrintView renders the same as in Safari.
  await Printer.print({ jobName });
}

/** <a download> doesn't work in WKWebView — write to cache and open the share sheet. */
export async function shareTextFile(filename: string, content: string): Promise<void> {
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  });
  await Share.share({ title: filename, files: [uri] });
}

interface RosterScanPlugin {
  scan(options: { source: 'camera' | 'library' }): Promise<{ cancelled: boolean; lines: string[] }>;
}

// Implemented in ios/App/App/ChairBuddyViewController.swift (Apple Vision text recognition).
const RosterScan = registerPlugin<RosterScanPlugin>('RosterScan');

/**
 * Turns text read off a team sheet into "number, name" lines for the roster
 * parser. Keeps rows with a 1–2 digit jersey number (or 00) at either end;
 * skips headers, dates and anything else.
 */
export function rosterLinesFromScan(lines: string[]): string {
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/[|_•·]/g, ' ').replace(/\s+/g, ' ').trim();
    const lead = /^#?\s*(00|\d{1,2})\b[\s.,:)-]*(.*)$/.exec(line);
    const trail = lead ? null : /^(.*?)[\s,]+#?(00|\d{1,2})$/.exec(line);
    if (!lead && !trail) continue;
    const number = lead ? lead[1] : trail![2];
    const rest = lead ? lead[2] : trail![1];
    const name = (rest ?? '')
      .replace(/\b\d+\b/g, ' ')
      .replace(/[^A-Za-z' .-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    out.push(name ? `${number}, ${titleCase(name)}` : number);
  }
  return out.join('\n');
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

export async function scanTeamSheet(source: 'camera' | 'library'): Promise<string | null> {
  const res = await RosterScan.scan({ source });
  if (res.cancelled) return null;
  return rosterLinesFromScan(res.lines);
}
