'use client';

import React, { useState, useEffect, useId } from 'react';
import { colors, rounded, spacing, typography } from '@/lib/tokens';
import { ErrorAlert } from '@/components/shared/Alerts';
import type {
  TaskCreate,
  TaskRead,
  TaskUpdate,
  CRMApiError,
  FieldError,
} from '@/services/crm';

export interface CompanyOption {
  id: number;
  name: string;
}

export interface LeadOption {
  id: number;
  title: string;
}

export interface TaskFormData {
  description: string;
  due_date: string;
  completed: boolean;
  company_id?: number | null;
  lead_id?: number | null;
  title?: string;
  owner?: string;
}

export interface TaskFormErrors {
  description?: string;
  due_date?: string;
  completed?: string;
  company_id?: string;
  lead_id?: string;
  title?: string;
  owner?: string;
  [key: string]: string | undefined;
}

export interface TaskFormProps {
  /** Initial values for editing or pre-populating fields */
  initialValues?: Partial<TaskFormData | TaskRead | TaskCreate | TaskUpdate>;
  /** Company options for the nullable company dropdown */
  companies?: CompanyOption[];
  /** Lead options for the nullable lead dropdown */
  leads?: LeadOption[];
  /** Callback fired when form is submitted with valid data */
  onSubmit: (data: TaskFormData) => void | Promise<void>;
  /** Callback fired when cancel button is clicked */
  onCancel?: () => void;
  /** Whether the submit action is currently in progress */
  isSubmitting?: boolean;
  /** Alias for isSubmitting */
  isLoading?: boolean;
  /** API error message or error response object */
  apiError?: string | CRMApiError | { message?: string; fields?: FieldError[] } | null;
  /** Submit button text label */
  submitLabel?: string;
  /** Custom title header for the form card */
  title?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

/**
 * TaskForm Component
 * Renders a form for creating or editing a Task entity with fields:
 * - description (required)
 * - due_date (required, date input; past due dates allowed per Edge Case 3)
 * - completed (boolean checkbox)
 * - company_id (nullable dropdown)
 * - lead_id (nullable dropdown)
 * - owner (optional)
 * Includes inline validation errors satisfying FR-4, FR-12, and Edge Case 3.
 */
export const TaskForm: React.FC<TaskFormProps> = ({
  initialValues,
  companies = [],
  leads = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  isLoading = false,
  apiError,
  submitLabel,
  title,
  className = '',
  style,
}) => {
  const formId = useId();
  const descriptionInputId = `${formId}-description`;
  const dueDateInputId = `${formId}-due-date`;
  const completedCheckboxId = `${formId}-completed`;
  const companySelectId = `${formId}-company-id`;
  const leadSelectId = `${formId}-lead-id`;
  const ownerInputId = `${formId}-owner`;
  const titleHeaderId = `${formId}-title-header`;

  const pending = isSubmitting || isLoading;

  const [formData, setFormData] = useState<TaskFormData>({
    description: initialValues?.description ?? '',
    due_date: initialValues?.due_date ? String(initialValues.due_date).split('T')[0] : '',
    completed: initialValues?.completed ?? false,
    company_id: initialValues?.company_id ?? null,
    lead_id: initialValues?.lead_id ?? null,
    title: initialValues?.title ?? '',
    owner: initialValues?.owner ?? '',
  });

  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Synchronize form state when initialValues change
  useEffect(() => {
    if (initialValues) {
      setFormData({
        description: initialValues.description ?? '',
        due_date: initialValues.due_date ? String(initialValues.due_date).split('T')[0] : '',
        completed: initialValues.completed ?? false,
        company_id: initialValues.company_id ?? null,
        lead_id: initialValues.lead_id ?? null,
        title: initialValues.title ?? '',
        owner: initialValues.owner ?? '',
      });
      setErrors({});
      setTouched({});
    }
  }, [initialValues]);

  // Extract server-side field level validation errors if passed via apiError
  useEffect(() => {
    if (!apiError) return;

    if (typeof apiError === 'object' && 'fields' in apiError && Array.isArray(apiError.fields)) {
      const serverErrors: TaskFormErrors = {};
      apiError.fields.forEach((f) => {
        if (f.field && f.message) {
          serverErrors[f.field] = f.message;
        }
      });
      if (Object.keys(serverErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...serverErrors }));
      }
    }
  }, [apiError]);

  /**
   * Validate individual form field
   */
  const validateField = (
    field: keyof TaskFormData,
    value: string | number | boolean | null | undefined
  ): string | undefined => {
    if (field === 'description') {
      const strVal = typeof value === 'string' ? value : '';
      if (!strVal || !strVal.trim()) {
        return 'Task description is required';
      }
    }

    if (field === 'due_date') {
      const strVal = typeof value === 'string' ? value : '';
      if (!strVal || !strVal.trim()) {
        return 'Due date is required';
      }
      // Edge Case 3: Past due dates are allowed (task creates/updates in the past are valid)
    }

    return undefined;
  };

  /**
   * Validate all form fields
   */
  const validateAll = (data: TaskFormData): TaskFormErrors => {
    const newErrors: TaskFormErrors = {};

    const descError = validateField('description', data.description);
    if (descError) newErrors.description = descError;

    const dateError = validateField('due_date', data.due_date);
    if (dateError) newErrors.due_date = dateError;

    return newErrors;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const fieldName = name as keyof TaskFormData;

    let updatedValue: string | number | boolean | null = value;
    if (type === 'checkbox') {
      updatedValue = (e.target as HTMLInputElement).checked;
    } else if (fieldName === 'company_id') {
      updatedValue = value === '' || value === 'null' ? null : Number(value);
    } else if (fieldName === 'lead_id') {
      updatedValue = value === '' || value === 'null' ? null : Number(value);
    }

    setFormData((prev) => ({ ...prev, [fieldName]: updatedValue }));

    // Re-validate field on change if touched
    if (touched[fieldName]) {
      const fieldError = validateField(fieldName, updatedValue);
      setErrors((prev) => ({
        ...prev,
        [fieldName]: fieldError,
      }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const fieldName = name as keyof TaskFormData;

    let updatedValue: string | number | boolean | null = value;
    if (type === 'checkbox') {
      updatedValue = (e.target as HTMLInputElement).checked;
    } else if (fieldName === 'company_id') {
      updatedValue = value === '' || value === 'null' ? null : Number(value);
    } else if (fieldName === 'lead_id') {
      updatedValue = value === '' || value === 'null' ? null : Number(value);
    }

    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const fieldError = validateField(fieldName, updatedValue);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: fieldError,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark required fields as touched
    setTouched({
      description: true,
      due_date: true,
      completed: true,
      company_id: true,
      lead_id: true,
      title: true,
      owner: true,
    });

    const validationErrors = validateAll(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.description) {
        const el = document.getElementById(descriptionInputId);
        el?.focus();
      } else if (validationErrors.due_date) {
        const el = document.getElementById(dueDateInputId);
        el?.focus();
      }
      return;
    }

    const cleanedData: TaskFormData = {
      description: formData.description.trim(),
      due_date: formData.due_date.trim(),
      completed: Boolean(formData.completed),
      company_id: formData.company_id ?? null,
      lead_id: formData.lead_id ?? null,
      title: formData.title?.trim() || undefined,
      owner: formData.owner?.trim() || undefined,
    };

    await onSubmit(cleanedData);
  };

  const getApiErrorMessage = (): string | null => {
    if (!apiError) return null;
    if (typeof apiError === 'string') return apiError;
    if ('message' in apiError && apiError.message) return apiError.message;
    return 'An error occurred while saving task details.';
  };

  const apiErrorMessage = getApiErrorMessage();
  const isEditing = Boolean(initialValues && ('id' in initialValues || initialValues.description));
  const defaultTitle = isEditing ? 'Edit Task' : 'Add New Task';
  const displayTitle = title ?? defaultTitle;
  const defaultSubmitLabel = isEditing ? 'Save Task' : 'Create Task';
  const displaySubmitLabel = submitLabel ?? defaultSubmitLabel;

  return (
    <div
      className={`task-form-container ${className}`}
      style={{
        backgroundColor: colors.surface.containerLowest,
        border: `1px solid ${colors.borderVariant}`,
        borderRadius: rounded.lg,
        padding: spacing.xl,
        maxWidth: '640px',
        width: '100%',
        boxShadow: '0 4px 6px -1px rgba(115, 92, 65, 0.08)',
        ...style,
      }}
    >
      <div style={{ marginBottom: spacing.lg }}>
        <h2
          id={titleHeaderId}
          style={{
            fontFamily: typography.headlineSm.fontFamily,
            fontSize: typography.headlineSm.fontSize,
            fontWeight: typography.headlineSm.fontWeight,
            lineHeight: typography.headlineSm.lineHeight,
            color: colors.onSurface,
            margin: 0,
          }}
        >
          {displayTitle}
        </h2>
      </div>

      {apiErrorMessage && (
        <div style={{ marginBottom: spacing.lg }}>
          <ErrorAlert message={apiErrorMessage} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-labelledby={titleHeaderId}>
        {/* Task Description (Required) */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={descriptionInputId}
            style={{
              display: 'block',
              fontFamily: typography.sizes["label-caps"].fontFamily,
              fontSize: typography.sizes["label-caps"].fontSize,
              fontWeight: typography.sizes["label-caps"].fontWeight,
              letterSpacing: typography.sizes["label-caps"].letterSpacing,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            Task Description <span style={{ color: colors.error }}>*</span>
          </label>
          <textarea
            id={descriptionInputId}
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={pending}
            aria-required="true"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? `${descriptionInputId}-error` : undefined}
            placeholder="Enter task details or action item..."
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${errors.description ? colors.error : colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
          {errors.description && (
            <p
              id={`${descriptionInputId}-error`}
              role="alert"
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.error,
                marginTop: spacing.xs,
                marginBottom: 0,
              }}
            >
              {errors.description}
            </p>
          )}
        </div>

        {/* Due Date (Required) */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={dueDateInputId}
            style={{
              display: 'block',
              fontFamily: typography.sizes["label-caps"].fontFamily,
              fontSize: typography.sizes["label-caps"].fontSize,
              fontWeight: typography.sizes["label-caps"].fontWeight,
              letterSpacing: typography.sizes["label-caps"].letterSpacing,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            Due Date <span style={{ color: colors.error }}>*</span>
          </label>
          <input
            id={dueDateInputId}
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={pending}
            aria-required="true"
            aria-invalid={Boolean(errors.due_date)}
            aria-describedby={errors.due_date ? `${dueDateInputId}-error` : undefined}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${errors.due_date ? colors.error : colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.due_date && (
            <p
              id={`${dueDateInputId}-error`}
              role="alert"
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.error,
                marginTop: spacing.xs,
                marginBottom: 0,
              }}
            >
              {errors.due_date}
            </p>
          )}
        </div>

        {/* Completed Checkbox */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={completedCheckboxId}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.sm,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              color: colors.onSurface,
              cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            <input
              id={completedCheckboxId}
              type="checkbox"
              name="completed"
              checked={formData.completed}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={pending}
              style={{
                width: '18px',
                height: '18px',
                accentColor: colors.primary,
                cursor: pending ? 'not-allowed' : 'pointer',
              }}
            />
            Mark as Completed
          </label>
        </div>

        {/* Company Dropdown (Nullable) */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={companySelectId}
            style={{
              display: 'block',
              fontFamily: typography.sizes["label-caps"].fontFamily,
              fontSize: typography.sizes["label-caps"].fontSize,
              fontWeight: typography.sizes["label-caps"].fontWeight,
              letterSpacing: typography.sizes["label-caps"].letterSpacing,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            Company (Optional)
          </label>
          <select
            id={companySelectId}
            name="company_id"
            value={formData.company_id ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={pending}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">-- No Company --</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lead Dropdown (Nullable) */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={leadSelectId}
            style={{
              display: 'block',
              fontFamily: typography.sizes["label-caps"].fontFamily,
              fontSize: typography.sizes["label-caps"].fontSize,
              fontWeight: typography.sizes["label-caps"].fontWeight,
              letterSpacing: typography.sizes["label-caps"].letterSpacing,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            Lead (Optional)
          </label>
          <select
            id={leadSelectId}
            name="lead_id"
            value={formData.lead_id ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={pending}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">-- No Lead --</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.title}
              </option>
            ))}
          </select>
        </div>

        {/* Owner / Assigned To (Optional) */}
        <div style={{ marginBottom: spacing.xl }}>
          <label
            htmlFor={ownerInputId}
            style={{
              display: 'block',
              fontFamily: typography.sizes["label-caps"].fontFamily,
              fontSize: typography.sizes["label-caps"].fontSize,
              fontWeight: typography.sizes["label-caps"].fontWeight,
              letterSpacing: typography.sizes["label-caps"].letterSpacing,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            Owner
          </label>
          <input
            id={ownerInputId}
            type="text"
            name="owner"
            value={formData.owner ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={pending}
            placeholder="Assignee name or email"
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: spacing.md,
            marginTop: spacing.xl,
          }}
        >
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                fontFamily: typography.bodyMd.fontFamily,
                fontSize: typography.bodyMd.fontSize,
                fontWeight: 500,
                color: colors.onSurface,
                backgroundColor: colors.surface.containerHigh,
                border: `1px solid ${colors.borderVariant}`,
                borderRadius: rounded.sm,
                cursor: pending ? 'not-allowed' : 'pointer',
                opacity: pending ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              padding: `${spacing.sm} ${spacing.xl}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              fontWeight: 500,
              color: colors.onPrimary,
              backgroundColor: colors.primary,
              border: 'none',
              borderRadius: rounded.sm,
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? 'Saving...' : displaySubmitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};
