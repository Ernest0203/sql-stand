import { memo, useState, useEffect, useRef } from 'react';

const BATCH_SIZE = 200;

function ResultsTableInner({ result }) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef(null);

  // Для DDL/DML-команд (CREATE, DROP, INSERT без RETURNING, ...)
  // Postgres не возвращает строки данных вообще — это не ошибка,
  // просто нечего показывать в виде таблицы.
  const hasRows = Array.isArray(result.rows) && result.fields?.length > 0;

  // При смене результата (новый запрос) начинаем сначала.
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [result]);

  // IntersectionObserver следит за невидимым элементом-"маячком"
  // в конце таблицы. Когда он попадает в область видимости при
  // скролле — подгружаем ещё одну пачку строк.
  useEffect(() => {
    if (!hasRows) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, result.rows.length));
        }
      },
      { root: sentinel.closest('.results-scroll'), rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [result, hasRows]);

  if (!hasRows) {
    return (
      <div className="results">
        <div className="results-meta-bar results-success">
          ✓ {result.command} выполнено успешно
          {typeof result.rowCount === 'number' && result.rowCount > 0
            ? ` · затронуто строк: ${result.rowCount}`
            : ''}
        </div>
      </div>
    );
  }

  const rows = result.rows.slice(0, visibleCount);
  const hasMore = visibleCount < result.rows.length;

  return (
    <div className="results">
      <div className="results-meta-bar">
        Показано {rows.length} из {result.rowCount} строк
      </div>
      <div className="results-scroll">
        <table>
          <thead>
            <tr>
              {result.fields.map((f) => (
                <th key={f}>{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {result.fields.map((f) => (
                  <td key={f}>{String(row[f])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {hasMore && (
          <div ref={sentinelRef} className="results-sentinel">
            Подгружаю ещё...
          </div>
        )}
      </div>
    </div>
  );
}

// memo: перерендерится только если изменится сама ссылка на `result`,
// а не на каждый ре-рендер родителя (например, при вводе текста в SQL-поле).
export const ResultsTable = memo(ResultsTableInner);