import TicketDemo from '@/components/TicketDemo';

const REPO = 'https://github.com/usainbluntmx/el-mostrador';

export const metadata = {
  title: 'El Mostrador — cobra con CoDi sin terminal',
  description:
    'Cobra con CoDi desde el celular del mostrador. Sin terminal, sin comisión. Pagos reales confirmados por webhook firmado.',
};

export default function Inicio() {
  return (
    <main className="landing">
      <header className="l-barra">
        <a className="l-marca" href="/">
          El Mostrador
        </a>
        <nav className="l-nav" aria-label="Principal">
          <a href="#la-cuenta">La cuenta</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="/corte">El corte</a>
        </nav>
        <a className="l-nav-cta" href="/cobrar">
          Abrir la caja
        </a>
      </header>

      <section className="l-hero">
        <div className="l-hero-copy">
          <p className="l-kicker">Hackatón México 2026 — Zero Two Labs</p>
          <h1>Cobra con CoDi desde el celular del mostrador.</h1>
          <p className="l-sub">
            Sin terminal y sin comisión. El cliente paga desde su banco, la pantalla se pone
            verde sola y el corte del día se arma solo.
          </p>
          <div className="l-cta">
            <a className="l-boton" href="/cobrar">
              Probar el cobro
            </a>
            <a className="l-boton-2" href={REPO} target="_blank" rel="noreferrer">
              Ver el código
            </a>
          </div>
          <dl className="l-datos">
            <div className="l-dato">
              <b>3</b>
              <span>pagos reales de $0.01</span>
            </div>
            <div className="l-dato">
              <b>3/3</b>
              <span>webhooks firmados, 200</span>
            </div>
            <div className="l-dato">
              <b>0%</b>
              <span>de comisión en CoDi</span>
            </div>
          </dl>
        </div>

        <div className="l-artefacto">
          <TicketDemo />
        </div>
      </section>

      <section className="l-seccion" id="la-cuenta" aria-labelledby="t-la-cuenta">
        <div className="l-cuenta">
          <div className="l-seccion-cabeza">
            <h2 id="t-la-cuenta">Lo que se queda la terminal</h2>
            <p>
              Una terminal cobra 3.6% más IVA: <b>4.176%</b> de cada venta. En un ticket de
              $3,000 son <b>$125.28</b> que no llegan al negocio. Con CoDi, cero.
            </p>
            <p className="l-nota">
              Un ticket grande al día son $2,505.60 al mes. Si el negocio ya tiene tarifa
              promocional, el ahorro real es menor: se dice en el corte, no se infla.
            </p>
          </div>

          <div className="recibo" aria-label="Ejemplo de un ticket de 3 mil pesos">
            <div className="recibo-cabecera">
              <b>El Tornillo</b>
              <span>Ticket de ejemplo</span>
            </div>

            <div className="recibo-linea">
              <span>Ticket</span>
              <b>$3,000.00</b>
            </div>
            <div className="recibo-linea rojo">
              <span>Terminal 3.6% + IVA</span>
              <b>−$125.28</b>
            </div>
            <div className="recibo-linea">
              <span>Queda con terminal</span>
              <b>$2,874.72</b>
            </div>
            <div className="recibo-linea verde">
              <span>CoDi</span>
              <b>$0.00</b>
            </div>
            <div className="recibo-linea">
              <span>Queda con CoDi</span>
              <b>$3,000.00</b>
            </div>

            <div className="recibo-total">
              <span>Diferencia</span>
              <b className="tabular">+$125.28</b>
            </div>

            <div className="recibo-pie">Mismo cliente, mismo ticket, sin terminal</div>
          </div>
        </div>
      </section>

      <section className="l-seccion" id="como-funciona" aria-labelledby="t-como">
        <div className="l-seccion-cabeza">
          <h2 id="t-como">Así se cobra</h2>
        </div>
        <ol className="l-pasos">
          <li>
            <span className="num">01</span>
            <h3>Teclea el monto</h3>
            <p>Teclado grande, montos en pesos. Sin menús y sin cuentas que abrir.</p>
          </li>
          <li>
            <span className="num">02</span>
            <h3>Manda el cobro</h3>
            <p>
              Al teléfono del cliente como solicitud de pago, o como QR en la pantalla si no lo
              tienes a mano.
            </p>
          </li>
          <li>
            <span className="num">03</span>
            <h3>Se pone verde</h3>
            <p>
              El banco confirma con un webhook firmado y la venta queda pagada. Nadie revisa
              capturas de pantalla.
            </p>
          </li>
        </ol>
      </section>

      <section className="l-seccion l-prueba" aria-labelledby="t-prueba">
        <div className="l-seccion-cabeza">
          <h2 id="t-prueba">Cómo se confirma el pago</h2>
          <p>
            Tres candados entre “el cliente dice que ya pagó” y “el dinero está en la cuenta”.
          </p>
        </div>

        <div className="l-prueba-grid">
          <ul className="l-garantias">
            <li>
              <b>Firma verificada</b>
              <p>
                Standard Webhooks sobre el cuerpo crudo, antes de leer el JSON. Si la firma no
                cuadra: 401 y la base no se toca.
              </p>
            </li>
            <li>
              <b>Idempotencia</b>
              <p>
                Cada evento se identifica por su <span className="mono">webhook-id</span>. El
                mismo aviso dos veces no cobra dos veces.
              </p>
            </li>
            <li>
              <b>Reconciliación</b>
              <p>
                Si el webhook no llega, cada 30 segundos se pregunta al proveedor por las ventas
                abiertas. La venta se cierra igual.
              </p>
            </li>
          </ul>

          <div className="l-payload">
          <div className="l-payload-cabecera">
            <span>Webhook real · 14 nov 2026</span>
            <b>POST /api/webhooks/pey — 200</b>
          </div>
          <div
            className="l-payload-cuerpo"
            role="img"
            aria-label="Cuerpo real del webhook de pey, con la CLABE del negocio oculta"
          >
            <div className="p-linea">{'{'}</div>
            <div className="p-linea p-i1">
              <span className="clave">&quot;type&quot;</span>: <span className="valor">&quot;codi.qr.payment_received&quot;</span>,
            </div>
            <div className="p-linea p-i1">
              <span className="clave">&quot;amount&quot;</span>: <span className="numero">0.01</span>,
            </div>
            <div className="p-linea p-i1">
              <span className="clave">&quot;numRef&quot;</span>: <span className="valor">&quot;4&quot;</span>,
            </div>
            <div className="p-linea p-i1">
              <span className="clave">&quot;transactionId&quot;</span>: <span className="valor">&quot;01M7E1YDZZ7BWHH5PQJ3JMYM2&quot;</span>,
            </div>
            <div className="p-linea p-i1">
              <span className="clave">&quot;datePaid&quot;</span>: <span className="numero">1794694395</span>,
            </div>
            <div className="p-linea p-i1">
              <span className="clave">&quot;concept&quot;</span>: <span className="valor">&quot;El Tornillo Folio 4&quot;</span>,
            </div>
            <div className="p-linea p-i1">
              <span className="clave">&quot;metadata&quot;</span>: {'{'}
            </div>
            <div className="p-linea p-i2">
              <span className="clave">&quot;clabe&quot;</span>: <span className="tachado">&quot;••••••••••••••••7274&quot;</span>,
            </div>
            <div className="p-linea p-i2">
              <span className="clave">&quot;externalMetadata&quot;</span>: {'{ '}
              <span className="clave">&quot;folio&quot;</span>: <span className="valor">&quot;4&quot;</span>,{' '}
              <span className="clave">&quot;origen&quot;</span>: <span className="valor">&quot;el-mostrador&quot;</span>
              {' }'}
            </div>
            <div className="p-linea p-i1">{'}'}</div>
            <div className="p-linea">{'}'}</div>
          </div>
          </div>
        </div>
      </section>

      <section className="l-seccion" aria-labelledby="t-condiciones">
        <div className="l-seccion-cabeza">
          <h2 id="t-condiciones">Lo que no es</h2>
        </div>
        <ul className="l-condiciones">
          <li>
            <span>
              <b>No es otra terminal.</b> No procesa tarjeta: la terminal se queda para quien
              paga con tarjeta, y esto se lleva el volumen que hoy va a transferencia o a
              tarjeta.
            </span>
          </li>
          <li>
            <span>
              <b>CoDi solo cobra.</b> Las devoluciones se registran en el corte y se pagan por
              SPEI desde el banco del negocio. No se promete un botón que no existe.
            </span>
          </li>
          <li>
            <span>
              <b>El QR no se imprime en el piloto.</b> Un QR fijo obliga al cliente a escribir
              el monto y pierde el folio, que es lo que amarra la venta con el pago. El QR se
              genera por venta.
            </span>
          </li>
        </ul>
      </section>

      <footer className="l-pie">
        <span>Zero Two Labs · Hackatón México 2026</span>
        <a href={REPO} target="_blank" rel="noreferrer">
          github.com/usainbluntmx/el-mostrador
        </a>
      </footer>
    </main>
  );
}
