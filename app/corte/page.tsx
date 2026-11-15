'use client';

import { useCallback, useEffect, useState } from 'react';

type Corte = {
  dia: string;
  porMetodo: Array<{ metodo: string; conteo: number; totalCentavos: number }>;
  totalCentavos: number;
  ventasPagadas: number;
  comisionEvitadaCentavos: number;
  tasaReferencia: number;
};

const NOMBRE: Record<string, string> = {
  codi_pn: 'CoDi al teléfono',
  codi_qr: 'CoDi por QR',
};

function pesos(centavos: number): string {
  return (centavos / 100).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });
}

export default function CortePage() {
  const [corte, setCorte] = useState<Corte | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/corte', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo leer el corte');
      setCorte((await res.json()) as Corte);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el corte');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const sinCobros = corte !== null && corte.porMetodo.length === 0;
  const diaLegible = corte
    ? new Date(`${corte.dia}T12:00:00`).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '—';

  return (
    <main className="marco">
      <header className="barra">
        <a className="marca" href="/">
          El Mostrador
        </a>
        <a href="/cobrar">Cobrar</a>
      </header>

      <div className="corte-head">
        <h1>Corte del día</h1>
        <span>{diaLegible} — solo ventas pagadas</span>
      </div>

      {error && (
        <p className="aviso" role="alert">
          {error}
        </p>
      )}

      {cargando && !corte && <p className="vacio">Leyendo la caja…</p>}

      {corte && (
        <>
          <div className="tarjeta">
            <div className="mini">Total cobrado</div>
            <div className="total tabular">{pesos(corte.totalCentavos)}</div>
            <div className="mini">
              {corte.ventasPagadas} {corte.ventasPagadas === 1 ? 'venta' : 'ventas'} en CoDi
            </div>
          </div>

          <div className="tarjeta">
            {sinCobros ? (
              <p className="vacio">
                Todavía no hay cobros hoy.
                <br />
                <a href="/cobrar">Abrir la caja</a>
              </p>
            ) : (
              corte.porMetodo.map((l) => (
                <div className="linea-metodo" key={l.metodo}>
                  <span>
                    {NOMBRE[l.metodo] ?? l.metodo}
                    <br />
                    <small>
                      {l.conteo} {l.conteo === 1 ? 'cobro' : 'cobros'}
                    </small>
                  </span>
                  <b>{pesos(l.totalCentavos)}</b>
                </div>
              ))
            )}
          </div>

          <div className="tarjeta ahorro">
            <div className="mini">Comisión que no se fue</div>
            <div className="total tabular">{pesos(corte.comisionEvitadaCentavos)}</div>
            <p className="mini">
              Calculado a la tasa de referencia de la terminal con IVA (
              {(corte.tasaReferencia * 100).toFixed(3)}%). Si el negocio ya tiene tarifa
              promocional, el ahorro real es menor.
            </p>
          </div>

          <button className="cancelar" onClick={() => void cargar()} disabled={cargando}>
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </>
      )}

      <p className="pie">
        El corte es del día en CDMX, no del servidor.
        <br />
        CoDi cobra sin comisión; la terminal cobra 3.6% + IVA.
      </p>
    </main>
  );
}
