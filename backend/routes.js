import { Router } from 'express';
import { pool } from './db.js';

export const router = Router();

// Выполняет произвольный SQL и возвращает результат.
// ВАЖНО: это учебный локальный стенд. В реальном продакшене так
// принимать сырой SQL от клиента нельзя ни в каком виде — это
// прямой путь к SQL-инъекции и произвольному доступу к базе.
// Здесь это осознанный выбор, чтобы ты мог свободно экспериментировать.
router.post('/query', async (req, res) => {
  const { sql } = req.body;

  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ error: 'Поле "sql" обязательно и должно быть строкой' });
  }

  const startedAt = process.hrtime.bigint();

  try {
    const result = await pool.query(sql);
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    res.json({
      rows: result.rows,
      fields: result.fields?.map((f) => f.name) ?? [],
      rowCount: result.rowCount,
      command: result.command, // SELECT / INSERT / UPDATE / ...
      durationMs: Math.round(durationMs * 100) / 100,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Отдаёт список таблиц и их колонок — пригодится фронтенду,
// чтобы показать схему рядом с редактором запросов.
router.get('/schema', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const schema = {};
    for (const row of result.rows) {
      if (!schema[row.table_name]) schema[row.table_name] = [];
      schema[row.table_name].push({ column: row.column_name, type: row.data_type });
    }

    res.json(schema);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});