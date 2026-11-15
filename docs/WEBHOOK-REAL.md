# Webhook real de pey — contrato observado

Capturado de **Logs de Webhook** del portal, con pagos reales de $0.01 el 14 de noviembre
de 2026. Tres entregas, tres `200`. Los `Request ID` coinciden uno a uno con los
`webhook-id` guardados en la tabla `eventos`, así que estos cuerpos son lo que realmente
llegó y lo que el handler procesó.

## Cuerpo (push, `codi.pn.payment_received`)

```json
{
  "amount": 0.01,
  "apiKeyId": "01M7DM8T5Q74FH4RCS6MA2DWHW",
  "bankAccountId": null,
  "concept": "El Mostrador Folio 3",
  "datePaid": 1794686124,
  "numRef": "3",
  "transactionId": "01M7DSYQTXRBMB23HHXVKXHNM5F",
  "type": "codi.pn.payment_received",
  "metadata": {
    "accountType": 40,
    "bankCode": 40167,
    "clabe": "1671800000253••••••",
    "description": "El Mostrador Folio 3",
    "externalMetadata": { "folio": "3", "origen": "el-mostrador" },
    "numRef": "3",
    "trackingKey": "167-17/11/2026/17-300BW52422"
  }
}
```

El de QR (`codi.qr.payment_received`) es igual, más un `codiQrId` (el IDC del QR) y con
`externalMetadata.folio` como único lazo al folio.

## Cuerpo real de QR en producción (`codi.qr.payment_received`)

Pagado el **15 de noviembre de 2026, 09:10 CDMX**, $0.01, folio 6, contra
`mostrador.zerotwolabs.xyz` (no túnel). El portal lo registró `200`:

```json
{
  "amount": 0.01,
  "apiKeyId": "01M7DM8T5Q74FH4RCS6MA2DWHW",
  "bankAccountId": null,
  "codiQrId": "35f829305f",
  "concept": "El Tornillo Folio 6",
  "datePaid": 1794755400,
  "numRef": "6",
  "transactionId": "01M7FW44G6VQZEB4Z14BKJCZ0HX",
  "type": "codi.qr.payment_received",
  "metadata": {
    "accountType": 40,
    "bankCode": 40167,
    "clabe": "1671800000253••••••",
    "description": "El Tornillo Folio 6",
    "externalMetadata": { "folio": "6", "origen": "el-mostrador" },
    "trackingKey": "167-17/11/2026/17-300BX30333"
  }
}
```

Diferencia con el push: **no trae `numRef` dentro de `metadata`** y `bankAccountId` viene
en `null`. El lazo al folio sigue siendo `numRef` de la raíz; `codiQrId` es lo que se
consulta si hay que reconciliar por `/transaction/codi/qr/:idc`.

## Lo que ve el pagador (P1, respondida con evidencia)

| En la app del banco | Valor observado | De dónde sale |
|---|---|---|
| Solicitante | RAMON O. L. (titular de la cuenta) | titular registrado en pey |
| Monto | $0.01 | `amount` |
| Descripción | El Tornillo Folio 6 | `concept` |
| Referencia | 6 | `numRef` = folio |
| Clave de rastreo | 167-17/11/2026/17-300BX30333 | `metadata.trackingKey` |
| Comprobante | CEP descargable | banco / pey |

Tres consecuencias de producto:

1. **El folio sí lo ve el pagador.** La pregunta 6 del kickoff queda contestada: `numRef`
   aparece como "Referencia" en la app del banco, en la app CoDi y en el CEP. Sirve como
   folio visible, no solo como llave interna.
2. **El nombre que ve el pagador es el del titular**, no el nombre comercial. "El Tornillo"
   viaja en la descripción. En el mostrador hay que decirlo así: "le va a aparecer Ramón
   Orraca, es la cuenta del negocio". No es engaño (términos 5.2(b)): es el dueño de la cuenta.
3. **El CEP es el comprobante real.** El ticket de papel no prueba nada; el comprobante
   electrónico de pago ya está en el banco del cliente.

## Dos apps para el mismo pago

La misma solicitud se puede aceptar desde **CoDi** (Banxico) y desde la **banca del
pagador**. En CoDi se ve como "Solicitud de pago" con Solicitante / Monto / Descripción /
Referencia y botones Aceptar–Rechazar; en la banca, como "Pagar a" con cuenta destino,
monto, descripción, referencia y límite por transacción.

Es más de lo que asumimos: el cliente **no necesita tener CoDi activo en su banco** para
pagar; con la app CoDi también cierra.

**Límite observado:** $51,997.73 por transacción en la banca del pagador ese día. Para
tickets de tlapalería sobra; para una obra grande puede no alcanzar.

## Lo que esta prueba cierra

- Webhook real contra el dominio de producción, firmado y respondido `200`.
- QR real pagado con la app del banco, no con el simulador.
- `numRef` visible para el pagador y `externalMetadata.folio` rebotado.
- El corte cuadra: 1 venta `codi_qr`, 1 centavo, folio 6.
- El recobro por QR expirado conservó el folio (el pago entró con folio 6).

## Cuidado al publicar capturas

El cuerpo trae la **CLABE del negocio** y el `apiKeyId`. Para el repo, el video o el
formulario de entrega: recorta o tapa esos dos campos. Las capturas de la app del banco
también muestran el nombre del titular y los últimos cuatro dígitos de la cuenta.

## Sobre las entregas del 14 de noviembre

Las tres primeras entregas del push llegaron al túnel (`trycloudflare`), no al dominio.
Eso ya quedó resuelto: desde el 15 de noviembre el webhook entra al dominio de producción.


## Qué significa cada campo para nosotros

| Campo | Detalle | Qué hacemos |
|---|---|---|
| `type` | Solo `codi.pn.payment_received` y `codi.qr.payment_received` importan | Se ignoran los demás con `200` |
| `amount` | **Pesos, no centavos** (`0.01`) | `Math.round(amount * 100)` y se compara contra `montoCentavos`; si no cuadra, `409` y no se marca pagada |
| `numRef` | Es nuestro folio, tal cual | Llave de búsqueda de la venta (≤ 7 dígitos) |
| `metadata.externalMetadata.folio` | Lo que mandamos al crear el cobro, rebotado | Respaldo si algún día falta `numRef` |
| `transactionId` | ULID de la transacción | Se guarda como `pey_id` |
| `codiQrId` | IDC del QR | Es lo que se consulta en la reconciliación de QR (`/transaction/codi/qr/:idc`) |
| `datePaid` | **Segundos**, no milisegundos | Se ignora: usamos la hora de recepción para el corte |
| `metadata.clabe` / `apiKeyId` | Datos del negocio | No se guardan ni se muestran |

## Lo que estos logs prueban

1. **La firma Standard Webhooks está bien implementada**: pey firmó, nosotros verificamos
   sobre el cuerpo crudo y respondimos `200`. Tres de tres.
2. **El dedupe por `webhook-id` funciona**: los tres IDs del portal existen una sola vez en
   `eventos`.
3. **El monto se interpreta bien**: los pagos de $0.01 se registraron como 1 centavo.
4. **El lazo venta ↔ pago cierra**: `numRef` = folio, y `externalMetadata` lo confirma.

