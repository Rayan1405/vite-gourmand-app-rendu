import 'dotenv/config';
import { createServer } from 'node:http';
import { readFileSync, existsSync, createReadStream, mkdirSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { MongoClient } from 'mongodb';
import mysql from 'mysql2/promise';
import { initMailer, verifyMailer, sendMail, welcomeMail, resetPasswordMail, orderConfirmationMail, orderStatusMail, materialReturnMail, employeeCreatedMail, contactReceivedMail } from './mailer.mjs';

const PORT = process.env.PORT || 3000;
const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const DB_PATH = process.env.SQLITE_DB_PATH || join(ROOT, 'data/app.db');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'vite_gourmand';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'order_analytics';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false') === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || 'no-reply@vitegourmand.fr';
const MAIL_TO = process.env.MAIL_TO || 'contact@vitegourmand.fr';
const SMTP_FORCE_IPV4 = String(process.env.SMTP_FORCE_IPV4 || (process.env.RENDER ? 'true' : 'false')) === 'true';
const DB_HOST = process.env.DB_HOST || '';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_NAME = process.env.DB_NAME || '';
const DB_USER = process.env.DB_USER || '';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
let USE_MYSQL = Boolean(DB_NAME && DB_HOST && DB_USER);

let sqliteDb;
let sqliteDbPath = DB_PATH;
let mysqlPool;

const sessions = new Map();

const ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'delivering',
  'delivered',
  'awaiting_material_return',
  'finished',
  'cancelled'
];
const GEO_CACHE = new Map();
function authorSqlExpr() {
  return USE_MYSQL
    ? "CONCAT(u.first_name, ' ', LEFT(u.last_name, 1), '.')"
    : "u.first_name || ' ' || substr(u.last_name,1,1) || '.'";
}

function allergensSqlExpr() {
  return USE_MYSQL
    ? "GROUP_CONCAT(a.name SEPARATOR ', ')"
    : "GROUP_CONCAT(a.name, ', ')";
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Charge utile trop volumineuse'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(body));
      } catch {
        reject(new Error('JSON invalide'));
      }
    });
  });
}

function hashPassword(password) {
  const salt = randomUUID();
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, fullHash) {
  const [salt, hash] = fullHash.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const testBuffer = scryptSync(password, salt, 64);
  return hashBuffer.length === testBuffer.length && timingSafeEqual(hashBuffer, testBuffer);
}

function validatePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/.test(password);
}

async function initRelationalDb() {
  if (USE_MYSQL) {
    try {
      mysqlPool = mysql.createPool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 8
      });
      const schemaSql = readFileSync(join(ROOT, 'db/schema.mysql.sql'), 'utf8');
      const conn = await mysqlPool.getConnection();
      try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const stmt of schemaSql.split(';')) {
          const sql = stmt.trim();
          if (sql) await conn.query(sql);
        }
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      } finally {
        conn.release();
      }
      console.log(`Base relationnelle active: MySQL (${DB_HOST}:${DB_PORT}/${DB_NAME})`);
      return;
    } catch (error) {
      USE_MYSQL = false;
      if (mysqlPool) {
        try {
          await mysqlPool.end();
        } catch {}
      }
      mysqlPool = null;
      console.error('MySQL indisponible, bascule sur SQLite.', error.message);
    }
  }

  try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    sqliteDb = new DatabaseSync(DB_PATH);
    sqliteDbPath = DB_PATH;
  } catch (error) {
    const fallbackPath = join('/tmp', 'vite-gourmand', 'app.db');
    mkdirSync(dirname(fallbackPath), { recursive: true });
    sqliteDb = new DatabaseSync(fallbackPath);
    sqliteDbPath = fallbackPath;
    console.warn(`Chemin SQLite non accessible (${DB_PATH}). Bascule sur ${fallbackPath}.`, error.message);
  }
  sqliteDb.exec(readFileSync(join(ROOT, 'db/schema.sql'), 'utf8'));
  console.log(`Base relationnelle active: SQLite (${sqliteDbPath})`);
}

async function run(query, ...params) {
  if (USE_MYSQL) {
    const [result] = await mysqlPool.query(query, params);
    return {
      lastInsertRowid: Number(result.insertId || 0),
      changes: Number(result.affectedRows || 0)
    };
  }
  return sqliteDb.prepare(query).run(...params);
}

async function get(query, ...params) {
  if (USE_MYSQL) {
    const [rows] = await mysqlPool.query(query, params);
    return rows[0] || null;
  }
  return sqliteDb.prepare(query).get(...params);
}

async function all(query, ...params) {
  if (USE_MYSQL) {
    const [rows] = await mysqlPool.query(query, params);
    return rows;
  }
  return sqliteDb.prepare(query).all(...params);
}

let mongoClient;
let mongoAnalyticsCollection;
let mongoConnecting = false;
let mongoRetryTimer;
const MONGO_RETRY_MS = 10_000;

async function initMongo() {
  if (mongoAnalyticsCollection || mongoConnecting) return;
  mongoConnecting = true;

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 2000,
    connectTimeoutMS: 2000
  });
  try {
    await client.connect();
    const dbMongo = client.db(MONGODB_DB);
    const collection = dbMongo.collection(MONGODB_COLLECTION);
    await collection.createIndex({ createdAt: -1 });
    await collection.createIndex({ menuId: 1 });
    mongoClient = client;
    mongoAnalyticsCollection = collection;
    console.log(`MongoDB connecte: ${MONGODB_URI} / ${MONGODB_DB}.${MONGODB_COLLECTION}`);
  } catch (error) {
    try {
      await client.close();
    } catch {}
    throw error;
  } finally {
    mongoConnecting = false;
  }
}

function startMongoInBackground() {
  initMongo().catch((error) => {
    console.error('MongoDB non connecte. Les stats NoSQL seront indisponibles.', error.message);
  });

  if (mongoRetryTimer) return;
  mongoRetryTimer = setInterval(() => {
    if (!mongoAnalyticsCollection) {
      initMongo().catch(() => {});
    }
  }, MONGO_RETRY_MS);
}

async function logOrderAnalytics(order) {
  if (!mongoAnalyticsCollection) return;
  try {
    await mongoAnalyticsCollection.insertOne(order);
  } catch {
    mongoAnalyticsCollection = null;
  }
}

function sendMailInBackground(to, payload, context = '') {
  Promise.resolve(sendMail(to, payload))
    .then((ok) => {
      if (!ok) {
        const suffix = context ? ` (${context})` : '';
        console.warn(`Email non envoye${suffix} -> ${to}`);
      }
    })
    .catch((error) => {
      const suffix = context ? ` (${context})` : '';
      console.error(`Erreur envoi email${suffix}:`, error.message);
    });
}

