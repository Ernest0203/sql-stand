import { useState, useEffect } from 'react';
import { runQuery, fetchSchema } from './api';

const DEFAULT_QUERY = `SELECT users.name, orders.product, orders.amount
FROM users
JOIN orders ON users.id = orders.user_id;`;

function App() {
  const [sql, setSql] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState(null);

  useEffect(() => {
    fetchSchema().then(setSchema).catch(() => setSchema(null));
  }, []);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const data = await runQuery(sql);
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    // Ctrl/Cmd + Enter — выполнить запрос, как в реальных SQL-клиентах
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleRun();
    }
  }

  return (
    <div className="app">
      <aside className="schema-panel">
        <h2>Схема</h2>
        {schema ? (
          Object.entries(schema).map(([table, columns]) => (
            <div key={table} className="schema-table">
              <div className="schema-table-name">{table}</div>
              <ul>
                {columns.map((col) => (
                  <li key={col.column}>
                    {col.column} <span className="col-type">{col.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="schema-empty">Не удалось загрузить схему. Сервер запущен?</p>
        )}
      </aside>

      <main className="main">
        <h1>SQL Stand</h1>

        <textarea
          className="editor"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />

        <div className="controls">
          <button onClick={handleRun} disabled={loading}>
            {loading ? 'Выполняется...' : 'Выполнить (Ctrl+Enter)'}
          </button>
          {result && (
            <span className="meta">
              {result.rowCount} строк · {result.durationMs} мс
            </span>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        {result && (
          <div className="results">
            <table>
              <thead>
                <tr>
                  {result.fields.map((f) => (
                    <th key={f}>{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    {result.fields.map((f) => (
                      <td key={f}>{String(row[f])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;