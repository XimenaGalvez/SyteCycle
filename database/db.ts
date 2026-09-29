import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('sytecycle.db');

export const generarId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
};

export const initDatabase = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS usuario (
        id_usuario TEXT PRIMARY KEY,
        nombre TEXT NOT NULL CHECK (
          LENGTH(TRIM(nombre)) >= 2
          AND nombre NOT GLOB '*[0-9]*'
        ),
        contrasena TEXT NOT NULL CHECK (LENGTH(TRIM(contrasena)) >= 4),
        fecha_nacimiento TEXT CHECK (
          fecha_nacimiento IS NULL
          OR (
            LENGTH(fecha_nacimiento) = 10
            AND fecha_nacimiento GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            AND CAST(SUBSTR(fecha_nacimiento, 6, 2) AS INTEGER) BETWEEN 1 AND 12
            AND CAST(SUBSTR(fecha_nacimiento, 9, 2) AS INTEGER) BETWEEN 1 AND 31
          )
        ),
        peso REAL CHECK (peso IS NULL OR peso > 0),
        relacion_insulina_carbohidrato REAL CHECK (
          relacion_insulina_carbohidrato IS NULL
          OR relacion_insulina_carbohidrato > 0
        ),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS insulina (
        id_insulina TEXT PRIMARY KEY,
        nombre TEXT NOT NULL CHECK (LENGTH(TRIM(nombre)) > 0),
        tipo TEXT NOT NULL CHECK (tipo IN ('Rápida', 'Lenta', 'Intermedia')),
        unidades_indicadas REAL NOT NULL CHECK (unidades_indicadas > 0),
        horario TEXT NOT NULL CHECK (
          LENGTH(horario) = 5
          AND horario GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
        caducidad TEXT CHECK (
          caducidad IS NULL
          OR (
            LENGTH(caducidad) = 10
            AND caducidad GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
          )
        ),
        notas TEXT
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medicamento (
        id_medicamento TEXT PRIMARY KEY,
        nombre TEXT NOT NULL CHECK (LENGTH(TRIM(nombre)) > 0),
        dosis TEXT NOT NULL CHECK (LENGTH(TRIM(dosis)) > 0),
        frecuencia TEXT NOT NULL CHECK (LENGTH(TRIM(frecuencia)) > 0),
        horario TEXT NOT NULL CHECK (
          LENGTH(horario) = 5
          AND horario GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
        caducidad TEXT CHECK (
          caducidad IS NULL
          OR (
            LENGTH(caducidad) = 10
            AND caducidad GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
          )
        ),
        indicaciones TEXT,
        activo INTEGER DEFAULT 1 CHECK (activo IN (0, 1))
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS aplicacion_insulina (
        id_aplicacion_insulina TEXT PRIMARY KEY,
        insulina_id TEXT NOT NULL,
        unidades REAL NOT NULL CHECK (unidades > 0),
        fecha TEXT NOT NULL CHECK (
          LENGTH(fecha) = 10
          AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        ),
        hora TEXT NOT NULL CHECK (
          LENGTH(hora) = 5
          AND hora GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
        zona TEXT NOT NULL CHECK (zona IN ('abdomen', 'brazo', 'muslo')),
        sitio_detalle TEXT,
        notas TEXT,
        FOREIGN KEY (insulina_id) REFERENCES insulina (id_insulina)
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS toma_medicamento (
        id_toma_medicamento TEXT PRIMARY KEY,
        medicamento_id TEXT NOT NULL,
        fecha TEXT NOT NULL CHECK (
          LENGTH(fecha) = 10
          AND fecha GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        ),
        hora TEXT NOT NULL CHECK (
          LENGTH(hora) = 5
          AND hora GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
        estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (
          estado IN ('Pendiente', 'Realizado', 'Omitido')
        ),
        notas TEXT,
        FOREIGN KEY (medicamento_id) REFERENCES medicamento (id_medicamento)
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recordatorio (
        id_recordatorio TEXT PRIMARY KEY,
        tipo TEXT NOT NULL CHECK (tipo IN ('Insulina', 'Medicamento', 'Caducidad')),
        referencia_id TEXT NOT NULL,
        hora TEXT NOT NULL CHECK (
          LENGTH(hora) = 5
          AND hora GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
        activo INTEGER DEFAULT 1 CHECK (activo IN (0, 1)),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Base de datos SyteCycle inicializada');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }
};