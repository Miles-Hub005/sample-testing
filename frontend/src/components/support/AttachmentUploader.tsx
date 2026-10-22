'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  FileValidationResult,
  SenderType,
  TicketAttachment,
  supportService,
  validateAttachmentFile,
} from '../../services/support';

// ============================================================================
// Types & Interfaces [FR-3, NFR-2, NFR-4]
// ============================================================================

export interface AttachmentUploaderProps {
  /**
   * Support ticket identifier required for direct upload via supportService.
   */
  ticketId?: string;

  /**
   * Sender ID for new attachment uploads. Defaults to 'current_user'.
   */
  senderId?: string;

  /**
   * Sender type for attachment uploads ('client' | 'agent' | 'system'). Defaults to 'client'.
   */
  senderType?: SenderType;

  /**
   * Optional message body text to associate with the attachment upload.
   */
  messageBody?: string;

  /**
   * Maximum file size limit in bytes. Defaults to 10MB (10,485,760 bytes).
   */
  maxSizeBytes?: number;

  /**
   * List of permitted MIME types. Defaults to standard support attachment formats (Images, PDF, TXT, Word).
   */
  allowedMimeTypes?: readonly string[];

  /**
   * HTML file input accept attribute string override (e.g. "image/*,.pdf,.doc,.docx,.txt").
   */
  accept?: string;

  /**
   * Controlled file selection state or initial file.
   */
  file?: File | null;

  /**
   * Callback invoked whenever a file is selected or removed, returning the file and validation result.
   */
  onFileSelect?: (file: File | null, validation: FileValidationResult) => void;

  /**
   * Callback invoked when an upload operation begins.
   */
  onUploadStart?: (file: File) => void;

  /**
   * Custom upload function handler (supports explicit dependency injection and custom mocks).
   */
  onUpload?: (file: File) => Promise<TicketAttachment>;

  /**
   * Callback invoked when the upload operation succeeds.
   */
  onUploadSuccess?: (attachment: TicketAttachment) => void;

  /**
   * Callback invoked when validation or upload fails.
   */
  onUploadError?: (error: Error | string) => void;

  /**
   * When true, automatically triggers upload immediately upon selecting a valid file.
   */
  autoUpload?: boolean;

  /**
   * Disabled state flag. Disables drag-and-drop, browsing, and uploading.
   */
  disabled?: boolean;

  /**
   * Read-only mode flag.
   */
  readOnly?: boolean;

  /**
   * Header or label text for the upload component.
   */
  label?: string;

  /**
   * Helper text shown below the drop area.
   */
  helperText?: string;

  /**
   * Container CSS classes.
   */
  className?: string;

  /**
   * Data testid attribute for unit testing. Defaults to 'attachment-uploader'.
   */
  'data-testid'?: string;
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Format file size in bytes to human-readable string (B, KB, MB).
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Determine the file icon category for UI preview based on MIME type or filename extension.
 */
export function getFileIconType(
  mimeType?: string,
  fileName?: string
): 'image' | 'pdf' | 'document' | 'text' | 'file' {
  const mime = (mimeType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)) {
    return 'image';
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    mime.includes('word') ||
    mime.includes('officedocument') ||
    /\.(docx?|rtf|odt)$/i.test(name)
  ) {
    return 'document';
  }
  if (mime.startsWith('text/') || /\.(txt|csv|log|md|json)$/i.test(name)) {
    return 'text';
  }
  return 'file';
}

/**
 * Generate HTML file input accept attribute string from allowed MIME types list.
 */
export function getAcceptAttribute(
  allowedMimeTypes: readonly string[] = DEFAULT_ALLOWED_MIME_TYPES
): string {
  if (!allowedMimeTypes || allowedMimeTypes.length === 0) {
    return 'image/*,.pdf,.txt,.doc,.docx';
  }
  const extensions: string[] = [];
  allowedMimeTypes.forEach((mime) => {
    if (mime === 'image/jpeg') extensions.push('.jpg', '.jpeg');
    else if (mime === 'image/png') extensions.push('.png');
    else if (mime === 'image/gif') extensions.push('.gif');
    else if (mime === 'image/webp') extensions.push('.webp');
    else if (mime === 'application/pdf') extensions.push('.pdf');
    else if (mime === 'text/plain') extensions.push('.txt');
    else if (mime === 'application/msword') extensions.push('.doc');
    else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      extensions.push('.docx');
    } else {
      extensions.push(mime);
    }
  });
  return extensions.join(',');
}

// ============================================================================
// AttachmentUploader Component [FR-3, NFR-2, NFR-4]
// ============================================================================

