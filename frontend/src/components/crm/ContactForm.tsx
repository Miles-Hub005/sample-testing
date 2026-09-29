import React, { useState, useEffect } from 'react';
import { colors, radii, spacing, typography } from '../../lib/tokens';
import { Contact } from '../../services/crm';

export interface CompanyOption {
  id: number;
  name: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  company_id?: number | null;
  notes?: string;
  owner?: string;
}

export interface ContactFormProps {
  initialValues?: Partial<ContactFormData> | Contact | null;
  companies?: CompanyOption[];
  onSubmit: (data: ContactFormData) => void | Promise<void>;
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

export const ContactForm: React.FC<ContactFormProps> = ({
  initialValues,
  companies = [],
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Contact',
  cancelLabel = 'Cancel',
  serverError,
  serverFieldErrors = {},
  className = '',
  style,
  'data-testid': testId = 'contact-form',
}) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: initialValues?.name || '',
    email: initialValues?.email || '',
    phone: (initialValues as any)?.phone || '',
    role: (initialValues as any)?.role || '',
    company_id: initialValues?.company_id !== undefined ? initialValues.company_id : null,
    notes: (initialValues as any)?.notes || '',
    owner: (initialValues as any)?.owner || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || '',
        email: initialValues.email || '',
        phone: (initialValues as any)?.phone || '',
        role: (initialValues as any)?.role || '',
        company_id: initialValues.company_id !== undefined ? initialValues.company_id : null,
        notes: (initialValues as any)?.notes || '',
        owner: (initialValues as any)?.owner || '',
      });
    }
  }, [initialValues]);

  const handleChange = (
    field: keyof ContactFormData,
    value: string | number | null
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

  const handleBlur = (field: keyof ContactFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field: keyof ContactFormData, value?: any): string | null => {
    let errorMsg: string | null = null;
    if (field === 'name') {
      if (!value || typeof value !== 'string' || !value.trim()) {
        errorMsg = 'Contact name is required';
      }
    } else if (field === 'email') {
      if (!value || typeof value !== 'string' || !value.trim()) {
        errorMsg = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        errorMsg = 'Invalid email format';
      }
    }
    return errorMsg;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameError = validateField('name', formData.name);
    if (nameError) {
      newErrors.name = nameError;
    }

    const emailError = validateField('email', formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      name: true,
      email: true,
      phone: true,
      role: true,
      company_id: true,
      notes: true,
      owner: true,
    });

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || undefined,
        role: formData.role?.trim() || undefined,
        company_id: formData.company_id ?? null,
        notes: formData.notes?.trim() || undefined,
        owner: formData.owner?.trim() || undefined,
      });
    } catch (err) {
      // Submission error handled externally
    }
  };

  const getNameError = (): string | undefined => {
    return errors.name || serverFieldErrors.name;
  };

  const getEmailError = (): string | undefined => {
    return errors.email || serverFieldErrors.email;
  };

  const nameError = getNameError();
  const emailError = getEmailError();

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
          data-testid="contact-form-server-error"
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

      {/* Name Field (Required) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="contact-name"
          style={{
            ...typography.styles.labelCaps,
            color: nameError ? colors.error.main : colors.surface.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          Full Name
          <span style={{ color: colors.error.main }}>*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          disabled={isLoading}
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? 'contact-name-error' : undefined}
          data-testid="contact-name-input"
          placeholder="e.g. Jane Doe"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${nameError ? colors.error.main : colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />
        {nameError && (
          <span
            id="contact-name-error"
            data-testid="contact-name-error"
            role="alert"
            style={{
              color: colors.error.main,
              fontSize: typography.styles.caption.fontSize,
              fontFamily: typography.fontFamilies.sans,
            }}
          >
            {nameError}
          </span>
        )}
      </div>

      {/* Email Field (Required + Format) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="contact-email"
          style={{
            ...typography.styles.labelCaps,
            color: emailError ? colors.error.main : colors.surface.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          Email
          <span style={{ color: colors.error.main }}>*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          disabled={isLoading}
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'contact-email-error' : undefined}
          data-testid="contact-email-input"
          placeholder="e.g. jane.doe@example.com"
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${emailError ? colors.error.main : colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />
        {emailError && (
          <span
            id="contact-email-error"
            data-testid="contact-email-error"
            role="alert"
            style={{
              color: colors.error.main,
              fontSize: typography.styles.caption.fontSize,
              fontFamily: typography.fontFamilies.sans,
            }}
          >
            {emailError}
          </span>
        )}
      </div>

      {/* Phone Field (Optional) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="contact-phone"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Phone
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          disabled={isLoading}
          value={formData.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          data-testid="contact-phone-input"
          placeholder="e.g. +1 (555) 123-4567"
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

      {/* Role Field (Optional) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="contact-role"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Role / Job Title
        </label>
        <input
          id="contact-role"
          name="role"
          type="text"
          disabled={isLoading}
          value={formData.role || ''}
          onChange={(e) => handleChange('role', e.target.value)}
          onBlur={() => handleBlur('role')}
          data-testid="contact-role-input"
          placeholder="e.g. Account Executive"
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

      {/* Company Dropdown (Nullable) - Edge Case 2 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="contact-company"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Company
        </label>
        <select
          id="contact-company"
          name="company_id"
          disabled={isLoading}
          value={formData.company_id ?? ''}
          onChange={(e) =>
            handleChange('company_id', e.target.value ? Number(e.target.value) : null)
          }
          onBlur={() => handleBlur('company_id')}
          data-testid="contact-company-select"
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

      {/* Notes Field (Optional) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="contact-notes"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Notes
        </label>
        <textarea
          id="contact-notes"
          name="notes"
          rows={3}
          disabled={isLoading}
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          onBlur={() => handleBlur('notes')}
          data-testid="contact-notes-input"
          placeholder="Additional notes about this contact..."
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.styles.bodyMd.fontSize,
            fontFamily: typography.fontFamilies.sans,
            borderRadius: radii.sm,
            border: `1px solid ${colors.surface.outlineVariant}`,
            backgroundColor: colors.surface.containerLowest,
            color: colors.surface.onSurface,
            outline: 'none',
            resize: 'vertical',
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
            data-testid="contact-cancel-button"
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
          data-testid="contact-submit-button"
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
