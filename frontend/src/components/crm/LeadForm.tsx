'use client';

import React, { useState, useEffect, useId } from 'react';
import { colors, rounded, spacing, typography } from '@/lib/tokens';
import { ErrorAlert } from '@/components/shared/Alerts';
import type {
  LeadCreate,
  LeadRead,
  LeadUpdate,
  CRMApiError,
  FieldError,
} from '@/services/crm';

export interface CompanyOption {
  id: number;
  name: string;
}

export interface ContactOption {
  id: number;
  name: string;
}

export const DEFAULT_LEAD_STATUSES = [
  'Prospecting',
  'Qualified',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

export interface LeadFormData {
  title: string;
  value: number;
  status: string;
  company_id?: number | null;
  contact_id?: number | null;
  expected_close_date?: string | null;
  notes?: string;
  owner?: string;
}

export interface LeadFormErrors {
  title?: string;
  value?: string;
  status?: string;
  company_id?: string;
  contact_id?: string;
  expected_close_date?: string;
  notes?: string;
  owner?: string;
  [key: string]: string | undefined;
}

export interface LeadFormProps {
  /** Initial values for editing or pre-populating fields */
  initialValues?: Partial<LeadFormData | LeadRead | LeadCreate | LeadUpdate>;
  /** Company options for the nullable company dropdown */
  companies?: CompanyOption[];
  /** Contact options for the nullable contact dropdown */
  contacts?: ContactOption[];
  /** Lead status options for the status dropdown */
  statuses?: string[];
  /** Callback fired when form is submitted with valid data */
  onSubmit: (data: LeadFormData) => void | Promise<void>;
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
 * LeadForm Component
 * Renders a form for creating or editing a Lead entity with fields:
 * - title (required)
 * - company_id (nullable dropdown)
 * - contact_id (nullable dropdown)
 * - value (required, non-negative number)
 * - status (dropdown, pipeline status)
 * - expected_close_date (date picker / ISO date)
 * - owner (optional)
 * - notes (optional)
 * Includes inline validation errors satisfying FR-3, FR-12, and Edge Case 8.
 */
export const LeadForm: React.FC<LeadFormProps> = ({
  initialValues,
  companies = [],
  contacts = [],
  statuses = DEFAULT_LEAD_STATUSES,
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
  const titleInputId = `${formId}-title-input`;
  const companySelectId = `${formId}-company-id`;
  const contactSelectId = `${formId}-contact-id`;
  const valueInputId = `${formId}-value`;
  const statusSelectId = `${formId}-status`;
  const dateInputId = `${formId}-expected-close-date`;
  const ownerInputId = `${formId}-owner`;
  const notesInputId = `${formId}-notes`;
  const headerTitleId = `${formId}-header-title`;

  const pending = isSubmitting || isLoading;

  const [formData, setFormData] = useState({
    title: initialValues?.title ?? (initialValues as { name?: string })?.name ?? '',
    value:
      initialValues?.value !== undefined && initialValues?.value !== null
        ? String(initialValues.value)
        : '',
    status: initialValues?.status ?? 'Prospecting',
    company_id: initialValues?.company_id ?? null,
    contact_id: initialValues?.contact_id ?? null,
    expected_close_date: initialValues?.expected_close_date
      ? String(initialValues.expected_close_date).split('T')[0]
      : '',
    notes: initialValues?.notes ?? '',
    owner: initialValues?.owner ?? '',
  });

  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Synchronize form state when initialValues change
  useEffect(() => {
    if (initialValues) {
      setFormData({
        title: initialValues.title ?? (initialValues as { name?: string }).name ?? '',
        value:
          initialValues.value !== undefined && initialValues.value !== null
            ? String(initialValues.value)
            : '',
        status: initialValues.status ?? 'Prospecting',
        company_id: initialValues.company_id ?? null,
        contact_id: initialValues.contact_id ?? null,
        expected_close_date: initialValues.expected_close_date
          ? String(initialValues.expected_close_date).split('T')[0]
          : '',
        notes: initialValues.notes ?? '',
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
      const serverErrors: LeadFormErrors = {};
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
    field: string,
    value: string | number | null | undefined
  ): string | undefined => {
    if (field === 'title') {
      const strVal = typeof value === 'string' ? value : '';
      if (!strVal || !strVal.trim()) {
        return 'Lead title is required';
      }
    }

    if (field === 'value') {
      if (value === '' || value === null || value === undefined) {
        return 'Lead value is required';
      }
      const num = typeof value === 'number' ? value : Number(value);
      if (isNaN(num)) {
        return 'Value must be a valid number';
      }
      if (num < 0) {
        return 'Lead value cannot be negative';
      }
    }

    if (field === 'status') {
      const strVal = typeof value === 'string' ? value : '';
      if (!strVal || !strVal.trim()) {
        return 'Status is required';
      }
    }

    return undefined;
  };

  /**
   * Validate all form fields
   */
  const validateAll = (data: typeof formData): LeadFormErrors => {
    const newErrors: LeadFormErrors = {};

    const titleError = validateField('title', data.title);
    if (titleError) newErrors.title = titleError;

    const valueError = validateField('value', data.value);
    if (valueError) newErrors.value = valueError;

    const statusError = validateField('status', data.status);
    if (statusError) newErrors.status = statusError;

    return newErrors;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof typeof formData;

    let updatedValue: string | number | null = value;
    if (fieldName === 'company_id' || fieldName === 'contact_id') {
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
    const { name, value } = e.target;
    const fieldName = name as keyof typeof formData;

    let updatedValue: string | number | null = value;
    if (fieldName === 'company_id' || fieldName === 'contact_id') {
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

    setTouched({
      title: true,
      value: true,
      status: true,
      company_id: true,
      contact_id: true,
      expected_close_date: true,
      notes: true,
      owner: true,
    });

    const validationErrors = validateAll(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.title) {
        document.getElementById(titleInputId)?.focus();
      } else if (validationErrors.value) {
        document.getElementById(valueInputId)?.focus();
      } else if (validationErrors.status) {
        document.getElementById(statusSelectId)?.focus();
      }
      return;
    }

    const cleanedData: LeadFormData = {
      title: formData.title.trim(),
      value: Number(formData.value),
      status: formData.status || 'Prospecting',
      company_id: formData.company_id ?? null,
      contact_id: formData.contact_id ?? null,
      expected_close_date: formData.expected_close_date ? formData.expected_close_date.trim() : null,
      notes: formData.notes?.trim() || undefined,
      owner: formData.owner?.trim() || undefined,
    };

    await onSubmit(cleanedData);
  };

  const getApiErrorMessage = (): string | null => {
    if (!apiError) return null;
    if (typeof apiError === 'string') return apiError;
    if ('message' in apiError && apiError.message) return apiError.message;
    return 'An error occurred while saving lead details.';
  };

  const apiErrorMessage = getApiErrorMessage();
  const defaultTitle = initialValues?.title || (initialValues as { name?: string })?.name ? 'Edit Lead' : 'Add New Lead';
  const displayTitle = title ?? defaultTitle;
  const defaultSubmitLabel = initialValues?.title || (initialValues as { name?: string })?.name ? 'Save Changes' : 'Create Lead';
  const displaySubmitLabel = submitLabel ?? defaultSubmitLabel;

  return (
    <div
      className={`lead-form-container ${className}`}
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
      <form onSubmit={handleSubmit} noValidate aria-labelledby={headerTitleId}>
        <div style={{ marginBottom: spacing.lg }}>
          <h2
            id={headerTitleId}
            style={{
              fontFamily: typography.fontFamily.serif,
              fontSize: typography.sizes['headline-sm'].fontSize,
              fontWeight: typography.sizes['headline-sm'].fontWeight,
              lineHeight: typography.sizes['headline-sm'].lineHeight,
              color: colors.surface.onSurface,
              margin: 0,
            }}
          >
            {displayTitle}
          </h2>
        </div>

        {apiErrorMessage && (
          <div style={{ marginBottom: spacing.lg }}>
            <ErrorAlert
              title="Failed to save lead"
              message={apiErrorMessage}
              dismissible={false}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* Lead Title (Required FR-3, FR-12) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={titleInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Lead Title{' '}
              <span aria-hidden="true" style={{ color: colors.error }}>
                *
              </span>
            </label>
            <input
              id={titleInputId}
              name="title"
              type="text"
              required
              aria-required="true"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? `${titleInputId}-error` : undefined}
              value={formData.title}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Q4 Enterprise License Deal"
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${errors.title ? colors.error : colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
            />
            {errors.title && (
              <p
                id={`${titleInputId}-error`}
                role="alert"
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.error,
                  margin: 0,
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.title}
              </p>
            )}
          </div>

          {/* Company Dropdown (Nullable FR-3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={companySelectId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
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
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
                cursor: pending ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">-- No Company --</option>
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Dropdown (Nullable FR-3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={contactSelectId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Contact (Optional)
            </label>
            <select
              id={contactSelectId}
              name="contact_id"
              value={formData.contact_id ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
                cursor: pending ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">-- No Contact --</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Value (Required FR-3, FR-12, Edge Case 8) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={valueInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Value ($){' '}
              <span aria-hidden="true" style={{ color: colors.error }}>
                *
              </span>
            </label>
            <input
              id={valueInputId}
              name="value"
              type="number"
              step="any"
              min="0"
              required
              aria-required="true"
              aria-invalid={!!errors.value}
              aria-describedby={errors.value ? `${valueInputId}-error` : undefined}
              value={formData.value}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 25000"
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${errors.value ? colors.error : colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
            />
            {errors.value && (
              <p
                id={`${valueInputId}-error`}
                role="alert"
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.error,
                  margin: 0,
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.value}
              </p>
            )}
          </div>

          {/* Pipeline Status (FR-3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={statusSelectId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Status
            </label>
            <select
              id={statusSelectId}
              name="status"
              value={formData.status}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${errors.status ? colors.error : colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
                cursor: pending ? 'not-allowed' : 'pointer',
              }}
            >
              {statuses.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>
            {errors.status && (
              <p
                id={`${statusSelectId}-error`}
                role="alert"
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.error,
                  margin: 0,
                  marginTop: '2px',
                }}
              >
                {errors.status}
              </p>
            )}
          </div>

          {/* Expected Close Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={dateInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Expected Close Date
            </label>
            <input
              id={dateInputId}
              name="expected_close_date"
              type="date"
              value={formData.expected_close_date}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
              }}
            />
          </div>

          {/* Owner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={ownerInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Owner
            </label>
            <input
              id={ownerInputId}
              name="owner"
              type="text"
              value={formData.owner}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Alex Rep"
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={notesInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Notes
            </label>
            <textarea
              id={notesInputId}
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Additional background or deal particulars..."
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: spacing.md,
            marginTop: spacing.xl,
            paddingTop: spacing.lg,
            borderTop: `1px solid ${colors.surface.containerHigh}`,
          }}
        >
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                fontWeight: 500,
                padding: '10px 20px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${colors.borderVariant}`,
                backgroundColor: 'transparent',
                color: colors.surface.onSurface,
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
              fontFamily: typography.fontFamily.sans,
              fontSize: typography.sizes['body-md'].fontSize,
              fontWeight: 600,
              padding: '10px 24px',
              borderRadius: rounded.DEFAULT,
              border: 'none',
              backgroundColor: colors.accent.DEFAULT,
              color: colors.accent.onAccent,
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              transition: 'background-color 0.15s ease',
            }}
          >
            {pending ? (
              <>
                <svg
                  style={{
                    animation: 'spin 1s linear infinite',
                    width: '16px',
                    height: '16px',
                  }}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              displaySubmitLabel
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
