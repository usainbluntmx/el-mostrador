'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * El artefacto del hero: un ticket que cobra solo.
 *
 * No es una captura ni un video: es el flujo real de la app reducido a una
 * tarjeta —teclea el monto, espera al banco, se pone verde—. El visitante lo
 * puede volver a correr. Con `prefers-reduced-motion` arranca ya en PAGADO,
 * sin animación: el estado es la información, la animación es el adorno.
 */

type Fase = 'tecleando' | 'esperando' | 'pagado';

const MONTO = ['2', '4', '0'];
const FOLIO = '0024';

export default function TicketDemo() {
  const [fase, setFase] = useState<Fase>('tecleando');
  const [digitos, setDigitos] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const limpiar = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const correr = useCallback(() => {
    limpiar();
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducir) {
      setDigitos(MONTO.length);
      setFase('pagado');
      return;
    }

    setDigitos(0);
    setFase('tecleando');

    MONTO.forEach((_, i) => {
      timers.current.push(setTimeout(() => setDigitos(i + 1), 260 + i * 190));
    });
    timers.current.push(setTimeout(() => setFase('esperando'), 1150));
    timers.current.push(setTimeout(() => setFase('pagado'), 3050));
  }, [limpiar]);

  useEffect(() => {
    correr();
    return limpiar;
  }, [correr]);

  const monto = `${MONTO.slice(0, digitos).join('') || '0'}.00`;

  return (
    <article className="recibo ticket" aria-label="Ejemplo de un cobro de 240 pesos">
      <div className="recibo-cabecera">
        <b>El Tornillo</b>
        <span>Caja 1</span>
      </div>

      <div className="ticket-monto">
        <span>Monto a cobrar</span>
        <b className="tabular">
          <span aria-hidden="true">$ {monto}</span>
          <span className="solo-lectores">Ejemplo: 240 pesos</span>
        </b>
      </div>

      <div className="ticket-fila">
        <span>Concepto</span>
        <b>Cemento 50 kg ×2</b>
      </div>
      <div className="ticket-fila">
        <span>Folio</span>
        <b className="tabular">{FOLIO}</b>
      </div>

      <div className="ticket-estado" aria-live="polite">
        {fase === 'tecleando' && <span className="estado-texto">Tecleando el monto</span>}

        {fase === 'esperando' && (
          <>
            <span className="ticket-puntos" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="estado-texto">Esperando al banco</span>
          </>
        )}

        {fase === 'pagado' && (
          <>
            <div className="ticket-sello">
              <b>Pagado</b>
              <small>CoDi · 3 s</small>
            </div>
            <span className="ticket-comision">0% de comisión</span>
            <button type="button" className="ticket-repetir" onClick={correr}>
              Volver a ver
            </button>
          </>
        )}
      </div>

      <div className="recibo-pie">
        {fase === 'pagado' ? 'Dinero en la cuenta del negocio' : 'Sin terminal · sin comisión'}
      </div>
    </article>
  );
}
