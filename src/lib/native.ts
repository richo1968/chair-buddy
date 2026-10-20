import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** True when running inside the iPad app (Capacitor), false in the browser/PWA. */
export const isNative = Capacitor.isNativePlatform();

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
