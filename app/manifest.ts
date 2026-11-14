import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'El Mostrador',
    short_name: 'Mostrador',
    description: 'Cobra con CoDi desde el celular. Sin terminal, sin comisión.',
    start_url: '/cobrar',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4efe3',
    theme_color: '#0e6b4f',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
