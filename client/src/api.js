const API_URL = 'http://localhost:4000/api';

export async function runQuery(sql) {
  const res = await fetch(`${API_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Query failed');
  }

  return data;
}

export async function fetchSchema() {
  const res = await fetch(`${API_URL}/schema`);
  if (!res.ok) throw new Error('Failed to load schema');
  return res.json();
}