'use client';

import React, { useId, useMemo } from 'react';
import { colors, rounded, spacing, typography } from '@/lib/tokens';
import { EmptyState, LoadingState } from '@/components/shared/States';

export interface Column<T> {
  /** Unique key identifying the column */
  key: string;
  /** Header label or custom header node */
  header: React.ReactNode;
  /** Field name used when sorting. Defaults to `key` */
  sortField?: string;
  /** Whether column can be sorted */
  sortable?: boolean;
  /** Cell text alignment */
  align?: 'left' | 'center' | 'right';
  /** Column width specification (e.g. '150px', '20%') */
  width?: string | number;
  /** Custom cell rendering function */
  render?: (item: T, index: number) => React.ReactNode;
  /** Accessible label for column header button */
  ariaLabel?: string;
}

export interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Array of data items to display */
  data?: T[];
  /** Total item count across all pages for server-side pagination */
  totalItems?: number;

  /** Loading state flag */
  loading?: boolean;
  /** Error message or component */
  error?: React.ReactNode | null;

  /** Controlled search query string */
  searchValue?: string;
  /** Search input placeholder text */
  searchPlaceholder?: string;
  /** Callback fired when search input value changes */
  onSearchChange?: (value: string) => void;
  /** Whether to render search input bar (Default: true) */
  showSearch?: boolean;

  /** Currently active sort field */
  sortColumn?: string;
  /** Currently active sort direction ('asc' | 'desc') */
  sortDirection?: 'asc' | 'desc' | null;
  /** Callback fired when a sortable column header is clicked */
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;

  /** Current page index (1-based, Default: 1) */
  page?: number;
  /** Number of items per page (Default: 20 per FR-7–9) */
  pageSize?: number;
  /** Callback fired when page changes */
  onPageChange?: (page: number) => void;
  /** Callback fired when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Available page size selection options */
  pageSizeOptions?: number[];
  /** Whether to render pagination controls (Default: true) */
  showPagination?: boolean;

  /** Title displayed in table header toolbar */
  title?: React.ReactNode;
  /** Action elements in toolbar (e.g. Add record button) */
  actions?: React.ReactNode;
  /** Additional filter controls in toolbar */
  filters?: React.ReactNode;

  /** Empty state header title (for no records) */
  emptyTitle?: string;
  /** Empty state description message (for no records) */
  emptyMessage?: string;
  /** Label for primary call-to-action button in empty state */
  emptyActionLabel?: string;
  /** Callback fired when primary empty state CTA button is clicked */
  onEmptyAction?: () => void;
  /** Custom empty state node override */
  emptyState?: React.ReactNode;

  /** Getter for unique row key. Defaults to item.id or index */
  getRowKey?: (item: T, index: number) => string | number;
  /** Callback fired when a table row is clicked */
  onRowClick?: (item: T) => void;

  /** Accessible label for the table region */
  ariaLabel?: string;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline style overrides */
  style?: React.CSSProperties;
}

/**
 * Search Icon SVG
 */
const SearchIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = colors.grays[500],
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    style={{ flexShrink: 0, color }}
  >
    <path
      d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Clear (Close) Icon SVG
 */
const ClearIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = colors.grays[500],
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    style={{ flexShrink: 0, color }}
  >
    <path
      d="M18 6L6 18M6 6L18 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Sort Direction Icon SVG
 */
const SortIcon: React.FC<{
  direction?: 'asc' | 'desc' | null;
  active?: boolean;
}> = ({ direction, active = false }) => {
  const size = 14;
  const color = active ? colors.accent.DEFAULT : colors.grays[400];

  if (active && direction === 'asc') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        style={{ flexShrink: 0, color }}
        data-testid="sort-asc-icon"
      >
        <path
          d="M12 5V19M12 5L6 11M12 5L18 11"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (active && direction === 'desc') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        style={{ flexShrink: 0, color }}
        data-testid="sort-desc-icon"
      >
        <path
          d="M12 19V5M12 19L6 13M12 19L18 13"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, color }}
      data-testid="sort-neutral-icon"
    >
      <path
        d="M8 9L12 5L16 9M8 15L12 19L16 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * DataTable Component
 *
 * Reusable data table with pagination controls (20/page default), sort headers,
 * search input, and accessible empty state messages.
 *
 * Satisfies: FR-7, FR-8, FR-9, FR-12, FR-14, Edge Case 5, Edge Case 6.
 */
