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

const users = [
  ['Ernest', 'ernest@mail.com'],
  ['Alex', 'alex@mail.com'],
  ['Olga', 'olga@mail.com'],
  ['Dmitry', 'dmitry@mail.com'],
];

const orders = [
  [1, 'Laptop', 1200],
  [1, 'Mouse', 25],
  [2, 'Keyboard', 60],
  [3, 'Monitor', 300],
  [3, 'Webcam', 45],
  [3, 'Headphones', 80],
];

async function seed() {
  console.log('Creating schema...');
  await pool.query(schema);

  console.log('Inserting users...');
  const userIds = [];
  for (const [name, email] of users) {
    const res = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
      [name, email]
    );
    userIds.push(res.rows[0].id);
  }

  console.log('Inserting orders...');
  for (const [userIndex, product, amount] of orders) {
    const userId = userIds[userIndex - 1];
    await pool.query(
      'INSERT INTO orders (user_id, product, amount) VALUES ($1, $2, $3)',
      [userId, product, amount]
    );
  }

  console.log('Done. Users:', userIds.length, 'Orders:', orders.length);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});