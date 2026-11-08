// Gera ícones e a imagem de compartilhamento a partir do desenho do logo. Uso: npm run icons
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const desenho = `
  <path d="M0 44 Q14 34 28 40 T64 37 V64 H0Z" fill="#f4b41a"/>
  <path d="M0 50 Q10 46 20 50 T40 50 T64 49 V64 H0Z" fill="#1786c5"/>
  <path d="M0 56 Q10 52 20 56 T40 56 T64 55 V64 H0Z" fill="#fff" opacity=".35"/>`;
const pino = `<path d="M32 45 C27 37 19.5 31.5 19.5 22.5 A12.5 12.5 0 0 1 44.5 22.5 C44.5 31.5 37 37 32 45Z" fill="#fff"/><circle cx="32" cy="22.5" r="5" fill="#0e6b5a"/>`;

const redondo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="c"><circle cx="32" cy="32" r="30"/></clipPath></defs><circle cx="32" cy="32" r="30" fill="#0e6b5a"/><g clip-path="url(#c)">${desenho}</g>${pino}</svg>`;
const quadrado = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0e6b5a"/>${desenho}${pino}</svg>`;
// Versão com margem de segurança para ícones que o Android recorta.
const mascaravel = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0e6b5a"/>${desenho}<g transform="translate(9.6 9.6) scale(.7)">${pino}</g></svg>`;

writeFileSync(join(PUB, 'icone.svg'), redondo);
const png = (svg, n, nome) => sharp(Buffer.from(svg), { density: 600 }).resize(n, n).png().toFile(join(PUB, nome));
await png(quadrado, 180, 'icone-180.png');
await png(quadrado, 192, 'icone-192.png');
await png(quadrado, 512, 'icone-512.png');
await png(mascaravel, 512, 'icone-maskable-512.png');

const cartao = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0e6b5a"/>
  <path d="M0 470 Q300 380 620 450 T1200 410 V630 H0Z" fill="#f4b41a"/>
  <path d="M0 530 Q200 490 420 530 T860 530 T1200 520 V630 H0Z" fill="#1786c5"/>
  <g transform="translate(90 90) scale(4.6)"><circle cx="32" cy="32" r="30" fill="#fff" opacity=".12"/>${pino}</g>
  <text x="430" y="210" font-family="Arial, sans-serif" font-size="92" font-weight="800" fill="#fff">Melhora</text>
  <text x="430" y="310" font-family="Arial, sans-serif" font-size="92" font-weight="800" fill="#f4b41a">Extremoz</text>
  <text x="430" y="372" font-family="Arial, sans-serif" font-size="32" fill="#fff">Marque no mapa, junte a vizinhança, cobre a solução.</text>
</svg>`;
await sharp(Buffer.from(cartao)).png().toFile(join(PUB, 'compartilhar.png'));
console.log('Ícones gerados em public/.');