export function DataTable<T>(props: DataTableProps<T>): React.ReactElement {
  const {
    columns,
    data = [],
    totalItems,
    loading = false,
    error = null,
    searchValue = '',
    searchPlaceholder = 'Search...',
    onSearchChange,
    showSearch = true,
    sortColumn,
    sortDirection,
    onSortChange,
    page = 1,
    pageSize = 20,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100],
    showPagination = true,
    title,
    actions,
    filters,
    emptyTitle = 'No records found',
    emptyMessage = 'There are no records to display.',
    emptyActionLabel,
    onEmptyAction,
    emptyState: customEmptyState,
    getRowKey,
    onRowClick,
    ariaLabel = 'Data Table',
    className = '',
    style = {},
  } = props;

  const tableId = useId();
  const searchInputId = `${tableId}-search`;

  // Calculate total count and pagination metrics
  const effectiveTotal = totalItems !== undefined ? totalItems : data.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  // Edge Case 6: Determine displaying item range
  const startItem = effectiveTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, effectiveTotal);

  // Determine slice of data to display if client-side fallback applies
  const displayData = useMemo(() => {
    // If totalItems is explicitly passed and differs from data.length, data is pre-sliced (server-side)
    if (totalItems !== undefined && totalItems !== data.length) {
      return data;
    }
    // If onPageChange is provided, assume caller manages data slicing
    if (onPageChange && totalItems !== undefined) {
      return data;
    }
    // Client-side pagination fallback if data contains all records
    if (data.length > pageSize) {
      const startIndex = (currentPage - 1) * pageSize;
      return data.slice(startIndex, startIndex + pageSize);
    }
    return data;
  }, [data, totalItems, pageSize, currentPage, onPageChange]);

  const hasSearchFilter = Boolean(searchValue && searchValue.trim().length > 0);
  const isEmpty = displayData.length === 0 && !loading;

  // Handle header sort click
  const handleSortClick = (column: Column<T>) => {
    if (!column.sortable || !onSortChange) return;

    const field = column.sortField || column.key;
    let nextDirection: 'asc' | 'desc' = 'asc';

    if (sortColumn === field) {
      if (sortDirection === 'asc') {
        nextDirection = 'desc';
      } else if (sortDirection === 'desc') {
        nextDirection = 'asc';
      }
    }

    onSortChange(field, nextDirection);
  };

  // Default row key resolver
  const defaultGetRowKey = (item: T, index: number): string | number => {
    if (getRowKey) return getRowKey(item, index);
    if (item && typeof item === 'object' && 'id' in item) {
      const record = item as { id: string | number };
      if (record.id !== undefined && record.id !== null) {
        return record.id;
      }
    }
    return index;
  };

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={`crm-data-table-container ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: colors.surface.containerLowest,
        border: `1px solid ${colors.grays[200]}`,
        borderRadius: rounded.md,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      {/* Table Header Toolbar (Title, Search, Filters, Actions) */}
      {(title || showSearch || filters || actions) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
            padding: `${spacing.md} ${spacing.lg}`,
            borderBottom: `1px solid ${colors.grays[200]}`,
            backgroundColor: colors.surface.background,
          }}
        >
          {/* Left Toolbar Section: Title & Search */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: spacing.md,
              flex: '1 1 300px',
            }}
          >
            {title && (
              <div
                style={{
                  fontFamily: typography.fontFamily.serif,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.surface.onSurface,
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </div>
            )}

            {showSearch && (
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: '220px',
                  maxWidth: '360px',
                  flex: '1 1 220px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: spacing.sm,
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <SearchIcon size={16} />
                </div>
                <input
                  id={searchInputId}
                  type="search"
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label="Search items"
                  style={{
                    width: '100%',
                    paddingLeft: '32px',
                    paddingRight: hasSearchFilter ? '32px' : spacing.md,
                    paddingTop: spacing.xs,
                    paddingBottom: spacing.xs,
                    fontFamily: typography.fontFamily.sans,
                    fontSize: '14px',
                    color: colors.surface.onSurface,
                    backgroundColor: colors.surface.containerLowest,
                    border: `1px solid ${colors.grays[300]}`,
                    borderRadius: rounded.md,
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.accent.DEFAULT;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.grays[300];
                  }}
                />
                {hasSearchFilter && (
                  <button
                    type="button"
                    onClick={() => onSearchChange?.('')}
                    aria-label="Clear search"
                    title="Clear search"
                    style={{
                      position: 'absolute',
                      right: spacing.xs,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'none',
                      border: 'none',
                      padding: spacing.xs,
                      cursor: 'pointer',
                      borderRadius: rounded.sm,
                    }}
                  >
                    <ClearIcon size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Toolbar Section: Filters & Actions */}
          {(filters || actions) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                flexWrap: 'wrap',
              }}
            >
              {filters}
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Error Alert Display */}
      {error && (
        <div
          role="alert"
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: '#fdeded',
            color: colors.error,
            fontSize: '14px',
            borderBottom: `1px solid ${colors.grays[200]}`,
          }}
        >
          {error}
        </div>
      )}

      {/* Main Table Section */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          minHeight: loading && isEmpty ? '240px' : 'auto',
          position: 'relative',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '14px',
            fontFamily: typography.fontFamily.sans,
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: colors.surface.containerLow,
                borderBottom: `1px solid ${colors.grays[200]}`,
              }}
            >
              {columns.map((col) => {
                const sortField = col.sortField || col.key;
                const isSorted = sortColumn === sortField;
                const align = col.align || 'left';

                let ariaSort: 'ascending' | 'descending' | 'none' = 'none';
                if (isSorted) {
                  ariaSort = sortDirection === 'asc' ? 'ascending' : 'descending';
                }

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={col.sortable ? ariaSort : undefined}
                    style={{
                      padding: `${spacing.md} ${spacing.lg}`,
                      fontWeight: '600',
                      color: colors.surface.onSurfaceVariant,
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: align,
                      width: col.width,
                      userSelect: col.sortable ? 'none' : 'auto',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick(col)}
                        aria-label={
                          col.ariaLabel ||
                          `Sort by ${typeof col.header === 'string' ? col.header : col.key}`
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: spacing.xs,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          font: 'inherit',
                          color: isSorted ? colors.accent.DEFAULT : 'inherit',
                          fontWeight: isSorted ? '700' : '600',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <span>{col.header}</span>
                        <SortIcon direction={sortDirection} active={isSorted} />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {!loading &&
              !isEmpty &&
              displayData.map((item, index) => {
                const rowKey = defaultGetRowKey(item, index);
                const isClickable = Boolean(onRowClick);

                return (
                  <tr
                    key={rowKey}
                    onClick={isClickable ? () => onRowClick?.(item) : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={
                      isClickable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick?.(item);
                            }
                          }
                        : undefined
                    }
                    style={{
                      borderBottom: `1px solid ${colors.grays[100]}`,
                      backgroundColor:
                        index % 2 === 0
                          ? colors.surface.containerLowest
                          : colors.surface.background,
                      cursor: isClickable ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (isClickable) {
                        e.currentTarget.style.backgroundColor = colors.surface.containerLow;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        index % 2 === 0
                          ? colors.surface.containerLowest
                          : colors.surface.background;
                    }}
                  >
                    {columns.map((col) => {
                      const align = col.align || 'left';
                      const cellValue =
                        col.render
                          ? col.render(item, index)
                          : (item as Record<string, unknown>)[col.key] !== undefined &&
                            (item as Record<string, unknown>)[col.key] !== null
                          ? String((item as Record<string, unknown>)[col.key])
                          : '-';

                      return (
                        <td
                          key={col.key}
                          style={{
                            padding: `${spacing.md} ${spacing.lg}`,
                            color: colors.surface.onSurface,
                            textAlign: align,
                            verticalAlign: 'middle',
                          }}
                        >
                          {cellValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>

        {/* Loading Overlay State */}
        {loading && (
          <div
            style={{
              padding: spacing['2xl'],
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <LoadingState message="Loading table data..." />
          </div>
        )}

        {/* Empty States (FR-14 & Edge Case 5) */}
        {isEmpty && !loading && (
          <div style={{ padding: spacing.xl }}>
            {customEmptyState ? (
              customEmptyState
            ) : hasSearchFilter ? (
              /* Edge Case 5: Search yielding zero results */
              <EmptyState
                title="No results found"
                description={
                  <span>
                    No items matched &quot;<strong>{searchValue}</strong>&quot;.
                    Try adjusting your search terms or filters.
                  </span>
                }
                actionLabel="Clear search"
                onAction={() => onSearchChange?.('')}
              />
            ) : (
              /* FR-14: Standard Empty State when table has no items */
              <EmptyState
                title={emptyTitle}
                description={emptyMessage}
                actionLabel={emptyActionLabel}
                onAction={onEmptyAction}
              />
            )}
          </div>
        )}
      </div>

      {/* Pagination Footer Controls (FR-7–9, Edge Case 6) */}
      {showPagination && !isEmpty && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
            padding: `${spacing.sm} ${spacing.lg}`,
            borderTop: `1px solid ${colors.grays[200]}`,
            backgroundColor: colors.surface.background,
            fontSize: '13px',
            color: colors.grays[600],
          }}
        >
          {/* Left Pagination Info: Showing X to Y of Z entries */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <span>
              Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
              <strong>{effectiveTotal}</strong> entries
            </span>

            {onPageSizeChange && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                <label htmlFor={`${tableId}-page-size`}>Rows per page:</label>
                <select
                  id={`${tableId}-page-size`}
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    fontSize: '13px',
                    fontFamily: typography.fontFamily.sans,
                    borderRadius: rounded.sm,
                    border: `1px solid ${colors.grays[300]}`,
                    backgroundColor: colors.surface.containerLowest,
                    color: colors.surface.onSurface,
                    cursor: 'pointer',
                  }}
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right Pagination Nav Buttons */}
          <nav
            aria-label="Pagination Navigation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              aria-label="Previous page"
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                fontSize: '13px',
                fontWeight: '500',
                fontFamily: typography.fontFamily.sans,
                color: currentPage <= 1 ? colors.grays[400] : colors.surface.onSurface,
                backgroundColor: colors.surface.containerLowest,
                border: `1px solid ${colors.grays[300]}`,
                borderRadius: rounded.sm,
                cursor: currentPage <= 1 || loading ? 'not-allowed' : 'pointer',
                opacity: currentPage <= 1 ? 0.6 : 1,
              }}
            >
              Previous
            </button>

            <span
              style={{
                padding: `0 ${spacing.xs}`,
                fontWeight: '500',
              }}
            >
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              aria-label="Next page"
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                fontSize: '13px',
                fontWeight: '500',
                fontFamily: typography.fontFamily.sans,
                color: currentPage >= totalPages ? colors.grays[400] : colors.surface.onSurface,
                backgroundColor: colors.surface.containerLowest,
                border: `1px solid ${colors.grays[300]}`,
                borderRadius: rounded.sm,
                cursor: currentPage >= totalPages || loading ? 'not-allowed' : 'pointer',
                opacity: currentPage >= totalPages ? 0.6 : 1,
              }}
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
