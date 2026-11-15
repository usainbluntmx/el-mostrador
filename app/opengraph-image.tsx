import { ImageResponse } from 'next/og';

/**
 * OG 1200×630 con el mismo sistema de la landing: noche, ticket, sello verde.
 * Tipografía del sistema a propósito: `ImageResponse` no debe depender de red
 * en tiempo de build.
 */
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'El Mostrador — cobra con CoDi desde el celular del mostrador';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#101915',
          color: '#ECE4D3',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 14, height: 14, background: '#0E6B4F', borderRadius: 3 }} />
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>El Mostrador</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 74,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 0.98,
              }}
            >
              <div style={{ display: 'flex' }}>La caja, en el celular</div>
              <div style={{ display: 'flex' }}>del mostrador.</div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 30,
                color: '#A9B8AE',
                lineHeight: 1.35,
              }}
            >
              <div style={{ display: 'flex' }}>Cobra con CoDi sin terminal y sin comisión.</div>
              <div style={{ display: 'flex' }}>El pago se confirma solo desde el banco.</div>
            </div>
          </div>

          <div style={{ display: 'flex', fontSize: 22, color: '#A9B8AE' }}>
            Zero Two Labs · Hackatón México 2026
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 18,
            width: 340,
            marginLeft: 64,
            background: '#F7F1E4',
            color: '#14110D',
            borderRadius: 4,
            padding: '30px 30px 34px',
            borderTop: '6px solid #14110D',
          }}
        >
          <div style={{ display: 'flex', fontSize: 16, letterSpacing: 3, color: '#5E5648' }}>
            MONTO A COBRAR
          </div>
          <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, letterSpacing: -3 }}>
            $ 240.00
          </div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              border: '4px solid #0E6B4F',
              color: '#0B3D2E',
              borderRadius: 6,
              padding: '6px 16px',
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 4,
            }}
          >
            PAGADO
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: '#0B3D2E' }}>0% de comisión</div>
        </div>
      </div>
    ),
    size,
  );
}
