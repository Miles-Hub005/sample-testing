'use client';

import React, { useState, useEffect, useId } from 'react';
import { colors, rounded, spacing, typography } from '@/lib/tokens';
import { ErrorAlert } from '@/components/shared/Alerts';
import type {
  InteractionCreate,
  InteractionRead,
  InteractionUpdate,
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

export interface LeadOption {
  id: number;
  title?: string;
  name?: string;
}

export const DEFAULT_INTERACTION_TYPES = [
  'call',
  'email',
  'meeting',
  'note',
];

export interface InteractionFormData {
  date: string;
  type: string;
  summary: string;
  company_id?: number | null;
  contact_id?: number | null;
  lead_id?: number | null;
  notes?: string;
  owner?: string;
}

export interface InteractionFormErrors {
  date?: string;
  type?: string;
  summary?: string;
  company_id?: string;
  contact_id?: string;
  lead_id?: string;
  notes?: string;
  owner?: string;
  [key: string]: string | undefined;
}

export interface InteractionFormProps {
  /** Initial values for editing or pre-populating fields */
  initialValues?: Partial<
    InteractionFormData | InteractionRead | InteractionCreate | InteractionUpdate
  >;
  /** Company options for the nullable company dropdown */
  companies?: CompanyOption[];
  /** Contact options for the nullable contact dropdown */
  contacts?: ContactOption[];
  /** Lead options for the nullable lead dropdown */
  leads?: LeadOption[];
  /** Interaction type options for the type dropdown */
  types?: string[];
  /** Callback fired when form is submitted with valid data */
  onSubmit: (data: InteractionFormData) => void | Promise<void>;
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
 * InteractionForm Component
 * Renders a form for creating or editing an Interaction entity with fields:
 * - date (required, date input)
 * - type (required, dropdown: call/email/meeting/note)
 * - summary (required, text/textarea input)
 * - company_id (nullable dropdown)
 * - contact_id (nullable dropdown)
 * - lead_id (nullable dropdown)
 * - owner (optional text input)
 * Includes inline validation errors satisfying FR-5 and FR-12.
 */
export const InteractionForm: React.FC<InteractionFormProps> = ({
  initialValues,
  companies = [],
  contacts = [],
  leads = [],
  types = DEFAULT_INTERACTION_TYPES,
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
  const dateInputId = `${formId}-date`;
  const typeSelectId = `${formId}-type`;
  const summaryInputId = `${formId}-summary`;
  const companySelectId = `${formId}-company`;
  const contactSelectId = `${formId}-contact`;
  const leadSelectId = `${formId}-lead`;
  const ownerInputId = `${formId}-owner`;

  const pending = isSubmitting || isLoading;

  const getInitialDate = (vals?: Partial<InteractionFormData | InteractionRead | InteractionCreate | InteractionUpdate>): string => {
    const raw = vals?.date ?? (vals as { interaction_date?: string })?.interaction_date ?? (vals as { timestamp?: string })?.timestamp;
    if (raw && typeof raw === 'string') {
      return raw.split('T')[0];
    }
    if (raw === '') {
      return '';
    }
    return new Date().toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<InteractionFormData>(() => {
    return {
      date: getInitialDate(initialValues),
      type: initialValues?.type || 'call',
      summary: initialValues?.summary || initialValues?.notes || '',
      company_id: initialValues?.company_id ?? null,
      contact_id: initialValues?.contact_id ?? null,
      lead_id: initialValues?.lead_id ?? null,
      notes: initialValues?.notes || '',
      owner: initialValues?.owner || '',
    };
  });

  const [errors, setErrors] = useState<InteractionFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialValues) {
      setFormData({
        date: getInitialDate(initialValues),
        type: initialValues.type || 'call',
        summary: initialValues.summary || initialValues.notes || '',
        company_id: initialValues.company_id ?? null,
        contact_id: initialValues.contact_id ?? null,
        lead_id: initialValues.lead_id ?? null,
        notes: initialValues.notes || '',
        owner: initialValues.owner || '',
      });
      setErrors({});
      setTouched({});
    }
  }, [initialValues]);

  useEffect(() => {
    if (!apiError) return;

    if (typeof apiError === 'object' && 'fields' in apiError && Array.isArray(apiError.fields)) {
      const serverErrors: InteractionFormErrors = {};
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

  const validateField = (
    field: keyof InteractionFormData,
    value: string | number | boolean | null | undefined
  ): string | undefined => {
    if (field === 'date') {
      const strVal = typeof value === 'string' ? value : '';
      if (!strVal || !strVal.trim()) {
        return 'Date is required';
      }
    }

    if (field === 'type') {
      const strVal = typeof value === 'string' ? value : '';
      if (!strVal || !strVal.trim()) {
        return 'Interaction type is required';
      }
    }

    if (field === 'summary') {
      const strVal = typeof value === 'string' ? value : '';
      if (!strVal || !strVal.trim()) {
        return 'Summary is required';
      }
    }

    return undefined;
  };

  const validateAll = (data: InteractionFormData): InteractionFormErrors => {
    const newErrors: InteractionFormErrors = {};

    const dateErr = validateField('date', data.date);
    if (dateErr) newErrors.date = dateErr;

    const typeErr = validateField('type', data.type);
    if (typeErr) newErrors.type = typeErr;

    const summaryErr = validateField('summary', data.summary);
    if (summaryErr) newErrors.summary = summaryErr;

    return newErrors;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof InteractionFormData;

    let updatedValue: string | number | null = value;
    if (fieldName === 'company_id' || fieldName === 'contact_id' || fieldName === 'lead_id') {
      updatedValue = value === '' || value === 'null' ? null : Number(value);
    }

    setFormData((prev) => ({ ...prev, [fieldName]: updatedValue }));

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
    const fieldName = name as keyof InteractionFormData;

    let updatedValue: string | number | null = value;
    if (fieldName === 'company_id' || fieldName === 'contact_id' || fieldName === 'lead_id') {
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
      date: true,
      type: true,
      summary: true,
      company_id: true,
      contact_id: true,
      lead_id: true,
      notes: true,
      owner: true,
    });

    const validationErrors = validateAll(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.date) {
        document.getElementById(dateInputId)?.focus();
      } else if (validationErrors.type) {
        document.getElementById(typeSelectId)?.focus();
      } else if (validationErrors.summary) {
        document.getElementById(summaryInputId)?.focus();
      }
      return;
    }

    const cleanedData: InteractionFormData = {
      date: formData.date.trim(),
      type: formData.type.trim(),
      summary: formData.summary.trim(),
      company_id: formData.company_id ?? null,
      contact_id: formData.contact_id ?? null,
      lead_id: formData.lead_id ?? null,
      notes: formData.summary.trim(),
      owner: formData.owner?.trim() || undefined,
    };

    await onSubmit(cleanedData);
  };

  const getApiErrorMessage = (): string | null => {
    if (!apiError) return null;
    if (typeof apiError === 'string') return apiError;
    if ('message' in apiError && apiError.message) return apiError.message;
    return 'An error occurred while saving interaction details.';
  };

  const apiErrorMessage = getApiErrorMessage();
  const isEditing = Boolean(initialValues && ('id' in initialValues || initialValues.summary || initialValues.notes));
  const defaultTitle = isEditing ? 'Edit Interaction' : 'Add New Interaction';
  const displayTitle = title ?? defaultTitle;
  const defaultSubmitLabel = isEditing ? 'Save Interaction' : 'Create Interaction';
  const displaySubmitLabel = submitLabel ?? defaultSubmitLabel;

  const formatTypeLabel = (t: string) => {
    if (!t) return t;
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  return (
    <div
      className={className}
      style={{
        backgroundColor: colors.surface.containerLowest,
        borderRadius: rounded.lg,
        border: `1px solid ${colors.borderVariant}`,
        padding: spacing.xl,
        maxWidth: '640px',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 4px 20px rgba(115, 92, 65, 0.08)',
        ...style,
      }}
    >
      <h2
        style={{
          fontFamily: typography['headline-sm'].fontFamily,
          fontSize: typography['headline-sm'].fontSize,
          fontWeight: typography['headline-sm'].fontWeight,
          lineHeight: typography['headline-sm'].lineHeight,
          color: colors.onSurface,
          marginTop: 0,
          marginBottom: spacing.lg,
        }}
      >
        {displayTitle}
      </h2>

      {apiErrorMessage && (
        <div style={{ marginBottom: spacing.lg }}>
          <ErrorAlert message={apiErrorMessage} role="alert" />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Interaction Date Field (Required) */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={dateInputId}
            style={{
              display: 'block',
              fontFamily: typography.labelCaps.fontFamily,
              fontSize: typography.labelCaps.fontSize,
              fontWeight: typography.labelCaps.fontWeight,
              letterSpacing: typography.labelCaps.letterSpacing,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            Date <span style={{ color: colors.error }}>*</span>
          </label>
          <input
            id={dateInputId}
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={pending}
            aria-required="true"
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? `${dateInputId}-error` : undefined}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${errors.date ? colors.error : colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.date && (
            <p
              id={`${dateInputId}-error`}
              role="alert"
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.error,
                marginTop: spacing.xs,
                marginBottom: 0,
              }}
            >
              {errors.date}
            </p>
          )}
        </div>

        {/* Interaction Type Dropdown (Required) */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={typeSelectId}
            style={{
              display: 'block',
              fontFamily: typography.labelCaps.fontFamily,
              fontSize: typography.labelCaps.fontSize,
              fontWeight: typography.labelCaps.fontWeight,
              letterSpacing: typography.labelCaps.letterSpacing,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            Interaction Type <span style={{ color: colors.error }}>*</span>
          </label>
          <select
            id={typeSelectId}
            name="type"
            value={formData.type}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={pending}
            aria-required="true"
            aria-invalid={Boolean(errors.type)}
            aria-describedby={errors.type ? `${typeSelectId}-error` : undefined}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${errors.type ? colors.error : colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {formatTypeLabel(t)}
              </option>
            ))}
          </select>
          {errors.type && (
            <p
              id={`${typeSelectId}-error`}
              role="alert"
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.error,
                marginTop: spacing.xs,
                marginBottom: 0,
              }}
            >
              {errors.type}
            </p>
          )}
        </div>

        {/* Summary Field (Required) */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={summaryInputId}
            style={{
              display: 'block',
              fontFamily: typography.labelCaps.fontFamily,
              fontSize: typography.labelCaps.fontSize,
              fontWeight: typography.labelCaps.fontWeight,
              letterSpacing: typography.labelCaps.letterSpacing,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
            }}
          >
            Summary <span style={{ color: colors.error }}>*</span>
          </label>
          <textarea
            id={summaryInputId}
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={pending}
            rows={3}
            placeholder="Describe the interaction notes or outcome..."
            aria-required="true"
            aria-invalid={Boolean(errors.summary)}
            aria-describedby={errors.summary ? `${summaryInputId}-error` : undefined}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${errors.summary ? colors.error : colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          {errors.summary && (
            <p
              id={`${summaryInputId}-error`}
              role="alert"
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.error,
                marginTop: spacing.xs,
                marginBottom: 0,
              }}
            >
              {errors.summary}
            </p>
          )}
        </div>

        {/* Company Dropdown (Nullable) */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={companySelectId}
            style={{
              display: 'block',
              fontFamily: typography.labelCaps.fontFamily,
              fontSize: typography.labelCaps.fontSize,
              fontWeight: typography.labelCaps.fontWeight,
              letterSpacing: typography.labelCaps.letterSpacing,
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
            aria-invalid={Boolean(errors.company_id)}
            aria-describedby={errors.company_id ? `${companySelectId}-error` : undefined}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${errors.company_id ? colors.error : colors.borderVariant}`,
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
          {errors.company_id && (
            <p
              id={`${companySelectId}-error`}
              role="alert"
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.error,
                marginTop: spacing.xs,
                marginBottom: 0,
              }}
            >
              {errors.company_id}
            </p>
          )}
        </div>

        {/* Contact Dropdown (Nullable) */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={contactSelectId}
            style={{
              display: 'block',
              fontFamily: typography.labelCaps.fontFamily,
              fontSize: typography.labelCaps.fontSize,
              fontWeight: typography.labelCaps.fontWeight,
              letterSpacing: typography.labelCaps.letterSpacing,
              color: colors.onSurfaceVariant,
              textTransform: 'uppercase',
              marginBottom: spacing.xs,
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
            aria-invalid={Boolean(errors.contact_id)}
            aria-describedby={errors.contact_id ? `${contactSelectId}-error` : undefined}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${errors.contact_id ? colors.error : colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">-- No Contact --</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
          {errors.contact_id && (
            <p
              id={`${contactSelectId}-error`}
              role="alert"
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.error,
                marginTop: spacing.xs,
                marginBottom: 0,
              }}
            >
              {errors.contact_id}
            </p>
          )}
        </div>

        {/* Lead Dropdown (Nullable) */}
        <div style={{ marginBottom: spacing.lg }}>
          <label
            htmlFor={leadSelectId}
            style={{
              display: 'block',
              fontFamily: typography.labelCaps.fontFamily,
              fontSize: typography.labelCaps.fontSize,
              fontWeight: typography.labelCaps.fontWeight,
              letterSpacing: typography.labelCaps.letterSpacing,
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
            aria-invalid={Boolean(errors.lead_id)}
            aria-describedby={errors.lead_id ? `${leadSelectId}-error` : undefined}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${errors.lead_id ? colors.error : colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">-- No Lead --</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.title || lead.name || `Lead #${lead.id}`}
              </option>
            ))}
          </select>
          {errors.lead_id && (
            <p
              id={`${leadSelectId}-error`}
              role="alert"
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.error,
                marginTop: spacing.xs,
                marginBottom: 0,
              }}
            >
              {errors.lead_id}
            </p>
          )}
        </div>

        {/* Owner Field (Optional) */}
        <div style={{ marginBottom: spacing.xl }}>
          <label
            htmlFor={ownerInputId}
            style={{
              display: 'block',
              fontFamily: typography.labelCaps.fontFamily,
              fontSize: typography.labelCaps.fontSize,
              fontWeight: typography.labelCaps.fontWeight,
              letterSpacing: typography.labelCaps.letterSpacing,
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
            placeholder="Assignee / Owner name"
            aria-invalid={Boolean(errors.owner)}
            aria-describedby={errors.owner ? `${ownerInputId}-error` : undefined}
            style={{
              width: '100%',
              padding: `${spacing.sm} ${spacing.md}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              color: colors.onSurface,
              backgroundColor: colors.surface.containerLow,
              border: `1px solid ${errors.owner ? colors.error : colors.borderVariant}`,
              borderRadius: rounded.sm,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {errors.owner && (
            <p
              id={`${ownerInputId}-error`}
              role="alert"
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.error,
                marginTop: spacing.xs,
                marginBottom: 0,
              }}
            >
              {errors.owner}
            </p>
          )}
        </div>

        {/* Form Action Buttons */}
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
                color: colors.onSurfaceVariant,
                backgroundColor: 'transparent',
                border: `1px solid ${colors.borderVariant}`,
                borderRadius: rounded.md,
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
              padding: `${spacing.sm} ${spacing.lg}`,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              fontWeight: 500,
              color: colors.onPrimary,
              backgroundColor: colors.primary,
              border: 'none',
              borderRadius: rounded.md,
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Saving...' : displaySubmitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};
