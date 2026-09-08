import { pool } from './db.js';

const schema = `
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS users;

  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT now()
  );

  CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    product TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT now()
  );
`;

// Именные пользователи — оставляем для наглядных примеров JOIN/GROUP BY,
// чтобы результат можно было прочитать глазами.
const namedUsers = [
  ['Ernest', 'ernest@mail.com'],
  ['Alex', 'alex@mail.com'],
  ['Olga', 'olga@mail.com'],
  ['Dmitry', 'dmitry@mail.com'], // намеренно без заказов — пример для LEFT JOIN
];

const namedOrders = [
  [1, 'Laptop', 1200],
  [1, 'Mouse', 25],
  [2, 'Keyboard', 60],
  [3, 'Monitor', 300],
  [3, 'Webcam', 45],
  [3, 'Headphones', 80],
];

const BULK_USERS = 100_000;
const BULK_ORDERS = 300_000;
const BATCH_SIZE = 1000;

const PRODUCTS = ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Webcam', 'Headphones', 'Charger', 'Cable'];

function randomAmount() {
  return (Math.random() * 990 + 10).toFixed(2);
}

function randomProduct() {
  return PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
}

// Вставляет строки пачками через один multi-row INSERT вместо
// одного запроса на строку — иначе 300k round-trip'ов к Neon
// займут очень много времени (сеть — самое дорогое здесь).
async function batchInsert(table, columns, rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = batch
      .map((row, rowIndex) => {
        const base = rowIndex * columns.length;
        const rowPlaceholders = row.map((_, colIndex) => `$${base + colIndex + 1}`);
        values.push(...row);
        return `(${rowPlaceholders.join(', ')})`;
      })
      .join(', ');

    await pool.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`,
      values
    );

    if ((i / BATCH_SIZE) % 20 === 0) {
      console.log(`  ${table}: ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
    }
  }
}

async function seed() {
  console.log('Creating schema...');
  await pool.query(schema);

  console.log('Inserting named users...');
  const namedUserIds = [];
  for (const [name, email] of namedUsers) {
    const res = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
      [name, email]
    );
    namedUserIds.push(res.rows[0].id);
  }

  console.log('Inserting named orders...');
  for (const [userIndex, product, amount] of namedOrders) {
    const userId = namedUserIds[userIndex - 1];
    await pool.query(
      'INSERT INTO orders (user_id, product, amount) VALUES ($1, $2, $3)',
      [userId, product, amount]
    );
  }

  console.log(`Generating ${BULK_USERS} bulk users...`);
  const bulkUserRows = [];
  for (let i = 0; i < BULK_USERS; i++) {
    bulkUserRows.push([`User ${i}`, `user${i}_${Date.now()}_${i}@example.com`]);
  }
  await batchInsert('users', ['name', 'email'], bulkUserRows);

  // Реальный диапазон id пользователей (именные + bulk), чтобы
  // случайные заказы честно ссылались на существующих юзеров.
  const { rows: idRange } = await pool.query('SELECT MIN(id) AS min, MAX(id) AS max FROM users');
  const minId = Number(idRange[0].min);
  const maxId = Number(idRange[0].max);

  console.log(`Generating ${BULK_ORDERS} bulk orders...`);
  const bulkOrderRows = [];
  for (let i = 0; i < BULK_ORDERS; i++) {
    const userId = minId + Math.floor(Math.random() * (maxId - minId + 1));
    bulkOrderRows.push([userId, randomProduct(), randomAmount()]);
  }
  await batchInsert('orders', ['user_id', 'product', 'amount'], bulkOrderRows);

  const { rows: counts } = await pool.query(
    'SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM orders) AS orders'
  );
  console.log('Done. Total users:', counts[0].users, 'Total orders:', counts[0].orders);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});