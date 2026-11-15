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
    "clabe": "167180000025357274",
    "description": "El Mostrador Folio 3",
    "externalMetadata": { "folio": "3", "origen": "el-mostrador" },
    "numRef": "3",
    "trackingKey": "167-17/11/2026/17-300BW52422"
  }
}
```

El de QR (`codi.qr.payment_received`) es igual, más un `codiQrId` (el IDC del QR) y con
`externalMetadata.folio` como único lazo al folio.

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

## Lo que estos logs NO prueban

Las tres entregas son del **14 de noviembre y llegaron al túnel** (`trycloudflare`), no al
dominio `mostrador.zerotwolabs.xyz`. La última es de las 22:13 UTC, cuatro segundos antes
del evento guardado en la base local.

**No hay un solo intento contra el dominio.** Por eso `/api/salud` decía
`no_llega_nada`: no es que el borde lo esté frenando, es que nadie ha pagado desde que
cambió la URL. La prueba pendiente es un cobro de $0.01 con el endpoint ya apuntando al
dominio.

## Cuidado al publicar capturas

El cuerpo trae la **CLABE del negocio** y el `apiKeyId`. Para el repo, el video o el
formulario de entrega: recorta o tapa esos dos campos.
