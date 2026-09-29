import React, { useState, useMemo } from 'react';
import { colors, radii, spacing, typography } from '../../lib/tokens';
import { EmptyState, LoadingState } from '../shared/States';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  accessor?: (item: T) => React.ReactNode;
  field?: keyof T;
  sortable?: boolean;
  sortField?: string;
  className?: string;
  style?: React.CSSProperties;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T) => string | number;
  totalItems?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortField: string, sortOrder: 'asc' | 'desc') => void;
  searchQuery?: string;
  onSearchChange?: (searchQuery: string) => void;
  searchPlaceholder?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onAdd?: () => void;
  addLabel?: string;
  extraToolbar?: React.ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  totalItems,
  page,
  pageSize = 20,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records to display.',
  onAdd,
  addLabel = 'Add Record',
  extraToolbar,
  onRowClick,
  className,
  style,
  'data-testid': testId = 'data-table',
}: DataTableProps<T>) {
  // Search state
  const [internalSearch, setInternalSearch] = useState('');
  const currentSearch = searchQuery !== undefined ? searchQuery : internalSearch;

  // Sort state
  const [internalSortBy, setInternalSortBy] = useState<string | undefined>(sortBy);
  const [internalSortOrder, setInternalSortOrder] = useState<'asc' | 'desc'>(sortOrder || 'asc');
  const currentSortBy = sortBy !== undefined ? sortBy : internalSortBy;
  const currentSortOrder = sortOrder !== undefined ? sortOrder : internalSortOrder;

  // Page state
  const [internalPage, setInternalPage] = useState(1);
  const currentPage = page !== undefined ? page : internalPage;

  const isServerPaginated = typeof onPageChange === 'function';
  const isServerFiltered = typeof onSearchChange === 'function';
  const isServerSorted = typeof onSortChange === 'function';

  const handleSearchChange = (value: string) => {
    if (onPageChange) {
      onPageChange(1);
    } else {
      setInternalPage(1);
    }

    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearch(value);
    }
  };

  const handleSortClick = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;
    const field = column.sortField || (column.field as string) || column.key;
    let nextOrder: 'asc' | 'desc' = 'asc';
    if (currentSortBy === field) {
      nextOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    }

    if (onSortChange) {
      onSortChange(field, nextOrder);
    } else {
      setInternalSortBy(field);
      setInternalSortOrder(nextOrder);
    }
  };

  // Client-side filtering
  const filteredData = useMemo(() => {
    if (isServerFiltered || !currentSearch.trim()) return data;
    const q = currentSearch.toLowerCase();
    return data.filter((item) => {
      return columns.some((col) => {
        const rawVal = col.accessor
          ? col.accessor(item)
          : col.field
          ? item[col.field]
          : (item as Record<string, unknown>)[col.key];

        if (rawVal === null || rawVal === undefined) return false;
        if (typeof rawVal === 'object') return false;
        return String(rawVal).toLowerCase().includes(q);
      });
    });
  }, [data, columns, currentSearch, isServerFiltered]);

  // Client-side sorting
  const sortedData = useMemo(() => {
    if (isServerSorted || !currentSortBy) return filteredData;
    const col = columns.find(
      (c) => (c.sortField || (c.field as string) || c.key) === currentSortBy
    );
    return [...filteredData].sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;

      if (col?.field) {
        aVal = a[col.field];
        bVal = b[col.field];
      } else {
        aVal = (a as Record<string, unknown>)[currentSortBy];
        bVal = (b as Record<string, unknown>)[currentSortBy];
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comp = (aVal as any) < (bVal as any) ? -1 : 1;
      return currentSortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredData, currentSortBy, currentSortOrder, isServerSorted, columns]);

  // Total count calculation
  const totalCount = isServerPaginated ? (totalItems ?? data.length) : sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Final displayed items
  const displayedItems = useMemo(() => {
    if (isServerPaginated) return data;
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [isServerPaginated, data, sortedData, safePage, pageSize]);

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.min(Math.max(1, newPage), totalPages);
    if (onPageChange) {
      onPageChange(targetPage);
    } else {
      setInternalPage(targetPage);
    }
  };

  const startItem = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalCount);

  const isSearchActive = currentSearch.trim().length > 0;
  const isDataEmpty = displayedItems.length === 0;

  return (
    <div
      data-testid={testId}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: colors.surface.containerLowest,
        border: `1px solid ${colors.surface.outlineVariant}`,
        borderRadius: radii.md,
        overflow: 'hidden',
        fontFamily: typography.styles.bodyMd.fontFamily,
        ...style,
      }}
    >
      {/* Toolbar: Search input, extra filters, and Add button */}
      <div
        data-testid="data-table-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: spacing[3],
          padding: `${spacing[3]} ${spacing[4]}`,
          borderBottom: `1px solid ${colors.surface.outlineVariant}`,
          backgroundColor: colors.surface.base,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], flex: 1, minWidth: '240px' }}>
          {/* Search Input Box */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              maxWidth: '360px',
            }}
          >
            <input
              type="text"
              data-testid="data-table-search"
              aria-label="Search records"
              placeholder={searchPlaceholder}
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: `${spacing[2]} ${isSearchActive ? spacing[8] : spacing[3]} ${spacing[2]} ${spacing[3]}`,
                fontSize: typography.styles.caption.fontSize,
                color: colors.surface.onSurface,
                backgroundColor: colors.surface.containerLowest,
                border: `1px solid ${colors.surface.outlineVariant}`,
                borderRadius: radii.sm,
                outline: 'none',
              }}
            />
            {isSearchActive && (
              <button
                type="button"
                data-testid="data-table-clear-search"
                aria-label="Clear search"
                onClick={() => handleSearchChange('')}
                style={{
                  position: 'absolute',
                  right: spacing[2],
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.surface.onSurfaceVariant,
                  fontSize: '14px',
                  padding: spacing[1],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {extraToolbar}
        </div>

        {onAdd && (
          <button
            type="button"
            data-testid="data-table-add-button"
            onClick={onAdd}
            style={{
              backgroundColor: colors.accent.primary,
              color: colors.surface.containerLowest,
              border: 'none',
              borderRadius: radii.sm,
              padding: `${spacing[2]} ${spacing[4]}`,
              fontSize: typography.styles.caption.fontSize,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            <span>+</span>
            <span>{addLabel}</span>
          </button>
        )}
      </div>

      {/* Main Table Content or States */}
      {isLoading ? (
        <div style={{ padding: spacing[8] }}>
          <LoadingState message="Loading records..." />
        </div>
      ) : isDataEmpty ? (
        <div style={{ padding: spacing[8] }}>
          {isSearchActive ? (
            <EmptyState
              data-testid="data-table-empty-search"
              title="No results found"
              description={`No records match "${currentSearch}". Try a different search term or clear search.`}
              actionLabel="Clear search"
              onAction={() => handleSearchChange('')}
            />
          ) : (
            <EmptyState
              data-testid="data-table-empty-state"
              title={emptyTitle}
              description={emptyDescription}
              actionLabel={onAdd ? addLabel : undefined}
              onAction={onAdd}
            />
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table
            data-testid="data-table-content"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: colors.surface.containerLow,
                  borderBottom: `1px solid ${colors.surface.outlineVariant}`,
                }}
              >
                {columns.map((col) => {
                  const sortKey = col.sortField || (col.field as string) || col.key;
                  const isSorted = currentSortBy === sortKey;
                  const isSortable = Boolean(col.sortable);

                  return (
                    <th
                      key={col.key}
                      scope="col"
                      data-testid={`data-table-header-${col.key}`}
                      aria-sort={
                        isSorted
                          ? currentSortOrder === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      style={{
                        padding: `${spacing[3]} ${spacing[4]}`,
                        fontSize: typography.styles.labelCaps.fontSize,
                        fontWeight: typography.styles.labelCaps.fontWeight,
                        letterSpacing: typography.styles.labelCaps.letterSpacing,
                        color: colors.surface.onSurfaceVariant,
                        textTransform: 'uppercase',
                        textAlign: col.align || 'left',
                        userSelect: 'none',
                        cursor: isSortable ? 'pointer' : 'default',
                        ...col.style,
                      }}
                      className={col.className}
                      onClick={() => handleSortClick(col)}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: spacing[1],
                          justifyContent:
                            col.align === 'right'
                              ? 'flex-end'
                              : col.align === 'center'
                              ? 'center'
                              : 'flex-start',
                        }}
                      >
                        <span>{col.header}</span>
                        {isSortable && (
                          <span
                            data-testid={`data-table-sort-icon-${col.key}`}
                            style={{
                              fontSize: '10px',
                              opacity: isSorted ? 1 : 0.4,
                              color: isSorted ? colors.accent.primary : 'inherit',
                            }}
                          >
                            {isSorted ? (currentSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayedItems.map((item, index) => {
                const key = keyExtractor(item);
                return (
                  <tr
                    key={key}
                    data-testid={`data-table-row-${index}`}
                    onClick={() => onRowClick?.(item)}
                    style={{
                      borderBottom: `1px solid ${colors.surface.outlineVariant}`,
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {columns.map((col) => {
                      let cellContent: React.ReactNode;
                      if (col.accessor) {
                        cellContent = col.accessor(item);
                      } else if (col.field) {
                        cellContent = String(item[col.field] ?? '');
                      } else {
                        cellContent = String((item as Record<string, unknown>)[col.key] ?? '');
                      }

                      return (
                        <td
                          key={col.key}
                          style={{
                            padding: `${spacing[3]} ${spacing[4]}`,
                            fontSize: typography.styles.bodyMd.fontSize,
                            color: colors.surface.onSurface,
                            textAlign: col.align || 'left',
                            ...col.style,
                          }}
                          className={col.className}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer Controls */}
      {!isLoading && !isDataEmpty && (
        <div
          data-testid="data-table-pagination"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: spacing[3],
            padding: `${spacing[3]} ${spacing[4]}`,
            borderTop: `1px solid ${colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.base,
            fontSize: typography.styles.caption.fontSize,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          <div data-testid="data-table-page-info">
            Showing {startItem}–{endItem} of {totalCount} items
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <button
              type="button"
              data-testid="data-table-prev-page"
              aria-label="Previous page"
              disabled={safePage <= 1}
              onClick={() => handlePageChange(safePage - 1)}
              style={{
                padding: `${spacing[1]} ${spacing[3]}`,
                fontSize: typography.styles.caption.fontSize,
                backgroundColor: colors.surface.containerLowest,
                color: safePage <= 1 ? colors.surface.outline : colors.surface.onSurface,
                border: `1px solid ${colors.surface.outlineVariant}`,
                borderRadius: radii.sm,
                cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                opacity: safePage <= 1 ? 0.6 : 1,
              }}
            >
              Previous
            </button>

            <span data-testid="data-table-page-indicator" style={{ padding: `0 ${spacing[2]}` }}>
              Page {safePage} of {totalPages}
            </span>

            <button
              type="button"
              data-testid="data-table-next-page"
              aria-label="Next page"
              disabled={safePage >= totalPages}
              onClick={() => handlePageChange(safePage + 1)}
              style={{
                padding: `${spacing[1]} ${spacing[3]}`,
                fontSize: typography.styles.caption.fontSize,
                backgroundColor: colors.surface.containerLowest,
                color: safePage >= totalPages ? colors.surface.outline : colors.surface.onSurface,
                border: `1px solid ${colors.surface.outlineVariant}`,
                borderRadius: radii.sm,
                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: safePage >= totalPages ? 0.6 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
