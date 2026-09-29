import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../../../src/components/shared/States';
import { DataTable } from '../../../src/components/crm/DataTable';

describe('CRM EmptyState Rendering (FR-14)', () => {
  it('renders friendly empty state with Add Company button when no companies exist', () => {
    const handleAdd = vi.fn();
    render(
      <EmptyState
        title="No Companies Found"
        description="Add your first company to start managing customer organizations."
        actionLabel="Add Company"
        onAction={handleAdd}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeDefined();
    expect(screen.getByText('No Companies Found')).toBeDefined();
    expect(
      screen.getByText('Add your first company to start managing customer organizations.')
    ).toBeDefined();

    const addBtn = screen.getByTestId('empty-state-action');
    expect(addBtn.textContent).toBe('Add Company');

    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('renders friendly empty state with Add Contact button when no contacts exist', () => {
    const handleAdd = vi.fn();
    render(
      <EmptyState
        title="No Contacts Found"
        description="Add your first contact to track people at customer organizations."
        actionLabel="Add Contact"
        onAction={handleAdd}
      />
    );

    expect(screen.getByText('No Contacts Found')).toBeDefined();
    expect(
      screen.getByText('Add your first contact to track people at customer organizations.')
    ).toBeDefined();

    const addBtn = screen.getByTestId('empty-state-action');
    expect(addBtn.textContent).toBe('Add Contact');

    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('renders friendly empty state with Add Lead button when no leads exist', () => {
    const handleAdd = vi.fn();
    render(
      <EmptyState
        title="No Leads Found"
        description="Add your first lead to start tracking sales pipeline opportunities."
        actionLabel="Add Lead"
        onAction={handleAdd}
      />
    );

    expect(screen.getByText('No Leads Found')).toBeDefined();
    expect(
      screen.getByText('Add your first lead to start tracking sales pipeline opportunities.')
    ).toBeDefined();

    const addBtn = screen.getByTestId('empty-state-action');
    expect(addBtn.textContent).toBe('Add Lead');

    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('renders friendly empty state with Add Task button when no tasks exist', () => {
    const handleAdd = vi.fn();
    render(
      <EmptyState
        title="No Tasks Found"
        description="Add your first task to keep track of follow-up actions."
        actionLabel="Add Task"
        onAction={handleAdd}
      />
    );

    expect(screen.getByText('No Tasks Found')).toBeDefined();
    expect(
      screen.getByText('Add your first task to keep track of follow-up actions.')
    ).toBeDefined();

    const addBtn = screen.getByTestId('empty-state-action');
    expect(addBtn.textContent).toBe('Add Task');

    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('renders friendly empty state with Add Interaction button when no interactions exist', () => {
    const handleAdd = vi.fn();
    render(
      <EmptyState
        title="No Interactions Found"
        description="Log your first customer interaction (call, email, meeting, note)."
        actionLabel="Add Interaction"
        onAction={handleAdd}
      />
    );

    expect(screen.getByText('No Interactions Found')).toBeDefined();
    expect(
      screen.getByText('Log your first customer interaction (call, email, meeting, note).')
    ).toBeDefined();

    const addBtn = screen.getByTestId('empty-state-action');
    expect(addBtn.textContent).toBe('Add Interaction');

    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('renders empty state embedded within DataTable for empty lists', () => {
    const handleAdd = vi.fn();
    render(
      <DataTable
        data={[]}
        columns={[{ key: 'name', header: 'Name' }]}
        keyExtractor={(item: any) => item.id}
        emptyTitle="No Items"
        emptyDescription="Your list is currently empty."
        onAdd={handleAdd}
        addLabel="Add New"
      />
    );

    expect(screen.getByTestId('data-table-empty-state')).toBeDefined();
    expect(screen.getByText('No Items')).toBeDefined();
    expect(screen.getByText('Your list is currently empty.')).toBeDefined();

    const addBtn = screen.getByTestId('data-table-add-button');
    expect(addBtn.textContent).toContain('Add New');

    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});
