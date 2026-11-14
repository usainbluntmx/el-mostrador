/**
 * Verifica que la API key de pey sirva, sin imprimirla.
 * Llama a un endpoint autenticado y reporta status + forma de la respuesta.
 */
import fs from 'node:fs';
import path from 'node:path';

const env = fs
  .readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
  .split('\n')
  .reduce((acc, linea) => {
    const m = linea.match(/^([A-Z_]+)=(.*)$/);
    if (m) acc[m[1]] = m[2].trim();
    return acc;
  }, {});

const base = (env.PEY_BASE_URL || 'https://api.pey.mx').replace(/\/$/, '');
if (!env.PEY_API_KEY) {
  console.log('SIN_API_KEY');
  process.exit(1);
}

const res = await fetch(`${base}/transaction/api-key?limit=1`, {
  headers: { Authorization: `Bearer ${env.PEY_API_KEY}` },
});

console.log('base:', base);
console.log('status:', res.status);

const texto = await res.text();
let data;
try {
  data = JSON.parse(texto);
} catch {
  data = null;
}

if (Array.isArray(data)) {
  console.log('respuesta: arreglo de', data.length, 'transacciones');
  if (data[0]) console.log('forma de una transacción:', Object.keys(data[0]).join(', '));
} else if (data && typeof data === 'object') {
  console.log('llaves de la respuesta:', Object.keys(data).join(', '));
  const muestra = data.transactions ?? data.data ?? data.items;
  if (Array.isArray(muestra)) console.log('transacciones:', muestra.length);
} else {
  console.log('cuerpo crudo (200 chars):', texto.slice(0, 200));
}

if (res.status === 401 || res.status === 403) {
  console.log('=> La key NO fue aceptada.');
  process.exit(2);
}
