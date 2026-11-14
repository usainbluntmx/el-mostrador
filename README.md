# El Mostrador

Cobro con CoDi desde el celular del dependiente. Sin terminal, sin comisión.

Una pantalla: monto, teléfono del cliente, cobrar. El cliente recibe el cobro en su
banco y la pantalla se pone verde sola. Al cierre del día, el corte por método y
cuánto se dejó de pagar en comisión.

**Hackatón México 2026** — pista principal: uso de CoDi y del API de pey.

---

## Estado actual

Funciona y está probado de punta a punta contra un pey simulado (`scripts/smoke.mjs`):

| Pieza | Estado |
|---|---|
| Cobro CoDi por push (`POST /codi/pn`) | ✅ |
| Cobro CoDi por QR (`POST /codi/qr`) | ✅ (backend; la UI de QR falta) |
| Webhook con firma Standard Webhooks | ✅ verificada antes de parsear |
| Idempotencia por `webhook-id` | ✅ |
| Reconciliación por `GET /transaction/{id}` | ✅ respaldo si el webhook no llega |
| Máquina de estados de la venta | ✅ 27 pruebas |
| Corte del día por método + comisión evitada | ✅ |
| Liberar venta para surtir | ✅ (la "acción verificable") |
| Pantalla de cobro y de corte | ✅ responsive, teclado numérico grande |
| Push real contra `api.pey.mx` | ⏳ falta la API key del negocio |

---

## Cómo correrlo

Requiere **Node 22 o superior** (usa `node:sqlite`, sin dependencias nativas).

```bash
npm install
cp .env.example .env.local     # llena PEY_API_KEY y PEY_WEBHOOK_SECRET
npm run dev                    # http://localhost:3000
```

Pruebas y tipos:

```bash
npm test          # 27 pruebas: estados, firma, validación, store
npm run typecheck
```

Prueba de humo de punta a punta (levanta un pey falso, no gasta saldo):

```bash
npm run build
PEY_API_KEY=test \
PEY_WEBHOOK_SECRET=whsec_$(printf 'secreto-de-humo' | base64) \
PEY_BASE_URL=http://127.0.0.1:3901 \
DATA_DIR=.data-smoke \
npx next start -p 3100

# en otra terminal:
APP_URL=http://127.0.0.1:3100 node scripts/smoke.mjs
```

---

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/ventas` | Crea la venta y dispara el cobro (push o QR) |
| `GET` | `/api/ventas/:folio` | Estado; reconcilia contra pey si sigue `cobrando` |
| `POST` | `/api/ventas/:folio/liberar` | Solo si está pagada: libera el material para surtir |
| `POST` | `/api/webhooks/pey` | Firma → dedupe → marca pagada |
| `GET` | `/api/corte?dia=YYYY-MM-DD` | Totales por método + comisión evitada |

### Máquina de estados

```
creada → cobrando → pagada → liberada
              ↓
           expirada → cobrando (recobro con el mismo folio)
              ↓
          cancelada
```

`pagada` **solo** se alcanza por webhook verificado o por consulta a
`GET /transaction/{id}`. Nunca por el redirect del navegador.

---

## Decisiones que importan

1. **El folio es el `numRef`.** La transacción de pey no dice quién pagó: sin
   referencia propia no hay conciliación posible. `numRef` ≤ 7 dígitos.
2. **La firma se verifica sobre el cuerpo crudo**, antes de `JSON.parse`. El
   `webhook-id` es la llave de idempotencia: el mismo evento no se procesa dos veces.
3. **El teléfono del pagador no se guarda.** Viaja a pey para disparar el push y
   se descarta. No hay historial de clientes.
4. **Montos en centavos enteros.** Cero floats en la base.
5. **El corte es del día en CDMX** (UTC−6), no del servidor en UTC.
6. **La comisión evitada usa la tasa de referencia de la terminal con IVA (4.18%)**
   y se dice en pantalla: si el negocio ya tiene tarifa promocional, el ahorro real
   es menor. No se infla el número.
7. **SQLite local con el módulo nativo de Node.** La persistencia está aislada en
   `lib/store.ts` para cambiar a Postgres en producción sin tocar las rutas.

---

## Lo que falta

- [ ] Pantalla del QR (el backend ya lo genera)
- [ ] Push real con la API key del negocio y CLABE propia
- [ ] Devoluciones (CoDi solo cobra: el reembolso es SPEI manual y se registra)
- [ ] Postgres para producción
- [ ] Capa de cotización (siguiente iteración: el ticket de $3,000 es una obra, no un tornillo)
- [ ] Tests de integración de la ruta de webhook con base real

---

## Atribución

```md
## Built at Hackatón México 2026

Durante el hackatón se construyó: la integración con el API de pey
(cobros CoDi por push y QR, verificación de webhooks, idempotencia,
reconciliación, corte del día y liberación de la venta).
```
