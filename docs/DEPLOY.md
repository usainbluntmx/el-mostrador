# Deploy en Dokploy

Guía punto por punto para dejar `mostrador.zerotwolabs.xyz` en vivo.

**Lo que se despliega:** una sola aplicación Next.js en Docker, con SQLite en un volumen.
No hay base de datos externa ni worker: un contenedor y un disco.

---

## 0. Antes de empezar

- Servidor con Dokploy instalado y el panel accesible.
- Acceso al DNS de `zerotwolabs.xyz`.
- Repo: `https://github.com/usainbluntmx/el-mostrador` (público, rama `main`).

---

## 1. DNS

En el panel de tu dominio:

- Tipo **A**, nombre `mostrador`, valor **la IP pública del servidor de Dokploy**.
- Si el DNS está en Cloudflare: deja el proxy en **DNS only (nube gris)** hasta que el
  certificado esté emitido. La naranja bloquea el desafío HTTP de Let's Encrypt y el
  certificado nunca sale.

Verifica desde tu máquina antes de seguir:

```bash
dig +short mostrador.zerotwolabs.xyz
```

Debe devolver la IP del servidor.

---

## 2. Crear la aplicación

1. **Projects** → abre un proyecto (o **Create Project**).
2. **Create Service** → **Application**.
3. Nombre: `el-mostrador`.

---

## 3. Conectar el repositorio

En la pestaña **General** de la aplicación:

- **Provider**: `GitHub` (conectas la GitHub App y eliges el repo) **o** `Git` con la URL
  pública `https://github.com/usainbluntmx/el-mostrador.git`.
- **Branch**: `main`.
- **Build Path**: `/`.

Con `Git` y repo público no necesitas conectar la GitHub App: es la ruta más corta.

---

## 4. Configurar el build

En **Build**:

- **Build Type**: `Dockerfile`.
- **Dockerfile Path**: `./Dockerfile`.
- **Docker Context Path**: `.`.

El `Dockerfile` ya está en el repo: compila Next en modo `standalone` y corre con Node 22
(necesario porque la app usa `node:sqlite`, que viene integrado en el runtime).

---

## 5. Variables de entorno

En **Environment**. Estas siete y ninguna más:

```env
NODE_ENV=production
DATA_DIR=/app/.data
PEY_BASE_URL=https://api.pey.mx
NEGOCIO_NOMBRE=<nombre de la ferretería>
PEY_API_KEY=<tu api key>
PEY_WEBHOOK_SECRET=<tu whsec_...>
QR_EXPIRACION=600
```

- `NEGOCIO_NOMBRE` es lo que el cliente ve en el concepto del cobro. En el piloto va el
  nombre real del negocio, no "El Mostrador".
- **Nunca subas `.env.local` al repo.** El `.dockerignore` ya lo excluye del contexto de
  build, pero no lo agregues a mano.

---

## 6. Volumen (esto es lo que salva las ventas)

En **Mounts** → **Add Mount** → **Volume Mount**:

- **Name**: `mostrador-data`
- **Mount Path**: `/app/.data`

Sin este volumen, cada redeploy arranca con la caja vacía.

Usa **volume mount**, no bind mount: el volumen hereda el dueño `nextjs` (uid 1001) del
directorio de la imagen. Con un bind mount tendrías que hacer `chown 1001:1001` en el host.

---

## 7. Dominio y HTTPS

En **Domains** → **Add Domain**:

- **Host**: `mostrador.zerotwolabs.xyz`
- **Path**: `/`
- **Internal Port**: `3000`
- **HTTPS**: activado (Let's Encrypt)

Dokploy pone Traefik al frente y emite el certificado. Si el certificado no sale, revisa el
paso 1: casi siempre es el proxy de Cloudflare.

---

## 8. Primer deploy

1. **Deploy**. El primer build tarda 2–4 minutos.
2. Revisa los logs del build: debe terminar con la app escuchando en `3000`.
3. Verifica desde fuera:

```bash
curl -o /dev/null -w "%{http_code}\n" https://mostrador.zerotwolabs.xyz/
curl -o /dev/null -w "%{http_code}\n" https://mostrador.zerotwolabs.xyz/cobrar
curl -o /dev/null -w "%{http_code}\n" https://mostrador.zerotwolabs.xyz/api/corte
curl -o /dev/null -w "%{http_code}\n" https://mostrador.zerotwolabs.xyz/manifest.webmanifest
```

Los cuatro deben dar `200` (el cuarto puede ser `200` o `304`).

**Health check sugerido** en Dokploy: ruta `/api/corte`, puerto `3000`.

---

## 9. Apuntar el webhook de pey al dominio nuevo

En el portal de pey → **Webhooks**:

- Si puedes **editar** el endpoint existente, cambia la URL a
  `https://mostrador.zerotwolabs.xyz/api/webhooks/pey` y conserva el secreto.
- Si tienes que **crear uno nuevo**, el secreto es nuevo: actualiza `PEY_WEBHOOK_SECRET` en
  Dokploy y vuelve a desplegar.

Prueba final, con dinero real:

1. Abre `https://mostrador.zerotwolabs.xyz/cobrar`.
2. Cobra $0.01 por QR.
3. Paga desde tu banco.
4. La pantalla debe pasar a **PAGADO** sola, y `/corte` debe mostrar el centavo.

Si la pantalla se queda en "Esperando al banco", el webhook no está llegando: revisa
**Webhook Logs** en el portal (ahí se ve el código de respuesta que devolvimos).

---

## 10. Auto deploy

En **General** → activa **Auto Deploy** y copia la URL del webhook de Dokploy en
GitHub → Settings → Webhooks del repo. Cada push a `main` redeploya.

---

## 11. Respaldos

La base es un solo archivo dentro del volumen: `/app/.data/el-mostrador.db`.

```bash
docker run --rm -v <proyecto>_mostrador-data:/data -v $(pwd):/backup alpine \
  cp /data/el-mostrador.db /backup/el-mostrador-$(date +%F).db
```

Para el piloto basta con copiarlo una vez al día.

---

## Problemas comunes

| Síntoma | Causa | Arreglo |
|---|---|---|
| `SQLITE_CANTOPEN` en logs | El volumen no tiene permisos de escritura | Usa volume mount (no bind) o `chown 1001:1001` en el host |
| 502 al abrir el dominio | El dominio apunta a un puerto distinto | Internal Port = `3000` |
| Certificado no se emite | Proxy de Cloudflare activo | DNS only (nube gris) y reintenta |
| Webhook responde `401` | El secreto no coincide | Copia de nuevo `whsec_...` del portal a la env y redeploy |
| La app abre pero el corte está vacío | `DATA_DIR` mal o sin volumen | `DATA_DIR=/app/.data` y volumen montado ahí |
| El cliente ve un nombre raro | Cuenta de persona física | Es el titular de la cuenta: se resuelve con persona moral o avisando en el mostrador |

---

## Nota de honestidad

La imagen de Docker **no se probó en esta máquina** porque no tiene Docker instalado. Lo que sí
se verificó es el build `standalone`, que es exactamente lo que corre el contenedor: arrancó y
sirvió `/`, `/cobrar`, `/corte`, `/api/corte` y `/manifest.webmanifest` con `200`.
El primer `Deploy` en Dokploy es la prueba real de la imagen.
