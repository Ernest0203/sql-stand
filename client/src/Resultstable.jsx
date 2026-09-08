import { memo, useState, useEffect, useRef } from 'react';

const BATCH_SIZE = 200;

function ResultsTableInner({ result }) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef(null);

  // При смене результата (новый запрос) начинаем сначала.
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [result]);

  // IntersectionObserver следит за невидимым элементом-"маячком"
  // в конце таблицы. Когда он попадает в область видимости при
  // скролле — подгружаем ещё одну пачку строк.
  useEffect(() => {
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
  }, [result]);

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