import React, { useState, useEffect } from 'react';
import { colors, radii, spacing, typography } from '../../lib/tokens';
import { Lead } from '../../services/crm';

export interface CompanyOption {
  id: number;
  name: string;
}

export interface ContactOption {
  id: number;
  name: string;
}

export interface LeadFormData {
  title: string;
  company_id?: number | null;
  contact_id?: number | null;
  value: number | string;
  status: string;
  expected_close_date?: string | null;
  notes?: string;
  owner?: string;
}

export interface LeadFormProps {
  initialValues?: Partial<LeadFormData> | Lead | null;
  companies?: CompanyOption[];
  contacts?: ContactOption[];
  onSubmit: (data: LeadFormData) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  serverError?: string | null;
  serverFieldErrors?: Record<string, string>;
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export const LEAD_STATUS_OPTIONS = [
  'Prospecting',
  'Qualified',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
] as const;

export const LeadForm: React.FC<LeadFormProps> = ({
  initialValues,
  companies = [],
  contacts = [],
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Lead',
  cancelLabel = 'Cancel',
  serverError,
  serverFieldErrors = {},
  className = '',
  style,
  'data-testid': testId = 'lead-form',
}) => {
  const [formData, setFormData] = useState<LeadFormData>({
    title: initialValues?.title || (initialValues as any)?.name || '',
    company_id: initialValues?.company_id !== undefined ? initialValues.company_id : null,
    contact_id: initialValues?.contact_id !== undefined ? initialValues.contact_id : null,
    value: initialValues?.value !== undefined && initialValues?.value !== null ? initialValues.value : '',
    status: initialValues?.status || 'Prospecting',
    expected_close_date: initialValues?.expected_close_date || null,
    notes: (initialValues as any)?.notes || '',
    owner: (initialValues as any)?.owner || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialValues) {
      setFormData({
        title: initialValues.title || (initialValues as any)?.name || '',
        company_id: initialValues.company_id !== undefined ? initialValues.company_id : null,
        contact_id: initialValues.contact_id !== undefined ? initialValues.contact_id : null,
        value: initialValues.value !== undefined && initialValues.value !== null ? initialValues.value : '',
        status: initialValues.status || 'Prospecting',
        expected_close_date: initialValues.expected_close_date || null,
        notes: (initialValues as any)?.notes || '',
        owner: (initialValues as any)?.owner || '',
      });
    }
  }, [initialValues]);

  const handleChange = (
    field: keyof LeadFormData,
    value: any
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: keyof LeadFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field: keyof LeadFormData, value?: any): string | null => {
    let errorMsg: string | null = null;
    if (field === 'title') {
      if (!value || typeof value !== 'string' || !value.trim()) {
        errorMsg = 'Lead title is required';
      }
    } else if (field === 'value') {
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (typeof value === 'string' && !value.trim())
      ) {
        errorMsg = 'Lead value is required';
      } else {
        const numVal = Number(value);
        if (isNaN(numVal)) {
          errorMsg = 'Lead value must be a valid number';
        } else if (numVal < 0) {
          errorMsg = 'Lead value cannot be negative';
        }
      }
    } else if (field === 'status') {
      if (!value || typeof value !== 'string' || !value.trim()) {
        errorMsg = 'Status is required';
      }
    }
    return errorMsg;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const titleError = validateField('title', formData.title);
    if (titleError) {
      newErrors.title = titleError;
    }

    const valueError = validateField('value', formData.value);
    if (valueError) {
      newErrors.value = valueError;
    }

