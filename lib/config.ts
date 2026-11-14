/**
 * El Mostrador — capa de configuración.
 * Falla temprano y con mensaje claro: en un demo no quieres descubrir
 * que falta la API key hasta que el cliente ya está en el mostrador.
 */

export type Config = {
  peyApiKey: string;
  peyWebhookSecret: string;
  peyBaseUrl: string;
  negocioNombre: string;
  dataDir: string;
};

function requerido(nombre: string): string {
  const v = process.env[nombre];
  if (!v || v.trim() === '') {
    throw new Error(
      `Falta ${nombre} en el entorno. Copia .env.example a .env.local y llena el valor.`,
    );
  }
  return v.trim();
}

export function getConfig(): Config {
  return {
    peyApiKey: requerido('PEY_API_KEY'),
    peyWebhookSecret: requerido('PEY_WEBHOOK_SECRET'),
    peyBaseUrl: (process.env.PEY_BASE_URL || 'https://api.pey.mx').replace(/\/$/, ''),
    negocioNombre: process.env.NEGOCIO_NOMBRE || 'El Mostrador',
    dataDir: process.env.DATA_DIR || '.data',
  };
}

/** Para pruebas y para el corte: no exige la API key. */
export function negocioNombre(): string {
  return process.env.NEGOCIO_NOMBRE || 'El Mostrador';
}
