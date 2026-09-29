import React, { useState, useEffect } from 'react';
import { colors, radii, spacing, typography } from '../../lib/tokens';
import { Company } from '../../services/crm';

export interface CompanyFormData {
  name: string;
  industry?: string;
  website?: string;
  notes?: string;
  email?: string;
  owner?: string;
}

export interface CompanyFormProps {
  initialValues?: Partial<CompanyFormData> | Company | null;
  onSubmit: (data: CompanyFormData) => void | Promise<void>;
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

export const CompanyForm: React.FC<CompanyFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Company',
  cancelLabel = 'Cancel',
  serverError,
  serverFieldErrors = {},
  className = '',
  style,
  'data-testid': testId = 'company-form',
}) => {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: initialValues?.name || '',
    industry: initialValues?.industry || '',
    website: initialValues?.website || '',
    notes: initialValues?.notes || '',
    email: (initialValues as any)?.email || '',
    owner: (initialValues as any)?.owner || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || '',
        industry: initialValues.industry || '',
        website: initialValues.website || '',
        notes: initialValues.notes || '',
        email: (initialValues as any)?.email || '',
        owner: (initialValues as any)?.owner || '',
      });
    }
  }, [initialValues]);

  const handleChange = (
    field: keyof CompanyFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear inline error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: keyof CompanyFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field: keyof CompanyFormData, value?: string): string | null => {
    let errorMsg: string | null = null;
    if (field === 'name') {
      if (!value || !value.trim()) {
        errorMsg = 'Company name is required';
      }
    } else if (field === 'email') {
      if (value && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
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

    if (formData.email) {
      const emailError = validateField('email', formData.email);
      if (emailError) {
        newErrors.email = emailError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Touch all required fields
    setTouched({
      name: true,
      industry: true,
      website: true,
      notes: true,
      email: true,
      owner: true,
    });

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        name: formData.name.trim(),
        industry: formData.industry?.trim() || undefined,
        website: formData.website?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        owner: formData.owner?.trim() || undefined,
      });
    } catch (err) {
      // Handle async submission errors if not handled externally
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
          data-testid="company-form-server-error"
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
          htmlFor="company-name"
          style={{
            ...typography.styles.labelCaps,
            color: nameError ? colors.error.main : colors.surface.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          Company Name
          <span style={{ color: colors.error.main }}>*</span>
        </label>
        <input
          id="company-name"
          name="name"
          type="text"
          disabled={isLoading}
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? 'company-name-error' : undefined}
          data-testid="company-name-input"
          placeholder="e.g. Acme Corporation"
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
            id="company-name-error"
            data-testid="company-name-error"
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

      {/* Industry Field */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="company-industry"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Industry
        </label>
        <input
          id="company-industry"
          name="industry"
          type="text"
          disabled={isLoading}
          value={formData.industry || ''}
          onChange={(e) => handleChange('industry', e.target.value)}
          onBlur={() => handleBlur('industry')}
          data-testid="company-industry-input"
          placeholder="e.g. Technology, Manufacturing"
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

      {/* Website Field */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="company-website"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Website
        </label>
        <input
          id="company-website"
          name="website"
          type="text"
          disabled={isLoading}
          value={formData.website || ''}
          onChange={(e) => handleChange('website', e.target.value)}
          onBlur={() => handleBlur('website')}
          data-testid="company-website-input"
          placeholder="e.g. https://acme.com"
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

      {/* Notes Field */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
        <label
          htmlFor="company-notes"
          style={{
            ...typography.styles.labelCaps,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          Notes
        </label>
        <textarea
          id="company-notes"
          name="notes"
          rows={4}
          disabled={isLoading}
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          onBlur={() => handleBlur('notes')}
          data-testid="company-notes-input"
          placeholder="Additional details about the company..."
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

      {/* Optional Email Field if needed */}
      {formData.email !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
          <label
            htmlFor="company-email"
            style={{
              ...typography.styles.labelCaps,
              color: emailError ? colors.error.main : colors.surface.onSurfaceVariant,
            }}
          >
            Email
          </label>
          <input
            id="company-email"
            name="email"
            type="email"
            disabled={isLoading}
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'company-email-error' : undefined}
            data-testid="company-email-input"
            placeholder="e.g. contact@acme.com"
            style={{
              padding: `${spacing[2]} ${spacing[3]}`,
              fontSize: typography.styles.bodyMd.fontSize,
              fontFamily: typography.fontFamilies.sans,
              borderRadius: radii.sm,
              border: `1px solid ${emailError ? colors.error.main : colors.surface.outlineVariant}`,
              backgroundColor: colors.surface.containerLowest,
              color: colors.surface.onSurface,
              outline: 'none',
            }}
          />
          {emailError && (
            <span
              id="company-email-error"
              data-testid="company-email-error"
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
            data-testid="company-cancel-button"
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
          data-testid="company-submit-button"
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
