'use client';

import React, { useState, useEffect, useId } from 'react';
import { colors, rounded, spacing, typography } from '@/lib/tokens';
import { ErrorAlert } from '@/components/shared/Alerts';
import type {
  CompanyCreate,
  CompanyRead,
  CompanyUpdate,
  CRMApiError,
  FieldError,
} from '@/services/crm';

export interface CompanyFormData {
  name: string;
  industry?: string;
  website?: string;
  notes?: string;
  email?: string;
  owner?: string;
}

export interface FormErrors {
  name?: string;
  industry?: string;
  website?: string;
  notes?: string;
  email?: string;
  owner?: string;
  [key: string]: string | undefined;
}

export interface CompanyFormProps {
  /** Initial values for editing or pre-populating fields */
  initialValues?: Partial<CompanyFormData | CompanyRead | CompanyCreate | CompanyUpdate>;
  /** Callback fired when form is submitted with valid data */
  onSubmit: (data: CompanyFormData) => void | Promise<void>;
  /** Callback fired when cancel button is clicked */
  onCancel?: () => void;
  /** Whether the submit action is currently in progress */
  isSubmitting?: boolean;
  /** Alias for isSubmitting */
  isLoading?: boolean;
  /** API error message or error response object */
  apiError?: string | CRMApiError | { message?: string; fields?: FieldError[] } | null;
  /** Submit button text label (Default: "Save Company") */
  submitLabel?: string;
  /** Custom title header for the form card */
  title?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

/**
 * CompanyForm Component
 * Renders a form for creating or editing a Company entity with required fields,
 * optional fields (industry, website, notes, email, owner), and inline validation error messages.
 * Satisfies FR-1 (Companies CRUD) and FR-12 (Form validation).
 */
export const CompanyForm: React.FC<CompanyFormProps> = ({
  initialValues,
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
  const industryInputId = `${formId}-industry`;
  const websiteInputId = `${formId}-website`;
  const notesInputId = `${formId}-notes`;
  const emailInputId = `${formId}-email`;
  const ownerInputId = `${formId}-owner`;
  const titleId = `${formId}-title`;

  const pending = isSubmitting || isLoading;

  const [formData, setFormData] = useState<CompanyFormData>({
    name: initialValues?.name ?? '',
    industry: initialValues?.industry ?? '',
    website: initialValues?.website ?? '',
    notes: initialValues?.notes ?? '',
    email: initialValues?.email ?? '',
    owner: initialValues?.owner ?? '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Synchronize form state when initialValues change
  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name ?? '',
        industry: initialValues.industry ?? '',
        website: initialValues.website ?? '',
        notes: initialValues.notes ?? '',
        email: initialValues.email ?? '',
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
      const serverErrors: FormErrors = {};
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
   * Validate form fields
   */
  const validateField = (field: keyof CompanyFormData, value: string): string | undefined => {
    if (field === 'name') {
      if (!value || !value.trim()) {
        return 'Company name is required';
      }
    }

    if (field === 'email' && value && value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return 'Please enter a valid email address';
      }
    }

    if (field === 'website' && value && value.trim()) {
      // Basic URL format validation (must have at least domain or valid URL format)
      const trimmedUrl = value.trim();
      const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
      if (!urlRegex.test(trimmedUrl)) {
        return 'Please enter a valid website URL (e.g. https://example.com)';
      }
    }

    return undefined;
  };

  const validateAll = (data: CompanyFormData): FormErrors => {
    const newErrors: FormErrors = {};

    const nameError = validateField('name', data.name);
    if (nameError) newErrors.name = nameError;

    if (data.email) {
      const emailError = validateField('email', data.email);
      if (emailError) newErrors.email = emailError;
    }

    if (data.website) {
      const websiteError = validateField('website', data.website);
      if (websiteError) newErrors.website = websiteError;
    }

    return newErrors;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof CompanyFormData;

    setFormData((prev) => ({ ...prev, [fieldName]: value }));

    // Re-validate field on change if touched
    if (touched[fieldName]) {
      const fieldError = validateField(fieldName, value);
      setErrors((prev) => ({
        ...prev,
        [fieldName]: fieldError,
      }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof CompanyFormData;

    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const fieldError = validateField(fieldName, value);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: fieldError,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      industry: true,
      website: true,
      notes: true,
      email: true,
      owner: true,
    });

    const validationErrors = validateAll(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // Focus first field with error for accessibility
      if (validationErrors.name) {
        const nameEl = document.getElementById(nameInputId);
        nameEl?.focus();
      }
      return;
    }

    // Format website URL if missing protocol
    let formattedWebsite = formData.website?.trim();
    if (formattedWebsite && !/^https?:\/\//i.test(formattedWebsite)) {
      formattedWebsite = `https://${formattedWebsite}`;
    }

    const cleanedData: CompanyFormData = {
      name: formData.name.trim(),
      industry: formData.industry?.trim() || undefined,
      website: formattedWebsite || undefined,
      notes: formData.notes?.trim() || undefined,
      email: formData.email?.trim() || undefined,
      owner: formData.owner?.trim() || undefined,
    };

    await onSubmit(cleanedData);
  };

  const getApiErrorMessage = (): string | null => {
    if (!apiError) return null;
    if (typeof apiError === 'string') return apiError;
    if ('message' in apiError && apiError.message) return apiError.message;
    return 'An error occurred while saving company details.';
  };

  const apiErrorMessage = getApiErrorMessage();
  const defaultTitle = initialValues?.name ? 'Edit Company' : 'Add New Company';
  const displayTitle = title ?? defaultTitle;
  const defaultSubmitLabel = initialValues?.name ? 'Save Changes' : 'Create Company';
  const displaySubmitLabel = submitLabel ?? defaultSubmitLabel;

  return (
    <div
      className={`company-form-container ${className}`}
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
              title="Failed to save company"
              message={apiErrorMessage}
              dismissible={false}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* Company Name (Required FR-1, FR-12) */}
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
              Company Name{' '}
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
              placeholder="e.g. Acme Corporation"
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

          {/* Industry (Optional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={industryInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Industry
            </label>
            <input
              id={industryInputId}
              name="industry"
              type="text"
              aria-invalid={!!errors.industry}
              aria-describedby={errors.industry ? `${industryInputId}-error` : undefined}
              value={formData.industry}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Technology, Retail, Healthcare"
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${errors.industry ? colors.error : colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
              }}
            />
            {errors.industry && (
              <p
                id={`${industryInputId}-error`}
                role="alert"
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.error,
                  margin: 0,
                  marginTop: '2px',
                }}
              >
                {errors.industry}
              </p>
            )}
          </div>

          {/* Website (Optional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
            <label
              htmlFor={websiteInputId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes.caption.fontSize,
                fontWeight: 600,
                color: colors.surface.onSurface,
                letterSpacing: '0.02em',
              }}
            >
              Website
            </label>
            <input
              id={websiteInputId}
              name="website"
              type="url"
              aria-invalid={!!errors.website}
              aria-describedby={errors.website ? `${websiteInputId}-error` : undefined}
              value={formData.website}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. https://acme.com"
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${errors.website ? colors.error : colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
              }}
            />
            {errors.website && (
              <p
                id={`${websiteInputId}-error`}
                role="alert"
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.error,
                  margin: 0,
                  marginTop: '2px',
                }}
              >
                {errors.website}
              </p>
            )}
          </div>

          {/* Email (Optional) */}
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
              Contact Email
            </label>
            <input
              id={emailInputId}
              name="email"
              type="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? `${emailInputId}-error` : undefined}
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. contact@acme.com"
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
                }}
              >
                {errors.email}
              </p>
            )}
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
              aria-invalid={!!errors.owner}
              aria-describedby={errors.owner ? `${ownerInputId}-error` : undefined}
              value={formData.owner}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. John Doe"
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${errors.owner ? colors.error : colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
              }}
            />
            {errors.owner && (
              <p
                id={`${ownerInputId}-error`}
                role="alert"
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.error,
                  margin: 0,
                  marginTop: '2px',
                }}
              >
                {errors.owner}
              </p>
            )}
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
              rows={4}
              aria-invalid={!!errors.notes}
              aria-describedby={errors.notes ? `${notesInputId}-error` : undefined}
              value={formData.notes}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Add key account details, background, or notes..."
              disabled={pending}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.sizes['body-md'].fontSize,
                padding: '10px 12px',
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${errors.notes ? colors.error : colors.borderVariant}`,
                backgroundColor: pending ? colors.surface.containerLow : colors.surface.containerLowest,
                color: colors.surface.onSurface,
                outline: 'none',
                resize: 'vertical',
              }}
            />
            {errors.notes && (
              <p
                id={`${notesInputId}-error`}
                role="alert"
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.error,
                  margin: 0,
                  marginTop: '2px',
                }}
              >
                {errors.notes}
              </p>
            )}
          </div>

          {/* Form Actions (Submit / Cancel) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: spacing.md,
              marginTop: spacing.md,
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
                  padding: '10px 18px',
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
                padding: '10px 22px',
                borderRadius: rounded.DEFAULT,
                border: 'none',
                backgroundColor: colors.accent.DEFAULT,
                color: colors.accent.onAccent,
                cursor: pending ? 'not-allowed' : 'pointer',
                opacity: pending ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              {pending && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ animation: 'spin 1s linear infinite' }}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0110 10" strokeOpacity="0.75" />
                </svg>
              )}
              {displaySubmitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CompanyForm;
