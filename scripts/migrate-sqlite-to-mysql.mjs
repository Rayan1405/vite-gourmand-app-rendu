import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import mysql from 'mysql2/promise';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const sqlitePath = join(ROOT, 'data', 'app.db');
const mysqlSchemaPath = join(ROOT, 'db', 'schema.mysql.sql');

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '8889',
  DB_NAME,
  DB_USER = 'root',
  DB_PASSWORD = 'root'
} = process.env;

if (!DB_NAME) {
  console.error('DB_NAME manquant dans .env');
  process.exit(1);
}

const sqlite = new DatabaseSync(sqlitePath);

const mysqlConn = await mysql.createConnection({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  multipleStatements: true
});

try {
  const schemaSql = readFileSync(mysqlSchemaPath, 'utf8');
  await mysqlConn.query(schemaSql);

  const tableRows = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all();

  const tables = tableRows.map((r) => r.name);

  await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    await mysqlConn.query(`TRUNCATE TABLE \`${table}\``);
  }

  for (const table of tables) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    if (!rows.length) continue;

    const cols = Object.keys(rows[0]);
    const colSql = cols.map((c) => `\`${c}\``).join(', ');
    const placeholders = `(${cols.map(() => '?').join(', ')})`;
    const sql = `INSERT INTO \`${table}\` (${colSql}) VALUES ${rows.map(() => placeholders).join(', ')}`;
    const values = rows.flatMap((row) => cols.map((c) => row[c]));

    await mysqlConn.query(sql, values);

    const idCol = cols.includes('id') ? 'id' : null;
    if (idCol) {
      const [maxRows] = await mysqlConn.query(`SELECT MAX(\`${idCol}\`) AS max_id FROM \`${table}\``);
      const maxId = Number(maxRows[0]?.max_id || 0);
      if (maxId > 0) {
        await mysqlConn.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${maxId + 1}`);
      }
    }

    console.log(`Table migree: ${table} (${rows.length} lignes)`);
  }

  await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log(`Migration terminee vers MySQL (${DB_HOST}:${DB_PORT}/${DB_NAME})`);
} finally {
  await mysqlConn.end();
}
