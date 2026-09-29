import React, { useState, useEffect } from 'react';
import { colors, radii, spacing, typography } from '../../lib/tokens';
import { Task } from '../../services/crm';

export interface CompanyOption {
  id: number;
  name: string;
}

export interface LeadOption {
  id: number;
  title?: string;
  name?: string;
}

export interface ContactOption {
  id: number;
  name: string;
}

export interface TaskFormData {
  description: string;
  title?: string;
  due_date: string;
  completed: boolean;
  company_id?: number | null;
  lead_id?: number | null;
  contact_id?: number | null;
  owner?: string;
}

export interface TaskFormProps {
  initialValues?: Partial<TaskFormData> | Task | null;
  companies?: CompanyOption[];
  leads?: LeadOption[];
  contacts?: ContactOption[];
  onSubmit: (data: TaskFormData) => void | Promise<void>;
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

const getInitialFormData = (initialValues?: Partial<TaskFormData> | Task | null): TaskFormData => {
  if (!initialValues) {
    return {
      description: '',
      title: '',
      due_date: '',
      completed: false,
      company_id: null,
      lead_id: null,
      contact_id: null,
      owner: '',
    };
  }

  const record = initialValues as Record<string, unknown>;

  const desc =
    typeof record.description === 'string'
      ? record.description
      : typeof record.title === 'string'
      ? record.title
      : typeof record.name === 'string'
      ? record.name
      : '';

  const dueDateStr =
    typeof record.due_date === 'string' || record.due_date instanceof Date
      ? formatDateValue(record.due_date)
      : '';

  const completedVal =
    typeof record.completed === 'boolean'
      ? record.completed
      : false;

  const companyIdVal =
    typeof record.company_id === 'number' ? record.company_id : null;

  const leadIdVal =
    typeof record.lead_id === 'number' ? record.lead_id : null;

  const contactIdVal =
    typeof record.contact_id === 'number' ? record.contact_id : null;

  const ownerVal =
    typeof record.owner === 'string' ? record.owner : '';

  return {
    description: desc,
    title: desc,
    due_date: dueDateStr,
    completed: completedVal,
    company_id: companyIdVal,
    lead_id: leadIdVal,
    contact_id: contactIdVal,
    owner: ownerVal,
  };
};

export const TaskForm: React.FC<TaskFormProps> = ({
  initialValues,
  companies = [],
  leads = [],
  contacts = [],
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Task',
  cancelLabel = 'Cancel',
  serverError,
  serverFieldErrors = {},
  className = '',
  style,
  'data-testid': testId = 'task-form',
}) => {
  const [formData, setFormData] = useState<TaskFormData>(() => getInitialFormData(initialValues));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialValues) {
      setFormData(getInitialFormData(initialValues));
    }
  }, [initialValues]);

  const handleChange = <K extends keyof TaskFormData>(field: K, value: TaskFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: keyof TaskFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field: keyof TaskFormData, value?: unknown): string | null => {
    let errorMsg: string | null = null;
    if (field === 'description' || field === 'title') {
      if (!value || typeof value !== 'string' || !value.trim()) {
        errorMsg = 'Task description is required';
      }
    } else if (field === 'due_date') {
      if (!value || (typeof value === 'string' && !value.trim())) {
        errorMsg = 'Due date is required';
      }
      // Edge Case 3: Setting due_date to a past date is allowed.
    }
    return errorMsg;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const descError = validateField('description', formData.description);
    if (descError) {
      newErrors.description = descError;
    }

    const dueDateError = validateField('due_date', formData.due_date);
    if (dueDateError) {
      newErrors.due_date = dueDateError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      description: true,
      due_date: true,
      completed: true,
      company_id: true,
      lead_id: true,
      contact_id: true,
      owner: true,
    });

    if (!validateForm()) {
      return;
    }

    try {
      const descTrimmed = formData.description.trim();
      await onSubmit({
        description: descTrimmed,
        title: descTrimmed,
        due_date: formData.due_date,
        completed: Boolean(formData.completed),
        company_id: formData.company_id ?? null,
        lead_id: formData.lead_id ?? null,
        contact_id: formData.contact_id ?? null,
        owner: formData.owner?.trim() || undefined,
      });
    } catch {
      // Submission error handled externally
    }
  };

  const getDescriptionError = (): string | undefined => {
    return errors.description || errors.title || serverFieldErrors.description || serverFieldErrors.title;
  };

  const getDueDateError = (): string | undefined => {
    return errors.due_date || serverFieldErrors.due_date;
  };

  const descriptionError = getDescriptionError();
  const dueDateError = getDueDateError();

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
          data-testid="task-form-server-error"
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

      {/* Description Field (Required) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="task-description"
          style={{
            ...typography.styles.labelCaps,
            color: descriptionError ? colors.error.main : colors.surface.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          Description
          <span style={{ color: colors.error.main }}>*</span>
        </label>
        <textarea
          id="task-description"
          name="description"
          rows={3}
          disabled={isLoading}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          aria-invalid={!!descriptionError}
          aria-describedby={descriptionError ? 'task-description-error' : undefined}
          data-testid="task-description-input"
          placeholder="e.g. Follow up on proposal with client"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${descriptionError ? colors.error.main : colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
            resize: 'vertical',
          }}
        />
        {descriptionError && (
          <span
            id="task-description-error"
            data-testid="task-description-error"
            role="alert"
            style={{
              color: colors.error.main,
              fontSize: typography.styles.caption.fontSize,
              fontFamily: typography.fontFamilies.sans,
            }}
          >
            {descriptionError}
          </span>
        )}
      </div>

      {/* Due Date Field (Required) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="task-due-date"
          style={{
            ...typography.styles.labelCaps,
            color: dueDateError ? colors.error.main : colors.surface.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          Due Date
          <span style={{ color: colors.error.main }}>*</span>
        </label>
        <input
          id="task-due-date"
          name="due_date"
          type="date"
          disabled={isLoading}
          value={formData.due_date}
          onChange={(e) => handleChange('due_date', e.target.value)}
          onBlur={() => handleBlur('due_date')}
          aria-invalid={!!dueDateError}
          aria-describedby={dueDateError ? 'task-due-date-error' : undefined}
          data-testid="task-due-date-input"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${dueDateError ? colors.error.main : colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
          }}
        />
        {dueDateError && (
          <span
            id="task-due-date-error"
            data-testid="task-due-date-error"
            role="alert"
            style={{
              color: colors.error.main,
              fontSize: typography.styles.caption.fontSize,
              fontFamily: typography.fontFamilies.sans,
            }}
          >
            {dueDateError}
          </span>
        )}
      </div>

      {/* Completed Checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] }}>
        <input
          id="task-completed"
          name="completed"
          type="checkbox"
          disabled={isLoading}
          checked={formData.completed}
          onChange={(e) => handleChange('completed', e.target.checked)}
          data-testid="task-completed-checkbox"
          style={{
            width: '18px',
            height: '18px',
            accentColor: colors.accent.primary,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        />
        <label
          htmlFor="task-completed"
          style={{
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            color: colors.surface.onSurface,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          Mark task as completed
        </label>
      </div>

      {/* Company Dropdown (Nullable) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="task-company"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Company
        </label>
        <select
          id="task-company"
          name="company_id"
          disabled={isLoading}
          value={formData.company_id ?? ''}
          onChange={(e) =>
            handleChange('company_id', e.target.value ? Number(e.target.value) : null)
          }
          onBlur={() => handleBlur('company_id')}
          data-testid="task-company-select"
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

      {/* Lead Dropdown (Nullable) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="task-lead"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Lead
        </label>
        <select
          id="task-lead"
          name="lead_id"
          disabled={isLoading}
          value={formData.lead_id ?? ''}
          onChange={(e) =>
            handleChange('lead_id', e.target.value ? Number(e.target.value) : null)
          }
          onBlur={() => handleBlur('lead_id')}
          data-testid="task-lead-select"
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

      {/* Contact Dropdown (Nullable) */}
      {contacts && contacts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
          <label
            htmlFor="task-contact"
            style={{
              ...typography.styles.labelCaps,
              color: colors.surface.onSurfaceVariant,
            }}
          >
            Contact
          </label>
          <select
            id="task-contact"
            name="contact_id"
            disabled={isLoading}
            value={formData.contact_id ?? ''}
            onChange={(e) =>
              handleChange('contact_id', e.target.value ? Number(e.target.value) : null)
            }
            onBlur={() => handleBlur('contact_id')}
            data-testid="task-contact-select"
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
      )}

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
            data-testid="task-cancel-button"
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
          data-testid="task-submit-button"
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
