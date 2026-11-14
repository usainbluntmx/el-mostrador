'use client';

import { useCallback, useEffect, useState } from 'react';

type Metodo = 'codi_pn' | 'codi_qr';

type Venta = {
  folio: number;
  numRef: string;
  estado: 'creada' | 'cobrando' | 'pagada' | 'expirada' | 'cancelada' | 'liberada';
  montoCentavos: number;
  metodo: Metodo;
  concepto: string;
};

const MAX_DIGITOS = 9;

function pesos(centavos: number): string {
  return (centavos / 100).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Cobrar() {
  const [digitos, setDigitos] = useState('');
  const [metodo, setMetodo] = useState<Metodo>('codi_pn');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venta, setVenta] = useState<Venta | null>(null);
  const [qr, setQr] = useState<{ imagen: string | null; texto: string | null } | null>(null);

  const centavos = Number(digitos || '0');
  const ocupado = venta !== null;

  const teclear = (d: string) => {
    if (ocupado) return;
    setError(null);
    setDigitos((prev) => {
      const siguiente = (prev + d).replace(/^0+(?=\d)/, '');
      return siguiente.slice(0, MAX_DIGITOS);
    });
  };

  const borrar = () => {
    if (ocupado) return;
    setDigitos((prev) => prev.slice(0, -1));
  };

  const cobrar = async () => {
    if (centavos <= 0) {
      setError('Escribe el monto primero');
      return;
    }
    if (metodo === 'codi_pn' && telefono.length !== 10) {
      setError('El teléfono del cliente debe tener 10 dígitos');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoCentavos: centavos,
          metodo,
          telefono: metodo === 'codi_pn' ? telefono : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo crear el cobro');
        return;
      }
      setVenta(data as Venta);
      if (data?.qrImage) {
        setQr({ imagen: data.qrImage as string, texto: (data.qrString as string) ?? null });
      }
    } catch {
      setError('Sin conexión con el servidor');
    } finally {
      setEnviando(false);
    }
  };

  // Reconciliación: mientras siga `cobrando`, se pregunta al servidor.
  useEffect(() => {
    if (!venta || venta.estado !== 'cobrando') return;
    const folio = venta.folio;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/ventas/${folio}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as Venta;
        if (data.estado !== 'cobrando') setVenta(data);
      } catch {
        /* se reintenta en el siguiente tick */
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [venta]);

  const nueva = () => {
    setVenta(null);
    setQr(null);
    setDigitos('');
    setTelefono('');
    setError(null);
  };

  const cancelar = async () => {
    if (venta) {
      try {
        await fetch(`/api/ventas/${venta.folio}/cancelar`, { method: 'POST' });
      } catch {
        /* si no hay red, la venta expira sola */
      }
    }
    nueva();
  };

  const liberar = async () => {
    if (!venta) return;
    try {
      const res = await fetch(`/api/ventas/${venta.folio}/liberar`, { method: 'POST' });
      if (res.ok) setVenta((await res.json()) as Venta);
    } catch {
      /* el demo sigue */
    }
  };

  const pagada = venta?.estado === 'pagada' || venta?.estado === 'liberada';
  const esQr = venta ? (venta.metodo ?? metodo) === 'codi_qr' : metodo === 'codi_qr';

  if (pagada && venta) {
    return (
      <div className="pagado" role="alert" aria-live="assertive">
        <div className="palomita">✓</div>
        <div className="etiqueta">Pagado</div>
        <div className="cifra">${pesos(venta.montoCentavos)}</div>
        <div className="detalle">
          Folio {venta.numRef}
          <br />
          {venta.estado === 'liberada' ? 'Material liberado' : 'Dinero en la cuenta del negocio'}
        </div>
        <div className="acciones">
          {venta.estado === 'pagada' ? (
            <>
              <button className="primario" onClick={liberar}>
                Liberar para surtir
              </button>
              <button className="secundario" onClick={nueva}>
                Nueva venta
              </button>
            </>
          ) : (
            <button className="primario" onClick={nueva}>
              Nueva venta
            </button>
          )}
        </div>
        <div className="nota">El comprobante ya está en el banco del cliente.</div>
      </div>
    );
  }

  if (venta) {
    return (
      <main className="marco">
        <header className="barra">
          <span className="marca">El Mostrador</span>
          <span>Folio {venta.numRef}</span>
        </header>

        {venta.estado === 'expirada' ? (
          <div className="esperando">
            <h2>El cobro expiró</h2>
            <p>El cliente no pagó en los 6 minutos. No se cobró nada.</p>
            <button className="cobrar" onClick={nueva}>
              Empezar de nuevo
            </button>
          </div>
        ) : esQr && qr?.imagen ? (
          <div className="esperando" aria-live="polite">
            <div className="qr-caja">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/png;base64,${qr.imagen}`} alt={`QR para cobrar folio ${venta.numRef}`} />
              <div className="qr-datos">
                <b>${pesos(venta.montoCentavos)}</b>
                <span>Folio {venta.numRef}</span>
              </div>
            </div>
            <h2>Que lo escanee</h2>
            <p>
              El cliente abre su app bancaria, escanea el código y paga. La pantalla se pone
              verde sola.
            </p>
            <button className="cancelar" onClick={cancelar}>
              Cancelar
            </button>
          </div>
        ) : esQr ? (
          <div className="esperando" aria-live="polite">
            <div className="pulso" />
            <h2>Generando el QR</h2>
            <p>Un segundo. El código aparece en esta pantalla.</p>
            <button className="cancelar" onClick={cancelar}>
              Cancelar
            </button>
          </div>
        ) : (
          <div className="esperando" aria-live="polite">
            <div className="pulso" />
            <h2>Esperando al banco</h2>
            <p>
              El cobro ya salió al teléfono del cliente. No cierres esta pantalla; se marca solo.
            </p>
            <span className="folio">${pesos(venta.montoCentavos)} MXN</span>
            <button className="cancelar" onClick={cancelar}>
              Cancelar
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="marco">
      <header className="barra">
        <span className="marca">El Mostrador</span>
        <a href="/corte">Corte del día</a>
      </header>

      <div className="monto-caja">
        <div className="monto-etiqueta">Monto a cobrar</div>
        <div className="monto">
          <span className="moneda">$</span>
          <span className={centavos === 0 ? 'cero' : undefined}>{pesos(centavos)}</span>
        </div>
      </div>

      <div className="teclado">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} className="tecla" onClick={() => teclear(d)}>
            {d}
          </button>
        ))}
        <button className="tecla sutil" onClick={() => teclear('00')}>
          00
        </button>
        <button className="tecla" onClick={() => teclear('0')}>
          0
        </button>
        <button className="tecla sutil" onClick={borrar} aria-label="Borrar">
          ←
        </button>
      </div>

      <div className="metodos">
        <button className="metodo" data-on={metodo === 'codi_pn'} onClick={() => setMetodo('codi_pn')}>
          Al teléfono
          <small>El cliente recibe el cobro</small>
        </button>
        <button className="metodo" data-on={metodo === 'codi_qr'} onClick={() => setMetodo('codi_qr')}>
          QR en pantalla
          <small>El cliente escanea</small>
        </button>
      </div>

      {metodo === 'codi_pn' && (
        <div className="campo">
          <label htmlFor="tel">Teléfono</label>
          <input
            id="tel"
            inputMode="numeric"
            autoComplete="off"
            placeholder="10 dígitos"
            maxLength={10}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
        </div>
      )}

      {error && <p className="aviso">{error}</p>}

      <button className="cobrar" onClick={cobrar} disabled={enviando || centavos <= 0}>
        {enviando ? 'Enviando…' : 'Cobrar'}
      </button>

      <p className="pie">
        Sin terminal. Sin comisión en CoDi.
        <br />
        El pago se confirma solo, desde el banco.
      </p>
    </main>
  );
}
