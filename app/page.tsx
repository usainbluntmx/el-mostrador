export const metadata = {
  title: 'El Mostrador — cobra con CoDi sin terminal',
  description:
    'Cobra con CoDi desde el celular del dependiente. Sin terminal, sin comisión. Probado con pagos reales.',
};

const REPO = 'https://github.com/usainbluntmx/el-mostrador';

export default function Inicio() {
  return (
    <main className="landing">
      <header className="l-barra">
        <span className="l-marca">El Mostrador</span>
        <nav className="l-nav">
          <a href="/cobrar">Demo</a>
          <a href="/corte">Corte</a>
          <a href={REPO} target="_blank" rel="noreferrer">
            Código
          </a>
        </nav>
      </header>

      <section className="l-hero">
        <p className="l-kicker">Hackatón México 2026 · Zero Two Labs</p>
        <h1>
          Cobra con CoDi desde el celular del dependiente.
        </h1>
        <p className="l-sub">
          Sin terminal. Sin comisión. La caja del negocio en el teléfono que ya está en el
          mostrador.
        </p>
        <div className="l-cta">
          <a className="l-boton" href="/cobrar">
            Probar el cobro
          </a>
          <a className="l-boton-2" href={REPO} target="_blank" rel="noreferrer">
            Ver el código
          </a>
        </div>
      </section>

      <section className="l-bloque">
        <h2>Así se cobra</h2>
        <ol className="l-pasos">
          <li>
            <b>Escribe el monto.</b> Teclado grande, sin menús. Como una caja registradora.
          </li>
          <li>
            <b>Manda el cobro.</b> Al teléfono del cliente como solicitud de pago, o como QR en
            pantalla si no lo tienes.
          </li>
          <li>
            <b>Se pone verde solo.</b> El banco confirma, el webhook firmado marca la venta como
            pagada. Nadie revisa capturas.
          </li>
        </ol>
      </section>

      <section className="l-bloque l-dos">
        <div>
          <h2>Lo que cuesta hoy</h2>
          <p>
            Cada venta con tarjeta paga <b>4.18%</b> con IVA. En un ticket de $3,000 son{' '}
            <b>$125.28</b>. Con CoDi: <b>$0</b>.
          </p>
          <p className="l-mini">
            Diez ventas al mes migradas a CoDi son $1,250 que se quedan en el negocio.
          </p>
        </div>
        <div className="l-cifras">
          <div className="l-cifra">
            <span>Terminal</span>
            <b>4.18%</b>
          </div>
          <div className="l-cifra l-cifra-verde">
            <span>CoDi</span>
            <b>0%</b>
          </div>
        </div>
      </section>

      <section className="l-bloque l-prueba">
        <h2>Probado, no prometido</h2>
        <p>
          Dos pagos reales de $0.01 —uno por push y uno por QR— confirmados por webhook firmado en{' '}
          <b>3 y 6 milisegundos</b>. La app corre en producción contra el API de pey.
        </p>
      </section>

      <section className="l-bloque">
        <h2>Lo que no es</h2>
        <p>
          No es otra terminal y no procesa tarjeta: la terminal se queda para quien paga con
          tarjeta. El Mostrador se lleva el volumen que hoy va a tarjeta o a transferencia, y lo
          cobra sin comisión.
        </p>
        <p className="l-mini">
          CoDi solo cobra. Las devoluciones se registran en el corte y se pagan por transferencia
          desde el banco del negocio: no se promete un botón que no existe.
        </p>
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
