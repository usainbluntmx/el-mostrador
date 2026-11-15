/**
 * Persistencia local. SQLite con el módulo nativo de Node: cero dependencias,
 * cero instalación. La interfaz está aislada aquí para poder cambiar a
 * Postgres en producción sin tocar las rutas.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { MetodoCobro, Venta, EstadoVenta } from '@/lib/domain/venta';

let db: DatabaseSync | null = null;

function abrir(): DatabaseSync {
  if (db) return db;
  const dir = process.env.DATA_DIR || '.data';
  fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(path.join(dir, 'el-mostrador.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS ventas (
      folio           INTEGER PRIMARY KEY AUTOINCREMENT,
      monto_centavos  INTEGER NOT NULL,
      metodo          TEXT    NOT NULL,
      estado          TEXT    NOT NULL,
      concepto        TEXT    NOT NULL,
      pey_id          TEXT,
      num_ref         TEXT    NOT NULL,
      creada_en       INTEGER NOT NULL,
      pagada_en       INTEGER,
      liberada_en     INTEGER
    );
    CREATE TABLE IF NOT EXISTS eventos (
      id           TEXT PRIMARY KEY,
      tipo         TEXT NOT NULL,
      payload      TEXT NOT NULL,
      recibido_en  INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS diagnostico (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo         TEXT NOT NULL,
      detalle      TEXT,
      recibido_en  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ventas_creada ON ventas(creada_en);
  `);
  return db;
}

type Fila = {
  folio: number;
  monto_centavos: number;
  metodo: string;
  estado: string;
  concepto: string;
  pey_id: string | null;
  num_ref: string;
  creada_en: number;
  pagada_en: number | null;
  liberada_en: number | null;
};

function aVenta(f: Fila): Venta {
  return {
    folio: f.folio,
    montoCentavos: f.monto_centavos,
    metodo: f.metodo as MetodoCobro,
    estado: f.estado as EstadoVenta,
    concepto: f.concepto,
    peyId: f.pey_id,
    numRef: f.num_ref,
    creadaEn: f.creada_en,
    pagadaEn: f.pagada_en,
    liberadaEn: f.liberada_en,
  };
}

/** Crea la venta en estado `creada`; aquí todavía no se llamó a pey. */
export function crearVenta(args: {
  montoCentavos: number;
  metodo: MetodoCobro;
  concepto: string;
}): Venta {
  const d = abrir();
  const ahora = Date.now();
  const info = d
    .prepare(
      `INSERT INTO ventas (monto_centavos, metodo, estado, concepto, pey_id, num_ref, creada_en)
       VALUES (?, ?, 'creada', ?, NULL, '', ?)`,
    )
    .run(args.montoCentavos, args.metodo, args.concepto, ahora);

  const folio = Number(info.lastInsertRowid);
  const numRef = String(folio).slice(-7); // pey acepta hasta 7 dígitos
  d.prepare('UPDATE ventas SET num_ref = ? WHERE folio = ?').run(numRef, folio);

  return {
    folio,
    montoCentavos: args.montoCentavos,
    metodo: args.metodo,
    estado: 'creada',
    concepto: args.concepto,
    peyId: null,
    numRef,
    creadaEn: ahora,
    pagadaEn: null,
    liberadaEn: null,
  };
}

export function guardarVenta(v: Venta): Venta {
  abrir()
    .prepare(
      `UPDATE ventas SET estado = ?, pey_id = ?, pagada_en = ?, liberada_en = ? WHERE folio = ?`,
    )
    .run(v.estado, v.peyId, v.pagadaEn, v.liberadaEn, v.folio);
  return v;
}

export function getVenta(folio: number): Venta | null {
  const f = abrir().prepare('SELECT * FROM ventas WHERE folio = ?').get(folio) as Fila | undefined;
  return f ? aVenta(f) : null;
}

export function getVentaPorNumRef(numRef: string): Venta | null {
  const f = abrir()
    .prepare('SELECT * FROM ventas WHERE num_ref = ? ORDER BY folio DESC LIMIT 1')
    .get(numRef) as Fila | undefined;
  return f ? aVenta(f) : null;
}

/**
 * Registra el evento del webhook. Devuelve false si ya existía:
 * esa es la idempotencia real, por `webhook-id` (no por folio).
 */
export function registrarEvento(id: string, tipo: string, payload: string): boolean {
  const info = abrir()
    .prepare('INSERT OR IGNORE INTO eventos (id, tipo, payload, recibido_en) VALUES (?, ?, ?, ?)')
    .run(id, tipo, payload, Date.now());
  return info.changes > 0;
}

export type LineaCorte = { metodo: MetodoCobro; conteo: number; totalCentavos: number };
export type Corte = {
  desde: number;
  hasta: number;
  porMetodo: LineaCorte[];
  totalCentavos: number;
  ventasPagadas: number;
};