export function AttachmentUploader({
  ticketId,
  senderId = 'current_user',
  senderType = 'client',
  messageBody,
  maxSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
  allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
  accept,
  file: controlledFile,
  onFileSelect,
  onUploadStart,
  onUpload,
  onUploadSuccess,
  onUploadError,
  autoUpload = false,
  disabled = false,
  readOnly = false,
  label = 'Attach File',
  helperText,
  className,
  'data-testid': testId = 'attachment-uploader',
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Internal state
  const [selectedFile, setSelectedFile] = useState<File | null>(controlledFile || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const isInteractive = !disabled && !readOnly;

  // Sync controlled file prop if provided
  useEffect(() => {
    if (controlledFile !== undefined) {
      if (controlledFile) {
        handleFileValidation(controlledFile, false);
      } else {
        clearSelectedFile(false);
      }
    }
  }, [controlledFile]);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Core file validation & state handler
  const handleFileValidation = useCallback(
    (file: File, shouldAutoUpload: boolean = autoUpload) => {
      setUploadError(null);
      setUploadSuccess(false);

      const validation = validateAttachmentFile(file, maxSizeBytes, allowedMimeTypes);

      if (!validation.valid) {
        const errorMsg = validation.error || 'Invalid attachment file.';
        setValidationError(errorMsg);
        setSelectedFile(file);
        setPreviewUrl(null);

        if (onFileSelect) {
          onFileSelect(file, validation);
        }
        if (onUploadError) {
          onUploadError(errorMsg);
        }
        return false;
      }

      setValidationError(null);
      setSelectedFile(file);

      // Generate preview URL if file is an image
      if (file.type && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }

      if (onFileSelect) {
        onFileSelect(file, validation);
      }

      if (shouldAutoUpload && isInteractive && (ticketId || onUpload)) {
        executeUpload(file);
      }

      return true;
    },
    [
      maxSizeBytes,
      allowedMimeTypes,
      autoUpload,
      isInteractive,
      ticketId,
      onUpload,
      onFileSelect,
      onUploadError,
    ]
  );

  // Clear selected file and reset errors
  const clearSelectedFile = useCallback(
    (notify: boolean = true) => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setValidationError(null);
      setUploadError(null);
      setUploadSuccess(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (notify && onFileSelect) {
        onFileSelect(null, { valid: true });
      }
    },
    [previewUrl, onFileSelect]
  );

  // Execute upload request
  const executeUpload = useCallback(
    async (fileToUpload?: File) => {
      const file = fileToUpload || selectedFile;

      if (!file) {
        const err = 'No file selected for upload.';
        setUploadError(err);
        if (onUploadError) onUploadError(err);
        return;
      }

      // Re-validate prior to network call
      const validation = validateAttachmentFile(file, maxSizeBytes, allowedMimeTypes);
      if (!validation.valid) {
        const err = validation.error || 'Invalid file.';
        setValidationError(err);
        if (onUploadError) onUploadError(err);
        return;
      }

      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(false);

      if (onUploadStart) {
        onUploadStart(file);
      }

      try {
        let attachment: TicketAttachment;

        if (onUpload) {
          attachment = await onUpload(file);
        } else if (ticketId) {
          attachment = await supportService.uploadAttachment(
            ticketId,
            file,
            senderId,
            senderType,
            messageBody
          );
        } else {
          throw new Error(
            'Missing upload target. Provide ticketId or a custom onUpload callback.'
          );
        }

        setIsUploading(false);
        setUploadSuccess(true);

        if (onUploadSuccess) {
          onUploadSuccess(attachment);
        }
      } catch (err: any) {
        setIsUploading(false);
        const errMsg =
          err?.message ||
          (typeof err === 'string' ? err : 'Failed to upload attachment. Please try again.');
        setUploadError(errMsg);

        if (onUploadError) {
          onUploadError(err);
        }
      }
    },
    [
      selectedFile,
      maxSizeBytes,
      allowedMimeTypes,
      ticketId,
      senderId,
      senderType,
      messageBody,
      onUpload,
      onUploadStart,
      onUploadSuccess,
      onUploadError,
    ]
  );

  // File Input Change Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileValidation(files[0]);
    }
  };

  // Drag & Drop Event Handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInteractive) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInteractive && !isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!isInteractive) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileValidation(files[0]);
    }
  };

  // Click handler to open file browser
  const handleBrowseClick = () => {
    if (isInteractive && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Keyboard accessibility handler for dropzone
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBrowseClick();
    }
  };

  const acceptAttribute = accept || getAcceptAttribute(allowedMimeTypes);
  const maxMbFormatted = (maxSizeBytes / (1024 * 1024)).toFixed(0);

  return (
    <div
      className={cn('flex flex-col gap-2.5 w-full text-[#1b1c19]', className)}
      data-testid={testId}
    >
      {/* Component Header / Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold tracking-wider uppercase text-[#59452b]">
            {label}
          </label>
          <span className="text-xs text-[#80756b]">
            Max {maxMbFormatted}MB
          </span>
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptAttribute}
        disabled={!isInteractive || isUploading}
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        data-testid={`${testId}-file-input`}
      />

      {/* Dropzone & Browse Region */}
      {!selectedFile ? (
        <div
          role="region"
          aria-label="File upload dropzone"
          tabIndex={isInteractive ? 0 : -1}
          onClick={handleBrowseClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'group relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:ring-offset-2',
            isDragging
              ? 'border-[#735c41] bg-[#735c41]/10 scale-[1.01]'
              : 'border-[#d1c4b9] bg-[#fbf9f4] hover:border-[#735c41] hover:bg-[#f5f3ee]',
            (!isInteractive || isUploading) &&
              'opacity-60 cursor-not-allowed hover:border-[#d1c4b9] hover:bg-[#fbf9f4]'
          )}
          data-testid={`${testId}-dropzone`}
        >
          <div className="flex flex-col items-center text-center gap-2">
            <div className="p-2.5 rounded-full bg-[#f0eee9] text-[#735c41] group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" aria-hidden="true" />
            </div>

            <div className="text-sm">
              <span className="font-medium text-[#59452b] underline underline-offset-2">
                Click to browse
              </span>{' '}
              or drag and drop file here
            </div>

            <p className="text-xs text-[#80756b]">
              {helperText ||
                `Supported formats: Images, PDF, TXT, Word (Up to ${maxMbFormatted}MB)`}
            </p>
          </div>
        </div>
      ) : (
        /* Selected File Card View */
        <div
          className={cn(
            'flex flex-col gap-2 p-3.5 border rounded-lg transition-all',
            validationError
              ? 'border-red-300 bg-red-50/60'
              : uploadSuccess
              ? 'border-emerald-300 bg-emerald-50/60'
              : 'border-[#d1c4b9] bg-[#fbf9f4]'
          )}
          data-testid={`${testId}-selected-file`}
        >
          <div className="flex items-center justify-between gap-3">
            {/* File Icon / Image Thumbnail */}
            <div className="flex items-center gap-3 min-w-0">
              {previewUrl ? (
                <div className="relative w-12 h-12 rounded overflow-hidden border border-[#d1c4b9] bg-white flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={selectedFile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded bg-[#f0eee9] text-[#59452b] flex-shrink-0">
                  {getFileIconType(selectedFile.type, selectedFile.name) === 'image' && (
                    <ImageIcon className="w-5 h-5" />
                  )}
                  {getFileIconType(selectedFile.type, selectedFile.name) === 'pdf' && (
                    <FileText className="w-5 h-5 text-red-600" />
                  )}
                  {getFileIconType(selectedFile.type, selectedFile.name) === 'document' && (
                    <FileText className="w-5 h-5 text-blue-600" />
                  )}
                  {getFileIconType(selectedFile.type, selectedFile.name) === 'text' && (
                    <FileText className="w-5 h-5 text-amber-600" />
                  )}
                  {getFileIconType(selectedFile.type, selectedFile.name) === 'file' && (
                    <File className="w-5 h-5 text-[#80756b]" />
                  )}
                </div>
              )}

              {/* File Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#1b1c19] truncate">
                  {selectedFile.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-[#80756b]">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  {selectedFile.type && (
                    <>
                      <span>•</span>
                      <span className="truncate">{selectedFile.type}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Upload / Remove */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!validationError && !uploadSuccess && !autoUpload && (ticketId || onUpload) && (
                <button
                  type="button"
                  onClick={() => executeUpload()}
                  disabled={!isInteractive || isUploading}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#59452b] rounded hover:bg-[#735c41] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-colors',
                    (!isInteractive || isUploading) && 'opacity-60 cursor-not-allowed'
                  )}
                  data-testid={`${testId}-upload-btn`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              )}

              {isInteractive && !isUploading && (
                <button
                  type="button"
                  onClick={() => clearSelectedFile(true)}
                  className="p-1.5 text-[#80756b] hover:text-red-700 hover:bg-red-100/50 rounded transition-colors"
                  title="Remove selected file"
                  aria-label="Remove selected file"
                  data-testid={`${testId}-remove-btn`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Validation Error Notice */}
          {validationError && (
            <div
              className="flex items-start gap-2 pt-1 text-xs text-red-700"
              role="alert"
              aria-live="polite"
              data-testid={`${testId}-validation-error`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Upload Success Notice */}
          {uploadSuccess && (
            <div
              className="flex items-center gap-2 pt-1 text-xs text-emerald-700 font-medium"
              role="status"
              aria-live="polite"
              data-testid={`${testId}-upload-success`}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Attachment uploaded successfully!</span>
            </div>
          )}
        </div>
      )}

      {/* Network / Upload Error Banner */}
      {uploadError && !validationError && (
        <div
          className="flex items-start justify-between gap-2 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700"
          role="alert"
          aria-live="assertive"
          data-testid={`${testId}-upload-error`}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-600 hover:text-red-900 p-0.5"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default AttachmentUploader;
