import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--fuente-sans',
  display: 'swap',
});

const plex = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--fuente-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'https://mostrador.zerotwolabs.xyz'),
  title: 'El Mostrador — cobra con CoDi sin terminal',
  description:
    'Cobra con CoDi desde el celular que ya está en el mostrador. Sin terminal, sin comisión. Probado con pagos reales.',
  applicationName: 'El Mostrador',
  appleWebApp: {
    capable: true,
    title: 'El Mostrador',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'El Mostrador — la caja, en el celular del mostrador',
    description:
      'Cobra con CoDi sin terminal y sin comisión. El pago se confirma solo desde el banco del cliente.',
    type: 'website',
    locale: 'es_MX',
    siteName: 'El Mostrador',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'El Mostrador — cobra con CoDi sin terminal',
    description: 'Sin terminal, sin comisión. El pago se confirma solo desde el banco.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B3D2E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${archivo.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
