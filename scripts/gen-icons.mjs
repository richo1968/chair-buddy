import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

const svgString = (await readFile(join(publicDir, 'icon.svg'))).toString('utf-8');

function renderPng(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: '#0f172a'
  });
  return resvg.render().asPng();
}

async function write(name, buffer) {
  await writeFile(join(publicDir, name), buffer);
  console.log(`wrote ${name}`);
}

// Standard PWA icons
await write('icon-192.png', renderPng(svgString, 192));
await write('icon-512.png', renderPng(svgString, 512));

// Apple touch icon (iOS home screen)
await write('apple-touch-icon.png', renderPng(svgString, 180));

// Favicon
await write('favicon-32.png', renderPng(svgString, 32));

// Maskable icon: wrap in 20% padding so the icon survives Android circular masks
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
  <rect width="640" height="640" fill="#0f172a"/>
  <g transform="translate(64 64)">
    ${svgString.replace(/<\?xml[^>]*\?>/, '').replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}
  </g>
</svg>`;
await write('icon-512-maskable.png', renderPng(maskableSvg, 512));

console.log('done');
