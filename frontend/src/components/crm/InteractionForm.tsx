import React, { useState, useEffect } from 'react';
import { colors, radii, spacing, typography } from '../../lib/tokens';
import { Interaction } from '../../services/crm';

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

export interface InteractionFormProps {
  initialValues?: Partial<InteractionFormData> | Interaction | null;
  companies?: CompanyOption[];
  contacts?: ContactOption[];
  leads?: LeadOption[];
  onSubmit: (data: InteractionFormData) => void | Promise<void>;
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

export const INTERACTION_TYPE_OPTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Note', value: 'note' },
] as const;

const formatDateValue = (val?: string | Date | null): string => {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.split('T')[0];
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  return '';
};

const getInitialFormData = (
  initialValues?: Partial<InteractionFormData> | Interaction | null
): InteractionFormData => {
  if (!initialValues) {
    return {
      date: '',
      type: 'note',
      summary: '',
      company_id: null,
      contact_id: null,
      lead_id: null,
      notes: '',
      owner: '',
    };
  }

  const record = initialValues as Record<string, unknown>;

  const dateVal =
    typeof record.date === 'string' || record.date instanceof Date
      ? formatDateValue(record.date as string | Date)
      : typeof record.timestamp === 'string' || record.timestamp instanceof Date
      ? formatDateValue(record.timestamp as string | Date)
      : '';

  const typeVal =
    typeof record.type === 'string' && record.type ? record.type : 'note';

  const summaryVal =
    typeof record.summary === 'string'
      ? record.summary
      : typeof record.notes === 'string'
      ? record.notes
      : typeof record.title === 'string'
      ? record.title
      : typeof record.name === 'string'
      ? record.name
      : '';

  const companyIdVal =
    typeof record.company_id === 'number' ? record.company_id : null;

  const contactIdVal =
    typeof record.contact_id === 'number' ? record.contact_id : null;

  const leadIdVal =
    typeof record.lead_id === 'number' ? record.lead_id : null;

  return {
    date: dateVal,
    type: typeVal,
    summary: summaryVal,
    company_id: companyIdVal,
    contact_id: contactIdVal,
    lead_id: leadIdVal,
    notes: typeof record.notes === 'string' ? record.notes : summaryVal,
    owner: typeof record.owner === 'string' ? record.owner : '',
  };
};