async function getOrdersPerMenuStats() {
  if (!mongoAnalyticsCollection) return [];
  return mongoAnalyticsCollection.aggregate([
    {
      $group: {
        _id: { menuId: '$menuId', menuTitle: '$menuTitle' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        menuId: '$_id.menuId',
        menuTitle: '$_id.menuTitle',
        count: 1
      }
    },
    { $sort: { count: -1 } }
  ]).toArray();
}

async function ensureSeedData() {
  const countRow = await get('SELECT COUNT(*) as count FROM users');
  const userCount = Number(countRow?.count || 0);
  if (userCount > 0) return;

  await run(
    `INSERT INTO users (role, first_name, last_name, phone, email, address, password_hash)
    VALUES ('admin','Julie','Admin','0600000001','admin@vitegourmand.fr','Bordeaux', ?)` ,
    hashPassword('Admin!12345')
  );
  await run(
    `INSERT INTO users (role, first_name, last_name, phone, email, address, password_hash)
    VALUES ('employee','Jose','Employe','0600000002','employee@vitegourmand.fr','Bordeaux', ?)` ,
    hashPassword('Employe!12345')
  );
  await run(
    `INSERT INTO users (role, first_name, last_name, phone, email, address, password_hash)
    VALUES ('user','Client','Demo','0600000003','user@vitegourmand.fr','Bordeaux', ?)` ,
    hashPassword('User!123456')
  );
  await run(
    `INSERT INTO users (role, first_name, last_name, phone, email, address, password_hash)
    VALUES ('admin','Rayan','Admin','0600000004','rayan@vitegourmand.fr','Bordeaux', ?)` ,
    hashPassword('TestAdmin!12345')
  );


  await run(
    `INSERT INTO menus (title, description, theme, diet, min_people, min_price, conditions_text, stock, image_url)
     VALUES ('Menu Noel Prestige','Menu festif complet avec produits de saison','Noel','classique',8,240,
     'Commande minimum 7 jours avant la prestation. Conservation au frais 4°C.',15,
     'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1200&q=80')`
  );

  await run(
    `INSERT INTO menus (title, description, theme, diet, min_people, min_price, conditions_text, stock, image_url)
     VALUES ('Menu Vegan Printemps','Menu vegetal leger et gourmand','Paques','vegan',6,180,
     'Commande minimum 4 jours avant la prestation. Eviter exposition au soleil.',10,
     'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80')`
  );

  await run(`INSERT INTO dishes (name, course_type) VALUES ('Veloute de champignons','starter')`);
  await run(`INSERT INTO dishes (name, course_type) VALUES ('Dinde farcie','main')`);
  await run(`INSERT INTO dishes (name, course_type) VALUES ('Buche chocolat','dessert')`);
  await run(`INSERT INTO dishes (name, course_type) VALUES ('Salade quinoa agrumes','starter')`);
  await run(`INSERT INTO dishes (name, course_type) VALUES ('Lentilles coco curry','main')`);
  await run(`INSERT INTO dishes (name, course_type) VALUES ('Mousse coco mangue','dessert')`);

  await run(`INSERT INTO allergens (name) VALUES ('gluten')`);
  await run(`INSERT INTO allergens (name) VALUES ('lait')`);
  await run(`INSERT INTO allergens (name) VALUES ('fruits a coque')`);

  await run(`INSERT INTO menu_dishes (menu_id, dish_id) VALUES (1,1),(1,2),(1,3),(2,4),(2,5),(2,6)`);
  await run(`INSERT INTO dish_allergens (dish_id, allergen_id) VALUES (1,1),(3,2),(3,3)`);
}

async function getAuthUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  const user = await get('SELECT id, role, first_name, last_name, email, phone, address, is_active FROM users WHERE id = ?', session.userId);
  if (!user || user.is_active === 0) return null;
  return user;
}

function requireRole(user, roles) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  return roles.map((r) => String(r).toLowerCase()).includes(role);
}

function isInternalRole(role) {
  return ['admin', 'employee'].includes(String(role || '').toLowerCase());
}

const BORDEAUX_COORDS = { lat: 44.8378, lon: -0.5792 };
const CITY_COORDS = {
  bordeaux: BORDEAUX_COORDS,
  merignac: { lat: 44.8424, lon: -0.6458 },
  pessac: { lat: 44.8067, lon: -0.6324 },
  talence: { lat: 44.8026, lon: -0.5893 },
  begles: { lat: 44.8086, lon: -0.5508 },
  cenon: { lat: 44.8587, lon: -0.5316 },
  floirac: { lat: 44.8346, lon: -0.5212 },
  eysines: { lat: 44.8835, lon: -0.6529 },
  bruges: { lat: 44.884, lon: -0.6132 },
  libourne: { lat: 44.9145, lon: -0.2418 },
  arcachon: { lat: 44.6525, lon: -1.1661 },
  paris: { lat: 48.8566, lon: 2.3522 },
  lyon: { lat: 45.764, lon: 4.8357 },
  marseille: { lat: 43.2965, lon: 5.3698 },
  toulouse: { lat: 43.6047, lon: 1.4442 },
  nantes: { lat: 47.2184, lon: -1.5536 },
  lille: { lat: 50.6292, lon: 3.0573 },
  strasbourg: { lat: 48.5734, lon: 7.7521 },
  rennes: { lat: 48.1173, lon: -1.6778 },
  nice: { lat: 43.7102, lon: 7.262 },
  montpellier: { lat: 43.6119, lon: 3.8772 },
  amiens: { lat: 49.8942, lon: 2.2958 },
  nimes: { lat: 43.8367, lon: 4.36 },
  reims: { lat: 49.2583, lon: 4.0317 },
  'saint etienne': { lat: 45.4397, lon: 4.3872 },
  toulon: { lat: 43.1242, lon: 5.928 },
  grenoble: { lat: 45.1885, lon: 5.7245 },
  dijon: { lat: 47.322, lon: 5.0415 },
  angers: { lat: 47.4784, lon: -0.5632 },
  villeurbanne: { lat: 45.766, lon: 4.88 },
  'le mans': { lat: 48.0061, lon: 0.1996 },
  'aix en provence': { lat: 43.5297, lon: 5.4474 },
  brest: { lat: 48.3904, lon: -4.4861 },
  'clermont ferrand': { lat: 45.7772, lon: 3.087 },
  limoges: { lat: 45.8336, lon: 1.2611 },
  tours: { lat: 47.3941, lon: 0.6848 },
  metz: { lat: 49.1193, lon: 6.1757 },
  besancon: { lat: 47.2378, lon: 6.0241 },
  perpignan: { lat: 42.6887, lon: 2.8948 },
  orleans: { lat: 47.9029, lon: 1.9093 },
  mulhouse: { lat: 47.7508, lon: 7.3359 },
  rouen: { lat: 49.4431, lon: 1.0993 },
  caen: { lat: 49.1829, lon: -0.3707 },
  nancy: { lat: 48.6921, lon: 6.1844 },
  argenteuil: { lat: 48.9472, lon: 2.2467 },
  montreuil: { lat: 48.8638, lon: 2.4485 },
  roubaix: { lat: 50.6927, lon: 3.1778 },
  avignon: { lat: 43.9493, lon: 4.8055 },
  poitiers: { lat: 46.5802, lon: 0.3404 },
  dunkerque: { lat: 51.0344, lon: 2.3768 },
  tourcoing: { lat: 50.7239, lon: 3.1612 },
  'asnieres sur seine': { lat: 48.9109, lon: 2.2887 },
  courbevoie: { lat: 48.8973, lon: 2.2525 },
  versailles: { lat: 48.8049, lon: 2.1204 },
  pau: { lat: 43.2951, lon: -0.3708 },
  'la rochelle': { lat: 46.1603, lon: -1.1511 },
  annecy: { lat: 45.8992, lon: 6.1294 },
  chambery: { lat: 45.5646, lon: 5.9178 },
  valence: { lat: 44.9334, lon: 4.8924 },
  vannes: { lat: 47.6582, lon: -2.7608 },
  quimper: { lat: 47.9975, lon: -4.0979 },
  bayonne: { lat: 43.4929, lon: -1.4748 },
  colmar: { lat: 48.079, lon: 7.3585 },
  'saint denis': { lat: 48.9362, lon: 2.3574 }
};

