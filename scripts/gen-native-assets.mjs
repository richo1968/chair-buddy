// Renders public/icon.svg into the iOS and Android launcher icons and splash
// screens, replacing Capacitor's placeholder artwork. Re-run after changing the icon:
//   node scripts/gen-native-assets.mjs
import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG = '#0b0f14';
const svg = (await readFile(join(root, 'public/icon.svg'))).toString('utf-8');
const inner = svg
  .replace(/<\?xml[^>]*\?>/, '')
  .replace(/^\s*<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '');

/** The 512-unit icon centred on a w×h canvas at `scale` of the shorter side. */
function composed(w, h, scale, background = BG) {
  const size = Math.min(w, h) * scale;
  const k = size / 512;
  const bg = background ? `<rect width="${w}" height="${h}" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    ${bg}<g transform="translate(${(w - size) / 2} ${(h - size) / 2}) scale(${k})">${inner}</g></svg>`;
}

const png = (s, w) => new Resvg(s, { fitTo: { mode: 'width', value: w } }).render().asPng();

async function write(rel, buf, opaque = false) {
  const path = join(root, rel);
  await writeFile(path, buf);
  if (opaque) {
    // App Store rejects icons with an alpha channel — round-trip via JPEG to drop it.
    const tmp = path + '.jpg';
    execFileSync('sips', ['-s', 'format', 'jpeg', path, '--out', tmp], { stdio: 'ignore' });
    execFileSync('sips', ['-s', 'format', 'png', tmp, '--out', path], { stdio: 'ignore' });
    execFileSync('rm', [tmp]);
  }
  console.log('wrote', rel);
}

// iOS app icon (single 1024 universal) + splash (2732 square, used for all sizes)
await write('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', png(composed(1024, 1024, 1), 1024), true);
for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  await write(`ios/App/App/Assets.xcassets/Splash.imageset/${f}`, png(composed(2732, 2732, 0.18), 2732));
}

// Android launcher icons
const res = 'android/app/src/main/res';
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, m] of Object.entries(densities)) {
  await write(`${res}/mipmap-${d}/ic_launcher.png`, png(composed(48, 48, 1), 48 * m));
  await write(`${res}/mipmap-${d}/ic_launcher_round.png`, png(composed(48, 48, 1), 48 * m));
  // Adaptive foreground: 108dp canvas, artwork inside the 66dp safe zone.
  await write(`${res}/mipmap-${d}/ic_launcher_foreground.png`, png(composed(108, 108, 66 / 108, null), 108 * m));
}
await writeFile(
  join(root, res, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`
);

// Android splash images — match each existing file's dimensions.
for (const dir of (await readdir(join(root, res))).filter(d => d.startsWith('drawable'))) {
  const rel = `${res}/${dir}/splash.png`;
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', join(root, rel)]).toString();
    const w = Number(/pixelWidth: (\d+)/.exec(out)[1]);
    const h = Number(/pixelHeight: (\d+)/.exec(out)[1]);
    await write(rel, png(composed(w, h, 0.3), w));
  } catch {
    // no splash.png in this drawable folder
  }
}