/** Corte del día por método, solo con ventas pagadas. */
export function corte(desde: number, hasta: number): Corte {
  const filas = abrir()
    .prepare(
      `SELECT metodo, COUNT(*) AS conteo, COALESCE(SUM(monto_centavos), 0) AS total
       FROM ventas
       WHERE estado IN ('pagada','liberada') AND pagada_en >= ? AND pagada_en < ?
       GROUP BY metodo`,
    )
    .all(desde, hasta) as Array<{ metodo: string; conteo: number; total: number }>;

  const porMetodo: LineaCorte[] = filas.map((f) => ({
    metodo: f.metodo as MetodoCobro,
    conteo: Number(f.conteo),
    totalCentavos: Number(f.total),
  }));

  return {
    desde,
    hasta,
    porMetodo,
    totalCentavos: porMetodo.reduce((s, l) => s + l.totalCentavos, 0),
    ventasPagadas: porMetodo.reduce((s, l) => s + l.conteo, 0),
  };
}

/** Solo para pruebas: base en memoria, sin tocar el disco. */
export function _resetParaPruebas(): void {
  db?.close();
  db = null;
}

/**
 * Deja rastro de lo que no llega a ser evento aceptado: webhooks rechazados
 * por firma y reconciliaciones que salvaron una venta. Sin esto, un
 * `eventos: 0` es indistinguible de "no llega nada".
 */
export function registrarDiagnostico(tipo: string, detalle = ''): void {
  const d = abrir();
  d.prepare('INSERT INTO diagnostico (tipo, detalle, recibido_en) VALUES (?, ?, ?)').run(
    tipo,
    detalle,
    Date.now(),
  );
  // Solo interesan los últimos 100: esto es un tablero, no un archivo histórico.
  d.exec('DELETE FROM diagnostico WHERE id NOT IN (SELECT id FROM diagnostico ORDER BY id DESC LIMIT 100)');
}

export type ConteoDiagnostico = { tipo: string; total: number; ultimoEn: number };

/** Rechazos de webhook posteriores a `desde`. Sirve para no tomar un escaneo
 *  suelto de hace diez horas como si el portal estuviera mandando firmas malas. */
export function rechazosDesde(desde: number): number {
  const fila = abrir()
    .prepare("SELECT COUNT(*) AS total FROM diagnostico WHERE tipo = 'webhook_rechazado' AND recibido_en >= ?")
    .get(desde) as { total: number } | undefined;
  return Number(fila?.total ?? 0);
}

/** Ventas que quedaron `cobrando` y llevan rato sin confirmarse: candidatas a
 *  reconciliar sin que nadie tenga la pantalla abierta. */
export function ventasPorReconciliar(antesDe: number, limite = 50): number[] {
  const filas = abrir()
    .prepare(
      `SELECT folio FROM ventas
       WHERE estado = 'cobrando' AND pey_id IS NOT NULL AND creada_en <= ?
       ORDER BY folio ASC LIMIT ?`,
    )
    .all(antesDe, limite) as Array<{ folio: number }>;
  return filas.map((f) => Number(f.folio));
}


export function conteoDiagnostico(): { conteos: ConteoDiagnostico[]; ultimoRechazo: { motivo: string; en: number } | null } {
  const d = abrir();
  const conteos = d
    .prepare('SELECT tipo, COUNT(*) AS total, MAX(recibido_en) AS ultimo_en FROM diagnostico GROUP BY tipo')
    .all() as Array<{ tipo: string; total: number; ultimo_en: number }>;

  const rechazo = d
    .prepare(
      "SELECT detalle, recibido_en FROM diagnostico WHERE tipo = 'webhook_rechazado' ORDER BY id DESC LIMIT 1",
    )
    .get() as { detalle: string | null; recibido_en: number } | undefined;

  return {
    conteos: conteos.map((c) => ({ tipo: c.tipo, total: Number(c.total), ultimoEn: Number(c.ultimo_en) })),
    ultimoRechazo: rechazo ? { motivo: rechazo.detalle ?? '', en: rechazo.recibido_en } : null,
  };
}

/** Para /api/salud: ¿está entrando el webhook o solo funciona el respaldo? */
export function salud(): {
  ventas: number;
  pagadas: number;
  eventos: number;
  ultimoEvento: { tipo: string; recibidoEn: number } | null;
  ultimaVenta: { folio: number; estado: string; creadaEn: number } | null;
} {
  const d = abrir();
  const v = d
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN estado IN ('pagada','liberada') THEN 1 ELSE 0 END),0) AS pagadas
       FROM ventas`,
    )
    .get() as { total: number; pagadas: number };
  const e = d.prepare('SELECT COUNT(*) AS total FROM eventos').get() as { total: number };
  const ultimo = d
    .prepare('SELECT tipo, recibido_en FROM eventos ORDER BY recibido_en DESC LIMIT 1')
    .get() as { tipo: string; recibido_en: number } | undefined;
  const ultima = d
    .prepare('SELECT folio, estado, creada_en FROM ventas ORDER BY folio DESC LIMIT 1')
    .get() as { folio: number; estado: string; creada_en: number } | undefined;

  return {
    ventas: Number(v.total),
    pagadas: Number(v.pagadas),
    eventos: Number(e.total),
    ultimoEvento: ultimo ? { tipo: ultimo.tipo, recibidoEn: ultimo.recibido_en } : null,
    ultimaVenta: ultima
      ? { folio: ultima.folio, estado: ultima.estado, creadaEn: ultima.creada_en }
      : null,
  };
}
