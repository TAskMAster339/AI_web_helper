interface Props {
  page: number;
  totalCount: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

function PaginationButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-sm rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-default ${
        active ? 'btn-primary' : 'btn-ghost'
      }`}
      style={active ? { boxShadow: '0 4px 14px var(--accent-glow)' } : undefined}
    >
      {children}
    </button>
  );
}

export default function Pagination({ page, totalCount, pageSize = 10, onPageChange }: Props) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <PaginationButton onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        ←
      </PaginationButton>

      {pages.map((p, i) =>
        p === '...' ? (
          <span
            key={`dots-${i}`}
            className="px-2 py-1.5 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            …
          </span>
        ) : (
          <PaginationButton key={p} onClick={() => onPageChange(p as number)} active={p === page}>
            {p}
          </PaginationButton>
        )
      )}

      <PaginationButton onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
        →
      </PaginationButton>

      <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        {totalCount} товаров
      </span>
    </div>
  );
}
