import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, DataTableColumn } from '../../../src/components/crm/DataTable';

interface TestRecord {
  id: number;
  name: string;
  category: string;
  createdAt: string;
}

const mockData: TestRecord[] = Array.from({ length: 45 }, (_, i) => ({
  id: i + 1,
  name: `Record ${i + 1}`,
  category: i % 2 === 0 ? 'Tech' : 'Finance',
  createdAt: `2026-01-${(i + 1).toString().padStart(2, '0')}`,
}));

const columns: DataTableColumn<TestRecord>[] = [
  { key: 'name', header: 'Name', field: 'name', sortable: true },
  { key: 'category', header: 'Category', field: 'category', sortable: true },
  { key: 'createdAt', header: 'Created At', field: 'createdAt', sortable: true },
];

describe('DataTable Component', () => {
  it('renders data rows and column headers correctly', () => {
    render(
      <DataTable
        data={mockData.slice(0, 5)}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByTestId('data-table')).toBeDefined();
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Category')).toBeDefined();
    expect(screen.getByText('Created At')).toBeDefined();

    expect(screen.getByText('Record 1')).toBeDefined();
    expect(screen.getByText('Record 5')).toBeDefined();
  });

  it('paginates 20 items per page by default and displays correct page range (FR-8)', () => {
    render(
      <DataTable
        data={mockData}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    );

    // Page 1 should show items 1 to 20
    expect(screen.getByTestId('data-table-page-info').textContent).toContain('Showing 1–20 of 45 items');
    expect(screen.getByTestId('data-table-page-indicator').textContent).toContain('Page 1 of 3');
    expect(screen.getByText('Record 1')).toBeDefined();
    expect(screen.getByText('Record 20')).toBeDefined();
    expect(screen.queryByText('Record 21')).toBeNull();

    // Previous page should be disabled on page 1
    const prevBtn = screen.getByTestId('data-table-prev-page');
    expect(prevBtn.getAttribute('disabled')).not.toBeNull();

    // Click Next page
    const nextBtn = screen.getByTestId('data-table-next-page');
    fireEvent.click(nextBtn);

    // Page 2 should show items 21 to 40
    expect(screen.getByTestId('data-table-page-info').textContent).toContain('Showing 21–40 of 45 items');
    expect(screen.getByTestId('data-table-page-indicator').textContent).toContain('Page 2 of 3');
    expect(screen.getByText('Record 21')).toBeDefined();
    expect(screen.getByText('Record 40')).toBeDefined();
  });

  it('handles last page with fewer than 20 items correctly without error (Edge Case 6)', () => {
    render(
      <DataTable
        data={mockData}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    );

    const nextBtn = screen.getByTestId('data-table-next-page');
    fireEvent.click(nextBtn); // Go to page 2
    fireEvent.click(nextBtn); // Go to page 3 (45 items total -> 5 items on page 3)

    expect(screen.getByTestId('data-table-page-info').textContent).toContain('Showing 41–45 of 45 items');
    expect(screen.getByTestId('data-table-page-indicator').textContent).toContain('Page 3 of 3');
    expect(screen.getByText('Record 41')).toBeDefined();
    expect(screen.getByText('Record 45')).toBeDefined();

    // Next button should now be disabled
    expect(nextBtn.getAttribute('disabled')).not.toBeNull();
  });

  it('supports sorting by clicking header columns (FR-9)', () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        data={mockData.slice(0, 5)}
        columns={columns}
        keyExtractor={(item) => item.id}
        sortBy="name"
        sortOrder="asc"
        onSortChange={onSortChange}
      />
    );

    const categoryHeader = screen.getByTestId('data-table-header-category');
    fireEvent.click(categoryHeader);

    expect(onSortChange).toHaveBeenCalledWith('category', 'asc');

    const nameHeader = screen.getByTestId('data-table-header-name');
    fireEvent.click(nameHeader);

    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('filters data via search input and provides clear button (FR-7)', () => {
    render(
      <DataTable
        data={mockData.slice(0, 10)}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    );

    const searchInput = screen.getByTestId('data-table-search');
    fireEvent.change(searchInput, { target: { value: 'Record 5' } });

    expect(screen.getByText('Record 5')).toBeDefined();
    expect(screen.queryByText('Record 1')).toBeNull();

    // Clear search button should appear
    const clearBtn = screen.getByTestId('data-table-clear-search');
    expect(clearBtn).toBeDefined();

    fireEvent.click(clearBtn);

    // Should reset search and show Record 1 again
    expect(screen.getByText('Record 1')).toBeDefined();
  });

  it('displays "No results found" with clear search button when search matches nothing (Edge Case 5)', () => {
    render(
      <DataTable
        data={mockData.slice(0, 5)}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    );

    const searchInput = screen.getByTestId('data-table-search');
    fireEvent.change(searchInput, { target: { value: 'Nonexistent query' } });

    expect(screen.getByTestId('data-table-empty-search')).toBeDefined();
    expect(screen.getByText('No results found')).toBeDefined();

    const clearSearchBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearSearchBtn);

    expect(screen.getByText('Record 1')).toBeDefined();
  });

  it('renders friendly empty state with Add button when no records exist (FR-14)', () => {
    const onAdd = vi.fn();
    render(
      <DataTable
        data={[]}
        columns={columns}
        keyExtractor={(item) => item.id}
        emptyTitle="No Companies Found"
        emptyDescription="Add your first company to start managing your customer list."
        onAdd={onAdd}
        addLabel="Add Company"
      />
    );

    expect(screen.getByTestId('data-table-empty-state')).toBeDefined();
    expect(screen.getByText('No Companies Found')).toBeDefined();
    expect(screen.getByText('Add your first company to start managing your customer list.')).toBeDefined();

    const addBtn = screen.getByTestId('data-table-add-button');
    expect(addBtn.textContent).toContain('Add Company');
    fireEvent.click(addBtn);

    expect(onAdd).toHaveBeenCalled();
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('loading-state')).toBeDefined();
    expect(screen.getByText('Loading records...')).toBeDefined();
  });
});
