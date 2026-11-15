# El Mostrador — dirección de arte

Documento de trabajo para que cualquier IA toque la UI sin inventar un sistema nuevo.

## Tipo de negocio y material

**Software de punto de venta para un lugar físico** (tlapalería de barrio). El material que
manda es **la UI real en uso** y **el ticket**: lo que el dependiente ve en el celular y lo
que el banco devuelve. No hay fotos de stock, no hay ilustraciones, no hay logos de clientes.

## Audiencia y trabajo de la página

- **Dueño o dependiente de comercio de barrio**: tiene que entender en 5 segundos que puede
  cobrar desde el celular que ya trae en la mano, que el dinero cae en su cuenta y que no
  paga comisión. Su objeción real no es "¿tiene IA?", es "¿y si el cliente dice que ya pagó?".
- **Juez del hackatón**: evalúa ejecución. Necesita ver que no es un mock: logs del
  proveedor, webhook firmado, reconciliación, corte que cuadra.

La página hace dos trabajos: convence al comerciante y demuestra al juez. Van separados en
dos bloques distintos, con registros distintos (papel vs. noche técnica).

## Arquetipo

**Hero asimétrico** (texto a la izquierda, artefacto vivo a la derecha), no hero centrado.
El artefacto es un **ticket que cobra solo**: monto → esperando al banco → sello PAGADO.
Es el producto funcionando, no una captura.

## Paleta (6 nombrados, derivados del sujeto)

| Token | Valor | De dónde sale |
|---|---|---|
| papel | `#F7F1E4` | papel de nota / recibo térmico |
| tinta | `#14110D` | negro de impresora térmica |
| verde máquina | `#0B3D2E` | esmalte de caja registradora vieja |
| verde sello | `#0E6B4F` | el verde de PAGADO (se conserva: ya es la marca) |
| ámbar sello | `#C9761C` | papel kraft, sello de goma |
| noche | `#101915` | el mostrador apagado, para el bloque técnico |

Contraste: texto normal sobre papel a 12.6:1; secundario `#5E5648` a 5.6:1; verde sello sobre
papel a 5.1:1. Sobre noche, papel claro a 15:1 y verde claro `#4FBF95` a 8.4:1.

## Tipografía

- **Archivo** (400/600/700/800): grotesca industrial, no Inter, no Geist. Titulares en 800
  con tracking −0.03em; cuerpo 17–18px, medida 62–70ch.
- **IBM Plex Mono** (400/500/600): **solo datos** — montos, folios, líneas del ticket,
  payload del webhook. Numerales tabulares siempre.

## Layout

```
DESKTOP (≥1000px)
┌──────────────────────────────────────────────────────────┐
│ marca            cómo funciona  ·  el corte  ·  código   │
├───────────────────────────┬──────────────────────────────┤
│ kicker                    │        ┌──────────────┐      │
│ H1 (3 líneas, 15ch)       │        │  TICKET      │      │
│ sub (46ch)                │        │  $240.00     │      │
│ [Probar el cobro] [código]│        │  PAGADO ⬤    │      │
│ 3 pagos reales · 0%       │        └──────────────┘      │
├───────────────────────────┴──────────────────────────────┤
│ LA CUENTA — recibo de $3,000: terminal 4.176% vs CoDi 0% │
├──────────────────────────────────────────────────────────┤
│ 1 teclea   2 manda   3 se pone verde   (franja, no cards)│
├──────────────────────────────────────────────────────────┤
│ NOCHE: cómo se confirma — payload real + 3 garantías     │
├──────────────────────────────────────────────────────────┤
│ condiciones (lo que no es) — lista corta, sin tarjetas   │
└──────────────────────────────────────────────────────────┘

MÓVIL (390px)
┌──────────────────┐
│ marca       menú │
│ kicker           │
│ H1 (2–3 líneas)  │
│ sub              │
│ [Probar cobro]   │
│ ┌──────────────┐ │
│ │ TICKET       │ │
│ └──────────────┘ │
│ recibo de cuenta │
│ pasos (vertical) │
└──────────────────┘
```

## Principios

1. **El ticket es el objeto**: bordes perforados, líneas punteadas, mono, sello. Un solo
   elemento con audacia; el resto quieto.
2. **El verde no se usa de fondo** salvo en el estado PAGADO. El verde es información, no
   decoración.
3. **Cero animación de adorno**: se anima el estado del cobro, el sello y los estados de
   botón. Nada de fade-in por sección.
4. **Los números son reales**: $0.01 pagados de verdad, tres respuestas 200, 4.176% de
   terminal (3.6% + IVA), $125.28 en un ticket de $3,000. Nada de métricas inventadas.
5. **Una sola acción primaria por pantalla**: "Probar el cobro" en la landing, "Cobrar" en
   la app.

## Riesgo y un "no"

- **Riesgo**: que el ticket se lea como sticker decorativo. Se controla con datos reales
  dentro (folio, monto, sello con hora) y porque el visitante lo puede volver a correr.
- **No**: no se usa la palabra "revoluciona", no se inventan testimonios, no se muestran
  logos de bancos, no hay emojis en títulos ni iconos genéricos de cohete.