function normalizeCityName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return earthRadiusKm * c;
}

async function geocodeCityCoords(city) {
  const normalized = normalizeCityName(city);
  if (!normalized) return null;

  if (CITY_COORDS[normalized]) return CITY_COORDS[normalized];
  if (GEO_CACHE.has(normalized)) return GEO_CACHE.get(normalized);

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=fr&q=${encodeURIComponent(city)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'vite-gourmand-app/1.0 (local dev)',
        'Accept-Language': 'fr'
      }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return null;

    const lat = Number(rows[0]?.lat);
    const lon = Number(rows[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const coords = { lat, lon };
    GEO_CACHE.set(normalized, coords);
    return coords;
  } catch {
    return null;
  }
}

async function estimateDistanceKmFromCity(city) {
  const normalized = normalizeCityName(city);
  if (!normalized || normalized === 'bordeaux') return 0;
  const fallbackCoords = CITY_COORDS[normalized] || null;
  if (fallbackCoords) {
    return Number(haversineKm(BORDEAUX_COORDS, fallbackCoords).toFixed(1));
  }

  const geocodedCoords = await geocodeCityCoords(city);
  if (geocodedCoords) {
    return Number(haversineKm(BORDEAUX_COORDS, geocodedCoords).toFixed(1));
  }

  return 20;
}

async function computeDeliveryDetails(city) {
  const normalized = normalizeCityName(city);
  if (!normalized || normalized === 'bordeaux') {
    return { distanceKm: 0, deliveryPrice: 0 };
  }
  const distanceKm = await estimateDistanceKmFromCity(city);
  const deliveryPrice = Number((5 + (Math.max(0, Number(distanceKm) || 0) * 0.59)).toFixed(2));
  return { distanceKm, deliveryPrice };
}

function computeMenuPrice(minPeople, minPrice, peopleCount) {
  const safePeople = Math.max(minPeople, peopleCount);
  const perHead = minPrice / minPeople;
  let price = perHead * safePeople;
  if (safePeople >= minPeople + 5) {
    price *= 0.9;
  }
  return Number(price.toFixed(2));
}

function resolveMenuImageUrl(imageUrl, theme = '', diet = '', title = '') {
  const FOOD_IMAGES = {
    noel: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1200&q=80',
    paques: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=80',
    vegan: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    vegetarien: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=80',
    classique: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    evenement: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
    defaut: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80'
  };

  const raw = String(imageUrl || '').trim();
  if (raw) {
    const lower = raw.toLowerCase();
    if (lower.includes('/images/menu-noel.svg') || lower.includes('photo-1514516345957') || lower.includes('5638732')) return FOOD_IMAGES.noel;
    if (lower.includes('/images/menu-paques.svg')) return FOOD_IMAGES.paques;
    if (lower.includes('/images/menu-vegan.svg') || lower.includes('photo-1546069901') || lower.includes('1640777')) return FOOD_IMAGES.vegan;
    if (lower.includes('/images/menu-vegetarien.svg')) return FOOD_IMAGES.vegetarien;
    if (lower.includes('/images/menu-classique.svg') || lower.includes('1279330')) return FOOD_IMAGES.classique;
    if (lower.includes('/images/menu-evenement.svg')) return FOOD_IMAGES.evenement;
    if (lower.includes('/images/menu-default.svg')) return FOOD_IMAGES.defaut;
    if (raw.startsWith('./images/')) return raw.slice(1);
    if (raw.startsWith('/images/')) return raw;
    return raw;
  }

  const text = `${theme} ${diet} ${title}`.toLowerCase();

  if (text.includes('noel')) return FOOD_IMAGES.noel;
  if (text.includes('paques') || text.includes('printemps')) return FOOD_IMAGES.paques;
  if (text.includes('vegan')) return FOOD_IMAGES.vegan;
  if (text.includes('vegetarien')) return FOOD_IMAGES.vegetarien;
  if (text.includes('classique')) return FOOD_IMAGES.classique;
  if (text.includes('evenement')) return FOOD_IMAGES.evenement;

  return FOOD_IMAGES.defaut;
}

function routeNotFound(res) {
  json(res, 404, { error: 'Route introuvable' });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname.startsWith('/api/')) {
      const user = await getAuthUser(req);

      if (req.method === 'POST' && url.pathname === '/api/auth/register') {
        const body = await parseBody(req);
        const required = ['firstName', 'lastName', 'phone', 'email', 'address', 'password'];
        for (const field of required) {
          if (!body[field]) return json(res, 400, { error: `Champ manquant : ${field}` });
        }
        if (!validatePassword(body.password)) {
          return json(res, 400, { error: 'Mot de passe non conforme (min 10 caracteres + maj/min/chiffre/special)' });
        }
        try {
          const result = await run(
            `INSERT INTO users (role, first_name, last_name, phone, email, address, password_hash)
             VALUES ('user', ?, ?, ?, ?, ?, ?)`,
            body.firstName,
            body.lastName,
            body.phone,
            body.email.toLowerCase(),
            body.address,
            hashPassword(body.password)
          );
          await sendMail(body.email.toLowerCase(), welcomeMail(body.firstName));
          return json(res, 201, { message: 'Compte cree. Un email de bienvenue a ete envoye.', userId: Number(result.lastInsertRowid) });
        } catch {
          return json(res, 409, { error: 'Email deja utilise' });
        }
      }

      if (req.method === 'POST' && url.pathname === '/api/auth/login') {
        const body = await parseBody(req);
        const account = await get('SELECT * FROM users WHERE email = ?', (body.email || '').toLowerCase());
        if (!account || account.is_active === 0) return json(res, 401, { error: 'Identifiants invalides' });
        if (!verifyPassword(body.password || '', account.password_hash)) return json(res, 401, { error: 'Identifiants invalides' });

        const token = randomUUID();
        sessions.set(token, { userId: account.id, role: account.role });
        return json(res, 200, {
          token,
          user: {
            id: account.id,
            role: account.role,
            firstName: account.first_name,
            lastName: account.last_name,
            email: account.email,
            phone: account.phone,
            address: account.address
          }
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/auth/forgot-password') {
        const body = await parseBody(req);
        if (!body.email) return json(res, 400, { error: 'Email requis' });

        const account = await get('SELECT id, email FROM users WHERE email = ?', String(body.email).toLowerCase());
        if (account) {
          await sendMail(account.email, resetPasswordMail());
        }

        return json(res, 200, { message: 'Si le compte existe, un email de reinitialisation a ete envoye.' });
      }

      if (req.method === 'GET' && url.pathname === '/api/auth/me') {
        if (!user) return json(res, 401, { error: 'Non authentifie' });
        return json(res, 200, { user });
      }

      if (req.method === 'GET' && url.pathname === '/api/home/reviews') {
        const reviews = await all(
          `SELECT r.id, r.rating, r.comment, r.created_at, ${authorSqlExpr()} as author
           FROM reviews r
           JOIN users u ON u.id = r.user_id
           WHERE r.is_approved = 1
           ORDER BY r.created_at DESC LIMIT 10`
        );
        return json(res, 200, { reviews });
      }

      if (req.method === 'GET' && url.pathname === '/api/delivery-estimate') {
        const city = String(url.searchParams.get('city') || '').trim();
        if (!city) return json(res, 400, { error: 'Ville requise' });
        const details = await computeDeliveryDetails(city);
        return json(res, 200, {
          city,
          distanceKm: details.distanceKm,
          deliveryPrice: details.deliveryPrice
        });
      }

      if (req.method === 'GET' && url.pathname === '/api/menus') {
        const clauses = [];
        const params = [];

        if (url.searchParams.get('maxPrice')) {
          clauses.push('m.min_price <= ?');
          params.push(Number(url.searchParams.get('maxPrice')));
        }

        if (url.searchParams.get('minPrice') && url.searchParams.get('maxRangePrice')) {
          clauses.push('m.min_price BETWEEN ? AND ?');
          params.push(Number(url.searchParams.get('minPrice')));
          params.push(Number(url.searchParams.get('maxRangePrice')));
        }

        if (url.searchParams.get('theme')) {
          clauses.push('LOWER(m.theme) = LOWER(?)');
          params.push(url.searchParams.get('theme'));
        }

        if (url.searchParams.get('diet')) {
          clauses.push('LOWER(m.diet) = LOWER(?)');
          params.push(url.searchParams.get('diet'));
        }

        if (url.searchParams.get('minPeople')) {
          clauses.push('m.min_people >= ?');
          params.push(Number(url.searchParams.get('minPeople')));
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const menus = await all(
          `SELECT m.id, m.title, m.description, m.theme, m.diet, m.min_people, m.min_price, m.stock, m.image_url
           FROM menus m
           ${where}
           ORDER BY m.id DESC`,
          ...params
        );
        return json(res, 200, { menus });
      }

      const menuDetailMatch = url.pathname.match(/^\/api\/menus\/(\d+)$/);
      if (req.method === 'GET' && menuDetailMatch) {
        const id = Number(menuDetailMatch[1]);
        const menu = await get('SELECT * FROM menus WHERE id = ?', id);
        if (!menu) return json(res, 404, { error: 'Menu introuvable' });

        const dishes = await all(
          `SELECT d.id, d.name, d.course_type,
            ${allergensSqlExpr()} as allergens
           FROM menu_dishes md
           JOIN dishes d ON d.id = md.dish_id
           LEFT JOIN dish_allergens da ON da.dish_id = d.id
           LEFT JOIN allergens a ON a.id = da.allergen_id
           WHERE md.menu_id = ?
           GROUP BY d.id
           ORDER BY d.course_type`,
          id
        );

        return json(res, 200, { menu, dishes });
      }

      if (req.method === 'POST' && url.pathname === '/api/orders') {
        if (!requireRole(user, ['user'])) return json(res, 403, { error: 'Acces refuse' });
        const body = await parseBody(req);

        const menu = await get('SELECT * FROM menus WHERE id = ?', Number(body.menuId));
        if (!menu) return json(res, 404, { error: 'Menu introuvable' });
        if (menu.stock <= 0) return json(res, 400, { error: 'Stock indisponible' });

        const peopleCount = Number(body.peopleCount);
        if (!Number.isFinite(peopleCount) || peopleCount < menu.min_people) {
          return json(res, 400, { error: `Minimum ${menu.min_people} personnes` });
        }

        const deliveryDetails = await computeDeliveryDetails(body.eventCity);
        const estimatedDistanceKm = deliveryDetails.distanceKm;
        const deliveryPrice = deliveryDetails.deliveryPrice;
        const menuPrice = computeMenuPrice(menu.min_people, menu.min_price, peopleCount);
        const totalPrice = Number((menuPrice + deliveryPrice).toFixed(2));

        const result = await run(
          `INSERT INTO orders (
             user_id, menu_id, people_count, event_address, event_city, event_date,
             delivery_time, distance_km, menu_price, delivery_price, total_price, status, material_loaned
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          user.id,
          menu.id,
          peopleCount,
          body.eventAddress,
          body.eventCity,
          body.eventDate,
          body.deliveryTime,
          estimatedDistanceKm,
          menuPrice,
          deliveryPrice,
          totalPrice,
          body.materialLoaned ? 1 : 0
        );

        const orderId = Number(result.lastInsertRowid);
        await run('UPDATE menus SET stock = stock - 1 WHERE id = ?', menu.id);
        await run('INSERT INTO order_status_history (order_id, status, changed_by_user_id) VALUES (?, ?, ?)', orderId, 'pending', user.id);

        await logOrderAnalytics({
          orderId,
          menuId: menu.id,
          menuTitle: menu.title,
          totalPrice,
          createdAt: new Date().toISOString()
        });

        sendMailInBackground(user.email, orderConfirmationMail({
          orderId,
          menuTitle: menu.title,
          totalPrice,
          deliveryPrice,
          menuPrice,
          eventDate: body.eventDate,
          deliveryTime: body.deliveryTime
        }), 'confirmation commande');
        return json(res, 201, { orderId, menuPrice, deliveryPrice, totalPrice, status: 'pending', message: 'Commande validee. Un email de confirmation a ete envoye.' });
      }

      if (req.method === 'GET' && url.pathname === '/api/users/me/orders') {
        if (!requireRole(user, ['user'])) return json(res, 403, { error: 'Acces refuse' });
        const orders = await all(
          `SELECT o.*, m.title as menu_title
           FROM orders o
           JOIN menus m ON m.id = o.menu_id
           WHERE o.user_id = ?
           ORDER BY o.created_at DESC`,
          user.id
        );
        return json(res, 200, { orders });
      }

      const orderUpdateMatch = url.pathname.match(/^\/api\/orders\/(\d+)$/);
      if (req.method === 'PATCH' && orderUpdateMatch) {
        const orderId = Number(orderUpdateMatch[1]);
        const body = await parseBody(req);
        const order = await get('SELECT * FROM orders WHERE id = ?', orderId);
        if (!order) return json(res, 404, { error: 'Commande introuvable' });

        if (requireRole(user, ['user'])) {
          if (order.user_id !== user.id) return json(res, 403, { error: 'Acces refuse' });
          if (['accepted', 'preparing', 'delivering', 'delivered', 'awaiting_material_return', 'finished'].includes(order.status)) {
            return json(res, 400, { error: 'Commande non modifiable a ce stade' });
          }

          if (body.cancel === true) {
            await run('UPDATE orders SET status = ?, cancel_reason = ? WHERE id = ?', 'cancelled', body.reason || 'Annulation client', orderId);
            await run('INSERT INTO order_status_history (order_id, status, changed_by_user_id) VALUES (?, ?, ?)', orderId, 'cancelled', user.id);
            if (order.status !== 'cancelled') {
              await run('UPDATE menus SET stock = stock + 1 WHERE id = ?', order.menu_id);
            }
            return json(res, 200, { message: 'Commande annulee' });
          }

          const eventAddress = body.eventAddress || order.event_address;
          const eventCity = body.eventCity || order.event_city;
          const eventDate = body.eventDate || order.event_date;
          const deliveryTime = body.deliveryTime || order.delivery_time;

          await run(
            `UPDATE orders SET event_address = ?, event_city = ?, event_date = ?, delivery_time = ?
             WHERE id = ?`,
            eventAddress,
            eventCity,
            eventDate,
            deliveryTime,
            orderId
          );
          return json(res, 200, { message: 'Commande modifiee' });
        }

        if (requireRole(user, ['employee', 'admin'])) {
          const nextStatus = String(body.status || '').trim();
          if (!ORDER_STATUSES.includes(nextStatus)) {
            return json(res, 400, { error: 'Statut invalide' });
          }

          const materialLoaned = Number(order.material_loaned) === 1;
          if (nextStatus === 'awaiting_material_return' && !materialLoaned) {
            return json(res, 400, { error: 'Retour materiel reserve aux commandes avec materiel prete.' });
          }
          if (nextStatus === 'finished') {
            if (materialLoaned && order.status !== 'awaiting_material_return') {
              return json(res, 400, { error: 'Commande terminee possible uniquement apres le statut retour materiel.' });
            }
            if (!materialLoaned && order.status !== 'delivered') {
              return json(res, 400, { error: 'Commande terminee possible uniquement apres livraison.' });
            }
          }

          let cancelReason = null;
          if (nextStatus === 'cancelled') {
            const reason = String(body.reason || '').trim();
            const contactMode = String(body.contactMode || '').toLowerCase().trim();
            if (!reason) {
              return json(res, 400, { error: 'Motif obligatoire pour annuler une commande' });
            }
            if (!['gsm', 'mail'].includes(contactMode)) {
              return json(res, 400, { error: 'Mode de contact obligatoire (gsm ou mail) pour annuler une commande' });
            }
            cancelReason = `${reason} (Mode contact: ${contactMode.toUpperCase()})`;
          }

          await run('UPDATE orders SET status = ?, cancel_reason = ? WHERE id = ?', nextStatus, cancelReason, orderId);
          await run('INSERT INTO order_status_history (order_id, status, changed_by_user_id) VALUES (?, ?, ?)', orderId, nextStatus, user.id);
          if (nextStatus === 'cancelled' && order.status !== 'cancelled') {
            await run('UPDATE menus SET stock = stock + 1 WHERE id = ?', order.menu_id);
          }

          const orderOwner = await get('SELECT email FROM users WHERE id = ?', order.user_id);
          if (nextStatus === 'awaiting_material_return') {
            sendMailInBackground(orderOwner.email, materialReturnMail(orderId), 'retour materiel');
          } else if (nextStatus === 'finished') {
            sendMailInBackground(orderOwner.email, orderStatusMail('finished - vous pouvez maintenant laisser un avis', orderId), 'statut termine');
          } else {
            sendMailInBackground(orderOwner.email, orderStatusMail(nextStatus, orderId), 'statut commande');
          }

          return json(res, 200, { message: 'Statut mis a jour et email envoye au client.' });
        }

        return json(res, 403, { error: 'Acces refuse' });
      }

      const orderHistoryMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/history$/);
      if (req.method === 'GET' && orderHistoryMatch) {
        const orderId = Number(orderHistoryMatch[1]);
        const order = await get('SELECT * FROM orders WHERE id = ?', orderId);
        if (!order) return json(res, 404, { error: 'Commande introuvable' });
        if (!user) return json(res, 401, { error: 'Non authentifie' });
        if (user.role === 'user' && order.user_id !== user.id) return json(res, 403, { error: 'Acces refuse' });

        const history = await all(
          `SELECT h.status, h.changed_at, u.first_name || ' ' || u.last_name as changed_by
           FROM order_status_history h
           LEFT JOIN users u ON u.id = h.changed_by_user_id
           WHERE h.order_id = ?
           ORDER BY h.changed_at ASC`,
          orderId
        );
        return json(res, 200, { history });
      }

      if (req.method === 'POST' && url.pathname === '/api/reviews') {
        if (!requireRole(user, ['user'])) return json(res, 403, { error: 'Acces refuse' });
        const body = await parseBody(req);
        const order = await get('SELECT * FROM orders WHERE id = ?', Number(body.orderId));
        if (!order || order.user_id !== user.id) return json(res, 404, { error: 'Commande introuvable' });
        if (order.status !== 'finished') return json(res, 400, { error: 'Avis possible uniquement une fois la commande terminee' });

        try {
          await run(
            `INSERT INTO reviews (order_id, user_id, rating, comment, is_approved)
             VALUES (?, ?, ?, ?, 0)`,
            order.id,
            user.id,
            Number(body.rating),
            body.comment
          );
          return json(res, 201, { message: 'Avis enregistre. Il sera visible apres validation de l equipe.' });
        } catch {
          return json(res, 409, { error: 'Avis deja existe pour cette commande' });
        }
      }

      const reviewModerationMatch = url.pathname.match(/^\/api\/reviews\/(\d+)\/moderate$/);
      if (req.method === 'POST' && reviewModerationMatch) {
        if (!requireRole(user, ['employee', 'admin'])) return json(res, 403, { error: 'Acces refuse' });
        const body = await parseBody(req);
        const approved = body.approved ? 1 : 0;
        await run('UPDATE reviews SET is_approved = ? WHERE id = ?', approved, Number(reviewModerationMatch[1]));
        return json(res, 200, { message: approved ? 'Avis valide' : 'Avis refuse' });
      }

      if (req.method === 'POST' && url.pathname === '/api/contact') {
        const body = await parseBody(req);
        const fields = ['title', 'description', 'email'];
        for (const field of fields) {
          if (!body[field]) return json(res, 400, { error: `Champ manquant : ${field}` });
        }
        await run('INSERT INTO contacts (title, description, email) VALUES (?, ?, ?)', body.title, body.description, body.email);
        await sendMail(MAIL_TO, contactReceivedMail({ title: body.title, description: body.description, email: body.email }));
        return json(res, 201, { message: 'Message envoye. Notre equipe a ete notifiee par email.' });
      }

      if (req.method === 'POST' && url.pathname === '/api/menus') {
        if (!requireRole(user, ['employee', 'admin'])) return json(res, 403, { error: 'Acces refuse' });
        const body = await parseBody(req);
        const fields = ['title', 'description', 'theme', 'diet', 'minPeople', 'minPrice', 'conditionsText', 'stock'];
        for (const field of fields) {
          if (body[field] === undefined || body[field] === '') return json(res, 400, { error: `Champ manquant : ${field}` });
        }

        const result = await run(
          `INSERT INTO menus (title, description, theme, diet, min_people, min_price, conditions_text, stock, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          body.title,
          body.description,
          body.theme,
          body.diet,
          Number(body.minPeople),
          Number(body.minPrice),
          body.conditionsText,
          Number(body.stock),
          resolveMenuImageUrl(body.imageUrl, body.theme, body.diet, body.title)
        );
        return json(res, 201, { menuId: Number(result.lastInsertRowid) });
      }

      const menuAdminMatch = url.pathname.match(/^\/api\/menus\/(\d+)$/);
      if ((req.method === 'PUT' || req.method === 'DELETE') && menuAdminMatch) {
        if (!requireRole(user, ['employee', 'admin'])) return json(res, 403, { error: 'Acces refuse' });
        const menuId = Number(menuAdminMatch[1]);

        if (req.method === 'DELETE') {
          await run('DELETE FROM menus WHERE id = ?', menuId);
          return json(res, 200, { message: 'Menu supprime' });
        }

        const body = await parseBody(req);
        await run(
          `UPDATE menus SET title = ?, description = ?, theme = ?, diet = ?, min_people = ?, min_price = ?,
           conditions_text = ?, stock = ?, image_url = ? WHERE id = ?`,
          body.title,
          body.description,
          body.theme,
          body.diet,
          Number(body.minPeople),
          Number(body.minPrice),
          body.conditionsText,
          Number(body.stock),
          resolveMenuImageUrl(body.imageUrl, body.theme, body.diet, body.title),
          menuId
        );
        return json(res, 200, { message: 'Menu modifie' });
      }

      if (req.method === 'GET' && url.pathname === '/api/employee/orders') {
        if (!requireRole(user, ['employee', 'admin'])) return json(res, 403, { error: 'Acces refuse' });
        const clauses = [];
        const params = [];

        if (url.searchParams.get('status')) {
          clauses.push('o.status = ?');
          params.push(url.searchParams.get('status'));
        }

        if (url.searchParams.get('email')) {
          clauses.push('LOWER(u.email) = LOWER(?)');
          params.push(url.searchParams.get('email'));
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const rows = await all(
          `SELECT o.id, o.status, o.total_price, o.created_at, o.material_loaned,
                  CASE WHEN o.material_loaned = 1 THEN 1 ELSE 0 END as has_material_loaned,
                  m.title as menu_title,
                  u.email as client_email, u.first_name as client_first_name, u.last_name as client_last_name
           FROM orders o
           JOIN users u ON u.id = o.user_id
           JOIN menus m ON m.id = o.menu_id
           ${where}
          ORDER BY o.created_at DESC`,
          ...params
        );

        const orders = rows.map((order) => ({
          ...order,
          materialLoaned: Number(order.has_material_loaned ?? order.material_loaned) === 1
        }));

        return json(res, 200, { orders });
      }

      if (req.method === 'GET' && url.pathname === '/api/employee/clients') {
        if (!requireRole(user, ['employee', 'admin'])) return json(res, 403, { error: 'Acces refuse' });
        const clients = await all(
          `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.address,
             COUNT(o.id) as orders_count,
             MAX(o.created_at) as last_order_at,
             ROUND(COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_price ELSE 0 END), 0), 2) as total_spent
           FROM users u
           LEFT JOIN orders o ON o.user_id = u.id
           WHERE LOWER(u.role) = 'user'
           GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone, u.address
           ORDER BY last_order_at DESC, u.id DESC`
        );
        return json(res, 200, { clients });
      }

      const clientSummaryMatch = url.pathname.match(/^\/api\/employee\/clients\/(\d+)\/summary$/);
      if (req.method === 'GET' && clientSummaryMatch) {
        if (!requireRole(user, ['employee', 'admin'])) return json(res, 403, { error: 'Acces refuse' });
        const clientId = Number(clientSummaryMatch[1]);
        const clientData = await get(
          `SELECT id, first_name, last_name, email, phone, address
           FROM users
           WHERE id = ? AND LOWER(role) = 'user'`,
          clientId
        );
        if (!clientData) return json(res, 404, { error: 'Client introuvable' });

        const recentMenus = await all(
          `SELECT o.id as order_id, o.created_at, o.status, o.total_price,
             m.id as menu_id, m.title as menu_title
           FROM orders o
           JOIN menus m ON m.id = o.menu_id
           WHERE o.user_id = ?
           ORDER BY o.created_at DESC
           LIMIT 5`,
          clientId
        );

        const favoriteMenus = await all(
          `SELECT m.id as menu_id, m.title as menu_title, COUNT(o.id) as order_count
           FROM orders o
           JOIN menus m ON m.id = o.menu_id
           WHERE o.user_id = ? AND o.status != 'cancelled'
           GROUP BY m.id, m.title
           ORDER BY order_count DESC, MAX(o.created_at) DESC
           LIMIT 5`,
          clientId
        );

        return json(res, 200, { client: clientData, recentMenus, favoriteMenus });
      }

      const patchClientMatch = url.pathname.match(/^\/api\/employee\/clients\/(\d+)$/);
      if (req.method === 'PATCH' && patchClientMatch) {
        if (!requireRole(user, ['employee', 'admin'])) return json(res, 403, { error: 'Acces refuse' });
        const clientId = Number(patchClientMatch[1]);
        const existing = await get('SELECT id FROM users WHERE id = ? AND LOWER(role) = ?', clientId, 'user');
        if (!existing) return json(res, 404, { error: 'Client introuvable' });

        const body = await parseBody(req);
        const sets = [];
        const params = [];

        if (body.firstName !== undefined) {
          sets.push('first_name = ?');
          params.push(String(body.firstName || '').trim());
        }
        if (body.lastName !== undefined) {
          sets.push('last_name = ?');
          params.push(String(body.lastName || '').trim());
        }
        if (body.phone !== undefined) {
          sets.push('phone = ?');
          params.push(String(body.phone || '').trim());
        }
        if (body.email !== undefined) {
          const email = String(body.email || '').toLowerCase().trim();
          if (!email) return json(res, 400, { error: 'Email invalide' });
          sets.push('email = ?');
          params.push(email);
        }
        if (body.address !== undefined) {
          sets.push('address = ?');
          params.push(String(body.address || '').trim());
        }

        if (!sets.length) return json(res, 400, { error: 'Aucune modification detectee' });
        params.push(clientId);

        try {
          await run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...params);
          return json(res, 200, { message: 'Client mis a jour' });
        } catch {
          return json(res, 409, { error: 'Email deja utilise' });
        }
      }

      if (req.method === 'GET' && url.pathname === '/api/admin/staff-users') {
        if (!requireRole(user, ['admin'])) return json(res, 403, { error: 'Acces refuse' });
        const rows = await all(
          `SELECT id, role, first_name, last_name, email, phone, address, is_active, created_at
           FROM users
           WHERE LOWER(role) IN ('admin', 'employee')
           ORDER BY role ASC, created_at DESC`
        );
        return json(res, 200, { users: rows });
      }

      if (req.method === 'GET' && url.pathname === '/api/admin/reviews') {
        if (!requireRole(user, ['employee', 'admin'])) return json(res, 403, { error: 'Acces refuse' });
        const reviews = await all(
          `SELECT r.id, r.order_id, r.user_id, r.rating, r.comment, r.is_approved, r.created_at,
                  o.status as order_status, o.total_price,
                  m.title as menu_title,
                  u.first_name as client_first_name, u.last_name as client_last_name, u.email as client_email
           FROM reviews r
           JOIN orders o ON o.id = r.order_id
           JOIN users u ON u.id = r.user_id
           LEFT JOIN menus m ON m.id = o.menu_id
           ORDER BY r.created_at DESC`
        );
        return json(res, 200, { reviews });
      }

      if (req.method === 'POST' && url.pathname === '/api/admin/staff-users') {
        if (!requireRole(user, ['admin'])) return json(res, 403, { error: 'Acces refuse' });
        const body = await parseBody(req);
        if (!body.email || !body.password || !body.role) {
          return json(res, 400, { error: 'Email, role et mot de passe requis' });
        }
        if (!isInternalRole(body.role)) return json(res, 400, { error: 'Role invalide' });
        if (!validatePassword(body.password)) return json(res, 400, { error: 'Mot de passe non conforme' });

        const firstName = String(body.firstName || (body.role === 'admin' ? 'Admin' : 'Employe')).trim() || (body.role === 'admin' ? 'Admin' : 'Employe');
        const lastName = String(body.lastName || 'Nouveau').trim() || 'Nouveau';
        const phone = String(body.phone || '0000000000').trim() || '0000000000';
        const address = String(body.address || 'Bordeaux').trim() || 'Bordeaux';
        const email = String(body.email).toLowerCase().trim();
        const role = String(body.role).toLowerCase();

        try {
          const result = await run(
            `INSERT INTO users (role, first_name, last_name, phone, email, address, password_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            role,
            firstName,
            lastName,
            phone,
            email,
            address,
            hashPassword(body.password)
          );
          await sendMail(email, employeeCreatedMail());
          return json(res, 201, { userId: Number(result.lastInsertRowid), message: 'Compte interne cree.' });
        } catch {
          return json(res, 409, { error: 'Email deja utilise' });
        }
      }

      const patchStaffUserMatch = url.pathname.match(/^\/api\/admin\/staff-users\/(\d+)$/);
      if (req.method === 'PATCH' && patchStaffUserMatch) {
        if (!requireRole(user, ['admin'])) return json(res, 403, { error: 'Acces refuse' });
        const targetId = Number(patchStaffUserMatch[1]);
        const target = await get('SELECT id, role FROM users WHERE id = ?', targetId);
        if (!target) return json(res, 404, { error: 'Compte introuvable' });
        if (!isInternalRole(target.role)) return json(res, 400, { error: 'Modification reservee aux comptes internes' });

        const body = await parseBody(req);
        const sets = [];
        const params = [];

        if (body.email !== undefined) {
          const email = String(body.email).toLowerCase().trim();
          if (!email) return json(res, 400, { error: 'Email invalide' });
          sets.push('email = ?');
          params.push(email);
        }

        if (body.firstName !== undefined) {
          sets.push('first_name = ?');
          params.push(String(body.firstName || '').trim());
        }

        if (body.lastName !== undefined) {
          sets.push('last_name = ?');
          params.push(String(body.lastName || '').trim());
        }

        if (body.phone !== undefined) {
          sets.push('phone = ?');
          params.push(String(body.phone || '').trim());
        }

        if (body.address !== undefined) {
          sets.push('address = ?');
          params.push(String(body.address || '').trim());
        }

        if (body.role !== undefined) {
          const role = String(body.role).toLowerCase();
          if (!isInternalRole(role)) return json(res, 400, { error: 'Role invalide' });
          sets.push('role = ?');
          params.push(role);
        }

        if (body.isActive !== undefined) {
          const isActive = body.isActive ? 1 : 0;
          if (targetId === user.id && isActive === 0) {
            return json(res, 400, { error: 'Impossible de desactiver ton propre compte' });
          }
          sets.push('is_active = ?');
          params.push(isActive);
        }

        if (body.password !== undefined && body.password !== '') {
          if (!validatePassword(String(body.password))) {
            return json(res, 400, { error: 'Mot de passe non conforme' });
          }
          sets.push('password_hash = ?');
          params.push(hashPassword(String(body.password)));
        }

        if (!sets.length) return json(res, 400, { error: 'Aucune modification detectee' });

        params.push(targetId);
        try {
          await run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...params);
          return json(res, 200, { message: 'Compte interne mis a jour' });
        } catch {
          return json(res, 409, { error: 'Email deja utilise' });
        }
      }

      const deleteStaffUserMatch = url.pathname.match(/^\/api\/admin\/staff-users\/(\d+)$/);
      if (req.method === 'DELETE' && deleteStaffUserMatch) {
        if (!requireRole(user, ['admin'])) return json(res, 403, { error: 'Acces refuse' });
        const targetId = Number(deleteStaffUserMatch[1]);
        const target = await get('SELECT id, role FROM users WHERE id = ?', targetId);
        if (!target) return json(res, 404, { error: 'Compte introuvable' });
        if (!isInternalRole(target.role)) return json(res, 400, { error: 'Suppression reservee aux comptes internes' });
        if (targetId === user.id) return json(res, 400, { error: 'Impossible de supprimer ton propre compte' });

        try {
          await run('DELETE FROM users WHERE id = ?', targetId);
          for (const [sessionToken, sessionData] of sessions.entries()) {
            if (Number(sessionData.userId) === targetId) sessions.delete(sessionToken);
          }
          return json(res, 200, { message: 'Compte interne supprime' });
        } catch {
          return json(res, 400, { error: 'Suppression impossible (compte lie a des donnees)' });
        }
      }

      if (req.method === 'GET' && url.pathname === '/api/admin/stats/orders-per-menu') {
        if (!requireRole(user, ['admin'])) return json(res, 403, { error: 'Acces refuse' });
        if (!mongoAnalyticsCollection) return json(res, 503, { error: 'MongoDB indisponible' });
        const stats = await getOrdersPerMenuStats();
        return json(res, 200, { stats });
      }

      if (req.method === 'GET' && url.pathname === '/api/admin/stats/revenue') {
        if (!requireRole(user, ['admin'])) return json(res, 403, { error: 'Acces refuse' });

        const clauses = [`o.status != 'cancelled'`];
        const params = [];

        if (url.searchParams.get('menuId')) {
          clauses.push('o.menu_id = ?');
          params.push(Number(url.searchParams.get('menuId')));
        }

        if (url.searchParams.get('from')) {
          clauses.push('date(o.created_at) >= date(?)');
          params.push(url.searchParams.get('from'));
        }

        if (url.searchParams.get('to')) {
          clauses.push('date(o.created_at) <= date(?)');
          params.push(url.searchParams.get('to'));
        }

        const where = `WHERE ${clauses.join(' AND ')}`;
        const rows = await all(
          `SELECT m.id as menu_id, m.title as menu_title,
             COUNT(o.id) as orders_count,
             ROUND(SUM(o.total_price), 2) as turnover
           FROM orders o
           JOIN menus m ON m.id = o.menu_id
           ${where}
           GROUP BY m.id
           ORDER BY turnover DESC`,
          ...params
        );
        return json(res, 200, { rows });
      }

      if (req.method === 'POST' && url.pathname === '/api/admin/test-mail') {
        if (!requireRole(user, ['admin'])) return json(res, 403, { error: 'Acces refuse' });
        const body = await parseBody(req);
        const to = String(body.to || MAIL_TO || '').trim();
        if (!to) return json(res, 400, { error: 'Destinataire manquant' });

        const now = new Date().toISOString();
        const ok = await sendMail(to, {
          subject: 'Test SMTP - Vite & Gourmand',
          text: `Email de test envoye le ${now}.`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:16px;border:1px solid #e6dccf;border-radius:12px;background:#fffaf5;color:#2c2017">
              <h3 style="margin:0 0 8px;color:#b84a2f">Test SMTP reussi</h3>
              <p style="margin:0">Cet email confirme que la configuration SMTP est operationnelle.</p>
              <p style="margin:10px 0 0;color:#6f6257;font-size:12px">Date: ${now}</p>
            </div>
          `
        });

        if (!ok) return json(res, 502, { error: 'Echec envoi email de test' });
        return json(res, 200, { message: `Email de test envoye vers ${to}` });
      }

      return routeNotFound(res);
    }

    let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    if (filePath.includes('..')) {
      res.writeHead(400);
      return res.end('Bad request');
    }

    const fullPath = join(PUBLIC_DIR, filePath);
    if (!existsSync(fullPath)) {
      res.writeHead(404);
      return res.end('Not found');
    }

    res.writeHead(200, { 'Content-Type': MIME[extname(fullPath)] || 'application/octet-stream' });
    createReadStream(fullPath).pipe(res);
  } catch (error) {
    json(res, 500, { error: error.message || 'Erreur interne' });
  }
});

async function start() {
  await initRelationalDb();
  await ensureSeedData();

  initMailer({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: MAIL_FROM,
    forceIpv4: SMTP_FORCE_IPV4
  });

  try {
    const smtpOk = await verifyMailer();
    if (smtpOk) {
      console.log('SMTP connecte: les emails reels sont actifs.');
    }
  } catch (error) {
    if (SMTP_HOST && SMTP_USER) {
      console.error('SMTP configure mais inaccessible:', error.message);
    }
  }

  server.listen(PORT, () => {
    console.log(`Application Vite & Gourmand en cours sur http://localhost:${PORT}`);
    console.log('Comptes demo: admin@vitegourmand.fr / Admin!12345, employee@vitegourmand.fr / Employe!12345, user@vitegourmand.fr / User!123456');
  });

  startMongoInBackground();
}

start();
