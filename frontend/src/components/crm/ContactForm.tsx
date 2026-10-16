'use client';

import React, { useState, useEffect, useId } from 'react';
import { colors, rounded, spacing, typography } from '@/lib/tokens';
import { ErrorAlert } from '@/components/shared/Alerts';
import type {
  ContactCreate,
  ContactRead,
  ContactUpdate,
  CRMApiError,
  FieldError,
} from '@/services/crm';

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

export interface ContactFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  company_id?: string;
  notes?: string;
  owner?: string;
  [key: string]: string | undefined;
}

export interface ContactFormProps {
  /** Initial values for editing or pre-populating fields */
  initialValues?: Partial<ContactFormData | ContactRead | ContactCreate | ContactUpdate>;
  /** Company options for the nullable company dropdown */
  companies?: CompanyOption[];
  /** Callback fired when form is submitted with valid data */
  onSubmit: (data: ContactFormData) => void | Promise<void>;
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
 * ContactForm Component
 * Renders a form for creating or editing a Contact entity with fields:
 * - name (required)
 * - email (required + valid email format)
 * - phone (optional)
 * - role (optional)
 * - company_id (nullable dropdown, FR-2, Edge Case 2)
 * - owner (optional)
 * - notes (optional)
 * Includes inline validation errors satisfying FR-2 and FR-12.
 */
export const ContactForm: React.FC<ContactFormProps> = ({
  initialValues,
  companies = [],
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
  const nameInputId = `${formId}-name`;
  const emailInputId = `${formId}-email`;
  const phoneInputId = `${formId}-phone`;
  const roleInputId = `${formId}-role`;
  const companySelectId = `${formId}-company-id`;
  const ownerInputId = `${formId}-owner`;
  const notesInputId = `${formId}-notes`;
  const titleId = `${formId}-title`;

  const pending = isSubmitting || isLoading;

  const [formData, setFormData] = useState<ContactFormData>({
    name: initialValues?.name ?? '',
    email: initialValues?.email ?? '',
    phone: initialValues?.phone ?? '',
    role: initialValues?.role ?? '',
    company_id: initialValues?.company_id ?? null,
    notes: initialValues?.notes ?? '',
    owner: initialValues?.owner ?? '',
  });

  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Synchronize form state when initialValues change
  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name ?? '',
        email: initialValues.email ?? '',
        phone: initialValues.phone ?? '',
        role: initialValues.role ?? '',
        company_id: initialValues.company_id ?? null,
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
      const serverErrors: ContactFormErrors = {};
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
    field: keyof ContactFormData,
    value: string | number | null | undefined
  ): string | undefined => {
    if (field === 'name') {
      const strVal = typeof value === 'string' ? value : '';
      if (!strVal || !strVal.trim()) {
        return 'Contact name is required';
      }
    }

    if (field === 'email') {
      const strVal = typeof value === 'string' ? value : '';
      if (!strVal || !strVal.trim()) {
        return 'Email address is required';
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strVal.trim())) {
        return 'Please enter a valid email address';
      }
    }

    return undefined;
  };

  /**
   * Validate all form fields
   */
  const validateAll = (data: ContactFormData): ContactFormErrors => {
    const newErrors: ContactFormErrors = {};

    const nameError = validateField('name', data.name);
    if (nameError) newErrors.name = nameError;

    const emailError = validateField('email', data.email);
    if (emailError) newErrors.email = emailError;

    return newErrors;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof ContactFormData;

    let updatedValue: string | number | null = value;
    if (fieldName === 'company_id') {
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
    const fieldName = name as keyof ContactFormData;

    let updatedValue: string | number | null = value;
    if (fieldName === 'company_id') {
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
      name: true,
      email: true,
      phone: true,
      role: true,
      company_id: true,
      notes: true,
      owner: true,
    });

    const validationErrors = validateAll(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.name) {
        const el = document.getElementById(nameInputId);
        el?.focus();
      } else if (validationErrors.email) {
        const el = document.getElementById(emailInputId);
        el?.focus();
      }
      return;
    }

    const cleanedData: ContactFormData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone?.trim() || undefined,
      role: formData.role?.trim() || undefined,
      company_id: formData.company_id ?? null,
      notes: formData.notes?.trim() || undefined,
      owner: formData.owner?.trim() || undefined,
    };

    await onSubmit(cleanedData);
  };

  const getApiErrorMessage = (): string | null => {
    if (!apiError) return null;
    if (typeof apiError === 'string') return apiError;
    if ('message' in apiError && apiError.message) return apiError.message;
    return 'An error occurred while saving contact details.';
  };

  const apiErrorMessage = getApiErrorMessage();
  const defaultTitle = initialValues?.name ? 'Edit Contact' : 'Add New Contact';
  const displayTitle = title ?? defaultTitle;
  const defaultSubmitLabel = initialValues?.name ? 'Save Changes' : 'Create Contact';
  const displaySubmitLabel = submitLabel ?? defaultSubmitLabel;

  return (
    <div
      className={`contact-form-container ${className}`}
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
      <form onSubmit={handleSubmit} noValidate aria-labelledby={titleId}>
        <div style={{ marginBottom: spacing.lg }}>
          <h2
            id={titleId}
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
              title="Failed to save contact"
              message={apiErrorMessage}
              dismissible={false}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* Full Name (Required FR-2, FR-12) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={nameInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Contact Name{' '}
              <span aria-hidden="true" style={{ color: colors.error }}>
                *
              </span>
            </label>
            <input
              id={nameInputId}
              name="name"
              type="text"
              required
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${nameInputId}-error` : undefined}
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Jane Doe"
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${errors.name ? colors.error : colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
            />
            {errors.name && (
              <p
                id={`${nameInputId}-error`}
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
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Address (Required + Format, FR-2, FR-12) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={emailInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Email Address{' '}
              <span aria-hidden="true" style={{ color: colors.error }}>
                *
              </span>
            </label>
            <input
              id={emailInputId}
              name="email"
              type="email"
              required
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? `${emailInputId}-error` : undefined}
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. jane.doe@example.com"
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${errors.email ? colors.error : colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
            />
            {errors.email && (
              <p
                id={`${emailInputId}-error`}
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
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone (Optional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={phoneInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Phone Number
            </label>
            <input
              id={phoneInputId}
              name="phone"
              type="tel"
              value={formData.phone ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. +1 (555) 000-1234"
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

          {/* Role (Optional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={roleInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Role / Job Title
            </label>
            <input
              id={roleInputId}
              name="role"
              type="text"
              value={formData.role ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Purchasing Manager"
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

          {/* Company Dropdown (Nullable FR-2, Edge Case 2) */}
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
              Company <span style={{ fontWeight: 'normal', color: colors.surface.onSurfaceVariant }}>(Optional)</span>
            </label>
            <select
              id={companySelectId}
              name="company_id"
              value={formData.company_id ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={pending}
              aria-label="Company (Optional)"
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
            >
              <option value="">-- No Company --</option>
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Owner (Optional) */}
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
              value={formData.owner ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Account Executive"
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

          {/* Notes (Optional) */}
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
              value={formData.notes ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Additional notes about this contact..."
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

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: spacing.md,
            marginTop: spacing.xl,
            paddingTop: spacing.lg,
            borderTop: `1px solid ${colors.borderVariant}`,
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
              fontWeight: 500,
              padding: '10px 24px',
              borderRadius: rounded.DEFAULT,
              border: 'none',
              backgroundColor: colors.primary,
              color: colors.onPrimary,
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.6 : 1,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            {pending ? 'Saving...' : displaySubmitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactForm;