    const statusError = validateField('status', formData.status);
    if (statusError) {
      newErrors.status = statusError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        title: formData.title.trim(),
        company_id: formData.company_id ?? null,
        contact_id: formData.contact_id ?? null,
        value: Number(formData.value),
        status: formData.status || 'Prospecting',
        expected_close_date: formData.expected_close_date || null,
        notes: formData.notes?.trim() || undefined,
        owner: formData.owner?.trim() || undefined,
      });
    } catch (err) {
      // Submission error handled externally
    }
  };

  const getTitleError = (): string | undefined => {
    return errors.title || serverFieldErrors.title;
  };

  const getValueError = (): string | undefined => {
    return errors.value || serverFieldErrors.value;
  };

  const getStatusError = (): string | undefined => {
    return errors.status || serverFieldErrors.status;
  };

  const titleError = getTitleError();
  const valueError = getValueError();
  const statusError = getStatusError();

  return (
    <form
      data-testid={testId}
      onSubmit={handleSubmit}
      className={className}
      noValidate
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
        backgroundColor: colors.surface.containerLowest,
        borderRadius: radii.md,
        padding: spacing[6],
        border: `1px solid ${colors.surface.outlineVariant}`,
        boxShadow: '0 4px 12px rgba(115, 92, 65, 0.05)',
        ...style,
      }}
    >
      {/* Top-level Server Error */}
      {serverError && (
        <div
          data-testid="lead-form-server-error"
          role="alert"
          style={{
            padding: `${spacing[3]} ${spacing[4]}`,
            backgroundColor: colors.error.container,
            border: `1px solid ${colors.error.main}`,
            borderRadius: radii.sm,
            color: colors.error.onContainer,
            fontSize: typography.styles.caption.fontSize,
            fontFamily: typography.fontFamilies.sans,
          }}
        >
          {serverError}
        </div>
      )}

      {/* Title Field (Required) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="lead-title"
          style={{
            ...typography.styles.labelCaps,
            color: titleError ? colors.error.main : colors.surface.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          Title
          <span style={{ color: colors.error.main }}>*</span>
        </label>
        <input
          id="lead-title"
          name="title"
          type="text"
          disabled={isLoading}
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          onBlur={() => handleBlur('title')}
          aria-invalid={!!titleError}
          aria-describedby={titleError ? 'lead-title-error' : undefined}
          data-testid="lead-title-input"
          placeholder="e.g. Enterprise Software License"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${titleError ? colors.error.main : colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />
        {titleError && (
          <span
            id="lead-title-error"
            data-testid="lead-title-error"
            role="alert"
            style={{
              color: colors.error.main,
              fontSize: typography.styles.caption.fontSize,
              fontFamily: typography.fontFamilies.sans,
            }}
          >
            {titleError}
          </span>
        )}
      </div>

      {/* Company Dropdown (Nullable) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="lead-company"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Company
        </label>
        <select
          id="lead-company"
          name="company_id"
          disabled={isLoading}
          value={formData.company_id ?? ''}
          onChange={(e) =>
            handleChange('company_id', e.target.value ? Number(e.target.value) : null)
          }
          onBlur={() => handleBlur('company_id')}
          data-testid="lead-company-select"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
          }}
        >
          <option value="">Unassigned / No company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {/* Contact Dropdown (Nullable) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="lead-contact"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Contact
        </label>
        <select
          id="lead-contact"
          name="contact_id"
          disabled={isLoading}
          value={formData.contact_id ?? ''}
          onChange={(e) =>
            handleChange('contact_id', e.target.value ? Number(e.target.value) : null)
          }
          onBlur={() => handleBlur('contact_id')}
          data-testid="lead-contact-select"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
          }}
        >
          <option value="">Unassigned / No contact</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
      </div>

      {/* Value Field (Required, numeric >= 0) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="lead-value"
          style={{
            ...typography.styles.labelCaps,
            color: valueError ? colors.error.main : colors.surface.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          Value ($)
          <span style={{ color: colors.error.main }}>*</span>
        </label>
        <input
          id="lead-value"
          name="value"
          type="number"
          step="any"
          disabled={isLoading}
          value={formData.value}
          onChange={(e) => handleChange('value', e.target.value)}
          onBlur={() => handleBlur('value')}
          aria-invalid={!!valueError}
          aria-describedby={valueError ? 'lead-value-error' : undefined}
          data-testid="lead-value-input"
          placeholder="e.g. 50000"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${valueError ? colors.error.main : colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />
        {valueError && (
          <span
            id="lead-value-error"
            data-testid="lead-value-error"
            role="alert"
            style={{
              color: colors.error.main,
              fontSize: typography.styles.caption.fontSize,
              fontFamily: typography.fontFamilies.sans,
            }}
          >
            {valueError}
          </span>
        )}
      </div>

      {/* Status Dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="lead-status"
          style={{
            ...typography.styles.labelCaps,
            color: statusError ? colors.error.main : colors.surface.onSurfaceVariant,
          }}
        >
          Status
        </label>
        <select
          id="lead-status"
          name="status"
          disabled={isLoading}
          value={formData.status}
          onChange={(e) => handleChange('status', e.target.value)}
          onBlur={() => handleBlur('status')}
          data-testid="lead-status-select"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${statusError ? colors.error.main : colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
          }}
        >
          {LEAD_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {statusError && (
          <span
            id="lead-status-error"
            data-testid="lead-status-error"
            role="alert"
            style={{
              color: colors.error.main,
              fontSize: typography.styles.caption.fontSize,
              fontFamily: typography.fontFamilies.sans,
            }}
          >
            {statusError}
          </span>
        )}
      </div>

      {/* Expected Close Date Field (Nullable) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="lead-expected-close-date"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Expected Close Date
        </label>
        <input
          id="lead-expected-close-date"
          name="expected_close_date"
          type="date"
          disabled={isLoading}
          value={formData.expected_close_date || ''}
          onChange={(e) => handleChange('expected_close_date', e.target.value || null)}
          onBlur={() => handleBlur('expected_close_date')}
          data-testid="lead-expected-close-date-input"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
          }}
        />
      </div>

      {/* Form Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: spacing[3],
          marginTop: spacing[2],
        }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="lead-cancel-button"
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              fontSize: typography.styles.bodyMd.fontSize,
              fontFamily: typography.fontFamilies.sans,
              fontWeight: 500,
              borderRadius: radii.sm,
              border: `1px solid ${colors.surface.outlineVariant}`,
              backgroundColor: 'transparent',
              color: colors.surface.onSurface,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          data-testid="lead-submit-button"
          style={{
            padding: `${spacing[2]} ${spacing[5]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            fontWeight: 500,
            borderRadius: radii.sm,
            border: 'none',
            backgroundColor: colors.accent.primary,
            color: colors.accent.onPrimary,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            boxShadow: '0 2px 4px rgba(115, 92, 65, 0.1)',
          }}
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};