export const InteractionForm: React.FC<InteractionFormProps> = ({
  initialValues,
  companies = [],
  contacts = [],
  leads = [],
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Interaction',
  cancelLabel = 'Cancel',
  serverError,
  serverFieldErrors = {},
  className = '',
  style,
  'data-testid': testId = 'interaction-form',
}) => {
  const [formData, setFormData] = useState<InteractionFormData>(() =>
    getInitialFormData(initialValues)
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialValues) {
      setFormData(getInitialFormData(initialValues));
    }
  }, [initialValues]);

  const handleChange = (
    field: keyof InteractionFormData,
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

  const handleBlur = (field: keyof InteractionFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    if (err) {
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const validateField = (
    field: keyof InteractionFormData,
    value?: any
  ): string | null => {
    let errorMsg: string | null = null;

    if (field === 'date') {
      if (!value || typeof value !== 'string' || !value.trim()) {
        errorMsg = 'Interaction date is required';
      }
    } else if (field === 'type') {
      if (!value || typeof value !== 'string' || !value.trim()) {
        errorMsg = 'Interaction type is required';
      }
    } else if (field === 'summary') {
      if (!value || typeof value !== 'string' || !value.trim()) {
        errorMsg = 'Interaction summary is required';
      }
    }

    return errorMsg;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const dateErr = validateField('date', formData.date);
    if (dateErr) newErrors.date = dateErr;

    const typeErr = validateField('type', formData.type);
    if (typeErr) newErrors.type = typeErr;

    const summaryErr = validateField('summary', formData.summary);
    if (summaryErr) newErrors.summary = summaryErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    });

    if (!validateForm()) {
      return;
    }

    try {
      const summaryTrimmed = formData.summary.trim();
      await onSubmit({
        date: formData.date,
        type: formData.type.trim(),
        summary: summaryTrimmed,
        company_id: formData.company_id ?? null,
        contact_id: formData.contact_id ?? null,
        lead_id: formData.lead_id ?? null,
        notes: summaryTrimmed,
        owner: formData.owner?.trim() || undefined,
      });
    } catch {
      // Submission error handled externally
    }
  };

  const getDateError = (): string | undefined => {
    return errors.date || serverFieldErrors.date || serverFieldErrors.timestamp;
  };

  const getTypeError = (): string | undefined => {
    return errors.type || serverFieldErrors.type;
  };

  const getSummaryError = (): string | undefined => {
    return (
      errors.summary ||
      errors.notes ||
      serverFieldErrors.summary ||
      serverFieldErrors.notes
    );
  };

  const dateError = getDateError();
  const typeError = getTypeError();
  const summaryError = getSummaryError();

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
          data-testid="interaction-form-server-error"
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

      {/* Date Field (Required) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="interaction-date"
          style={{
            ...typography.styles.labelCaps,
            color: dateError ? colors.error.main : colors.surface.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          Date
          <span style={{ color: colors.error.main }}>*</span>
        </label>
        <input
          id="interaction-date"
          name="date"
          type="date"
          disabled={isLoading}
          value={formData.date}
          onChange={(e) => handleChange('date', e.target.value)}
          onBlur={() => handleBlur('date')}
          aria-invalid={!!dateError}
          aria-describedby={dateError ? 'interaction-date-error' : undefined}
          data-testid="interaction-date-input"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${dateError ? colors.error.main : colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
          }}
        />
        {dateError && (
          <span
            id="interaction-date-error"
            data-testid="interaction-date-error"
            role="alert"
            style={{
              color: colors.error.main,
              fontSize: typography.styles.caption.fontSize,
              fontFamily: typography.fontFamilies.sans,
            }}
          >
            {dateError}
          </span>
        )}
      </div>

      {/* Type Field (Required Dropdown) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="interaction-type"
          style={{
            ...typography.styles.labelCaps,
            color: typeError ? colors.error.main : colors.surface.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          Type
          <span style={{ color: colors.error.main }}>*</span>
        </label>
        <select
          id="interaction-type"
          name="type"
          disabled={isLoading}
          value={formData.type}
          onChange={(e) => handleChange('type', e.target.value)}
          onBlur={() => handleBlur('type')}
          aria-invalid={!!typeError}
          aria-describedby={typeError ? 'interaction-type-error' : undefined}
          data-testid="interaction-type-select"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${typeError ? colors.error.main : colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
          }}
        >
          <option value="">-- Select Type --</option>
          {INTERACTION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {typeError && (
          <span
            id="interaction-type-error"
            data-testid="interaction-type-error"
            role="alert"
            style={{
              color: colors.error.main,
              fontSize: typography.styles.caption.fontSize,
              fontFamily: typography.fontFamilies.sans,
            }}
          >
            {typeError}
          </span>
        )}
      </div>

      {/* Summary Field (Required Textarea) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="interaction-summary"
          style={{
            ...typography.styles.labelCaps,
            color: summaryError ? colors.error.main : colors.surface.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          Summary
          <span style={{ color: colors.error.main }}>*</span>
        </label>
        <textarea
          id="interaction-summary"
          name="summary"
          rows={3}
          disabled={isLoading}
          value={formData.summary}
          onChange={(e) => handleChange('summary', e.target.value)}
          onBlur={() => handleBlur('summary')}
          aria-invalid={!!summaryError}
          aria-describedby={summaryError ? 'interaction-summary-error' : undefined}
          data-testid="interaction-summary-input"
          placeholder="e.g. Discussed proposal details and next steps"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${summaryError ? colors.error.main : colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
            resize: 'vertical',
          }}
        />
        {summaryError && (
          <span
            id="interaction-summary-error"
            data-testid="interaction-summary-error"
            role="alert"
            style={{
              color: colors.error.main,
              fontSize: typography.styles.caption.fontSize,
              fontFamily: typography.fontFamilies.sans,
            }}
          >
            {summaryError}
          </span>
        )}
      </div>

      {/* Company Dropdown (Nullable) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="interaction-company"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Company
        </label>
        <select
          id="interaction-company"
          name="company_id"
          disabled={isLoading}
          value={formData.company_id ?? ''}
          onChange={(e) =>
            handleChange('company_id', e.target.value ? Number(e.target.value) : null)
          }
          onBlur={() => handleBlur('company_id')}
          data-testid="interaction-company-select"
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
          htmlFor="interaction-contact"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Contact
        </label>
        <select
          id="interaction-contact"
          name="contact_id"
          disabled={isLoading}
          value={formData.contact_id ?? ''}
          onChange={(e) =>
            handleChange('contact_id', e.target.value ? Number(e.target.value) : null)
          }
          onBlur={() => handleBlur('contact_id')}
          data-testid="interaction-contact-select"
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

      {/* Lead Dropdown (Nullable) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="interaction-lead"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Lead
        </label>
        <select
          id="interaction-lead"
          name="lead_id"
          disabled={isLoading}
          value={formData.lead_id ?? ''}
          onChange={(e) =>
            handleChange('lead_id', e.target.value ? Number(e.target.value) : null)
          }
          onBlur={() => handleBlur('lead_id')}
          data-testid="interaction-lead-select"
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
          <option value="">Unassigned / No lead</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.title || lead.name || `Lead #${lead.id}`}
            </option>
          ))}
        </select>
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
            data-testid="interaction-cancel-button"
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
          data-testid="interaction-submit-button"
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
            opacity: isLoading ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};
