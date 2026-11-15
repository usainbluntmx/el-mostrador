/**
 * Prueba de humo de punta a punta, sin tocar el API real de pey.
 * Levanta un pey falso en :3901, habla con la app en :3100 y verifica
 * el camino completo: cobro → webhook firmado → pagada → corte.
 *
 * Uso: node scripts/smoke.mjs
 */

import http from 'node:http';
import { createHmac } from 'node:crypto';

const APP = process.env.APP_URL || 'http://127.0.0.1:3100';
const SECRETO = 'whsec_' + Buffer.from('secreto-de-humo').toString('base64');
const ID_EVENTO = 'msg_smoke_' + Date.now();

let fallos = 0;
function check(nombre, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${nombre}${extra ? '  → ' + extra : ''}`);
  if (!cond) fallos++;
}

// ---------- pey falso ----------
const pey = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url === '/codi/pn' && req.method === 'POST') {
      const b = JSON.parse(body || '{}');
      if (!b.phoneNumber || String(b.phoneNumber).length !== 10) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'phoneNumber inválido', type: 'INVALID_PARAMETER' } }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ transactionId: '01TEST' + Date.now(), codiId: '12345678901234567890' }));
      return;
    }
    res.writeHead(404).end('{}');
  });
});

await new Promise((r) => pey.listen(3901, '127.0.0.1', r));
console.log('pey falso escuchando en :3901');

// ---------- 1. cobro ----------
const monto = 45000; // $450.00
const crear = await fetch(`${APP}/api/ventas`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ montoCentavos: monto, metodo: 'codi_pn', telefono: '5512345678' }),
});
const venta = await crear.json();
check('POST /api/ventas responde 201', crear.status === 201, `status ${crear.status}`);
check('la venta queda en cobrando', venta.estado === 'cobrando');
check('trae folio y numRef', Boolean(venta.folio && venta.numRef), `folio ${venta.numRef}`);

// ---------- 2. webhook firmado ----------
const payload = JSON.stringify({
  type: 'codi.pn.payment_received',
  amount: monto / 100,
  numRef: String(venta.numRef),
  transactionId: '01TESTWEBHOOK',
  concept: 'El Mostrador · Folio ' + venta.numRef,
  datePaid: Math.floor(Date.now() / 1000),
});
const ts = String(Math.floor(Date.now() / 1000));
const firma = createHmac('sha256', Buffer.from(SECRETO.replace('whsec_', ''), 'base64'))
  .update(`${ID_EVENTO}.${ts}.${payload}`)
  .digest('base64');

async function enviarWebhook(idEvento = ID_EVENTO) {
  return fetch(`${APP}/api/webhooks/pey`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': idEvento,
      'webhook-timestamp': ts,
      'webhook-signature': `v1,${firma}`,
    },
    body: payload,
  });
}

const hook = await enviarWebhook();
const hookData = await hook.json();
check('webhook firmado responde 200', hook.status === 200, `status ${hook.status}`);
check('el webhook marca pagada', hookData.estado === 'pagada', JSON.stringify(hookData));

// ---------- 3. idempotencia ----------
const dup = await enviarWebhook();
const dupData = await dup.json();
check('el mismo webhook-id no se reprocesa', dupData.duplicado === true, JSON.stringify(dupData));

// ---------- 4. firma inválida ----------
const malo = await fetch(`${APP}/api/webhooks/pey`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'webhook-id': 'msg_malo',
    'webhook-timestamp': ts,
    'webhook-signature': 'v1,AAAA',
  },
  body: payload,
});
check('firma inválida responde 401', malo.status === 401, `status ${malo.status}`);

// ---------- 5. estado y corte ----------
const estado = await (await fetch(`${APP}/api/ventas/${venta.folio}`)).json();
check('GET /api/ventas/:folio dice pagada', estado.estado === 'pagada');

const corte = await (await fetch(`${APP}/api/corte`)).json();
check('el corte suma la venta', corte.totalCentavos === monto, `${corte.totalCentavos}`);
check('el corte calcula comisión evitada', corte.comisionEvitadaCentavos === Math.round(monto * 0.04176));

// ---------- 6. liberar ----------
const lib = await fetch(`${APP}/api/ventas/${venta.folio}/liberar`, { method: 'POST' });
const libData = await lib.json();
check('liberar deja la venta en liberada', libData.estado === 'liberada', JSON.stringify(libData));

pey.close();
console.log(fallos === 0 ? '\nTODO EN VERDE' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
