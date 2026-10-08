import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const databasePath = path.join(
  dataDir,
  "mineblast.db"
);

const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS vales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    registro_uuid TEXT NOT NULL UNIQUE,

    numero_vale TEXT NOT NULL UNIQUE,

    fecha_vale TEXT NOT NULL,
    fecha_disparo TEXT,

    turno TEXT NOT NULL,
    sector TEXT,
    labor TEXT NOT NULL,
    nivel TEXT,

    tipo TEXT,
    tipo_diagrama TEXT,

    supervisor TEXT,

    estado TEXT NOT NULL DEFAULT 'PENDIENTE',

    fuente_origen TEXT NOT NULL DEFAULT 'MINEBLAST_APP',

    sincronizado INTEGER NOT NULL DEFAULT 0,

    fecha_sincronizacion TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );


  CREATE TABLE IF NOT EXISTS vale_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    registro_uuid TEXT NOT NULL UNIQUE,

    vale_id INTEGER NOT NULL,

    explosivo TEXT NOT NULL,

    cantidad REAL NOT NULL DEFAULT 0,

    unidad TEXT,

    lote TEXT,

    sincronizado INTEGER NOT NULL DEFAULT 0,

    fecha_sincronizacion TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (vale_id)
      REFERENCES vales(id)
      ON DELETE CASCADE
  );


  CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    registro_uuid TEXT NOT NULL UNIQUE,

    fecha TEXT NOT NULL,

    tipo_movimiento TEXT NOT NULL,

    explosivo TEXT NOT NULL,

    cantidad REAL NOT NULL,

    unidad TEXT,

    lote TEXT,

    vale_id INTEGER,

    observacion TEXT,

    proveedor TEXT,

    documento_referencia TEXT,

    responsable TEXT,

    fuente_origen TEXT NOT NULL DEFAULT 'MINEBLAST_APP',

    sincronizado INTEGER NOT NULL DEFAULT 0,

    fecha_sincronizacion TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (vale_id)
      REFERENCES vales(id)
  );


  CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    explosivo TEXT NOT NULL,

    lote TEXT,

    unidad TEXT,

    stock_actual REAL NOT NULL DEFAULT 0,

    actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(explosivo, lote)
  );


  CREATE TABLE IF NOT EXISTS conciliaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    registro_uuid TEXT NOT NULL UNIQUE,

    fecha TEXT NOT NULL,

    explosivo TEXT NOT NULL,

    lote TEXT NOT NULL,

    unidad TEXT,

    stock_sistema REAL NOT NULL,

    stock_fisico REAL NOT NULL,

    diferencia REAL NOT NULL,

    responsable TEXT,

    observacion TEXT,

    estado TEXT NOT NULL DEFAULT 'REGISTRADA',

    ajuste_generado INTEGER NOT NULL DEFAULT 0,

    sincronizado INTEGER NOT NULL DEFAULT 0,

    fecha_sincronizacion TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );


  CREATE TABLE IF NOT EXISTS sincronizacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    entidad TEXT NOT NULL,

    registro_id INTEGER NOT NULL,

    registro_uuid TEXT NOT NULL,

    operacion TEXT NOT NULL,

    estado TEXT NOT NULL DEFAULT 'PENDIENTE',

    intentos INTEGER NOT NULL DEFAULT 0,

    ultimo_error TEXT,

    creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    sincronizado_en TEXT,

    UNIQUE(entidad, registro_uuid, operacion)
  );


  CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    registro_uuid TEXT NOT NULL UNIQUE,

    usuario TEXT,

    accion TEXT NOT NULL,

    entidad TEXT NOT NULL,

    registro_id INTEGER,

    detalle TEXT,

    fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;