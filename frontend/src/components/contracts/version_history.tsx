'use client';

import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import {
  ALLOWED_CATEGORIES,
  ContractCategory,
  ContractDetailResponse,
  DocumentVersionResponse,
  contractApi,
} from '../../services/contract_api';
import { cn } from '../../lib/utils';
import { StatusLabel } from '../common/StatusLabel';

export type VersionCategoryFilter = 'ALL' | ContractCategory;

export interface VersionHistoryProps {
  /**
   * Target contract ID. Used for default API calls.
   */
  contractId?: string;

  /**
   * Full contract detail object from contract API.
   */
  contract?: ContractDetailResponse | null;

  /**
   * Explicit array of document versions. Overrides `contract.document_versions` if provided.
   */
  documentVersions?: DocumentVersionResponse[];

  /**
   * Parent contract ID for supporting child documents (SOWs, NDAs, Exhibits).
   * Overrides `contract.parent_contract_id` if provided.
   */
  parentContractId?: string | null;

  /**
   * Contract title for section header.
   */
  contractTitle?: string;

  /**
   * Custom callback for uploading a new document version or attachment.
   */
  onUploadVersion?: (
    categoryType: ContractCategory,
    file: File
  ) => Promise<DocumentVersionResponse | void>;

  /**
   * Custom callback for downloading a specific document version.
   */
  onDownloadVersion?: (version: DocumentVersionResponse) => Promise<void> | void;

  /**
   * Event listener callback fired after a document version upload completes.
   */
  onVersionUploaded?: (newVersion: DocumentVersionResponse) => void;

  /**
   * Initial active category filter. Defaults to 'ALL'.
   */
  initialCategoryFilter?: VersionCategoryFilter;

  /**
   * Read-only mode flag. Hides upload action controls when true.
   */
  readOnly?: boolean;

  /**
   * Optional custom container CSS classes.
   */
  className?: string;

  /**
   * Test identifier for unit and e2e testing.
   */
  'data-testid'?: string;
}

/**
 * Utility to extract clean filename from file path or URL.
 */
function getCleanFileName(filePath: string): string {
  if (!filePath) return 'document.pdf';
  const segments = filePath.split(/[/\\]/);
  const rawName = segments[segments.length - 1] || filePath;
  // Decode URL components if encoded
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

/**
 * Utility to format ISO date timestamp to readable locale date/time string.
 */
function formatTimestamp(isoString: string): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return isoString;
  }
}

/**
 * Utility to format SHA-256 checksum for compact UI display.
 */
function formatChecksum(hash: string): string {
  if (!hash || hash.length < 12) return hash || 'N/A';
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

/**
 * Utility to format byte size into human-readable KB/MB.
 */
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Category color styling mapping for Linen & Logic editorial theme.
 */
const CATEGORY_STYLES: Record<ContractCategory, { bg: string; text: string; border: string }> = {
  Contract: {
    bg: 'bg-[#f0eee9]',
    text: 'text-[#59452b]',
    border: 'border-[#d1c4b9]',
  },
  SOW: {
    bg: 'bg-[#e4e2dd]',
    text: 'text-[#374a5f]',
    border: 'border-[#b4c8e2]',
  },
  NDA: {
    bg: 'bg-[#eae8e3]',
    text: 'text-[#715a3f]',
    border: 'border-[#d1c4b9]',
  },
  Exhibit: {
    bg: 'bg-[#f5f3ee]',
    text: 'text-[#a43b2c]',
    border: 'border-[#fd7d69]/30',
  },
};

/**
 * VersionHistory Component [FR-3, FR-4, FR-10]
 *
 * Renders categorized document repository history, sequential version control list,
 * file upload form for revised versions/attachments, and parent-child relationship indicators.
 */
export const VersionHistory: React.FC<VersionHistoryProps> = ({
  contractId: propContractId,
  contract,
  documentVersions: propDocumentVersions,
  parentContractId: propParentContractId,
  contractTitle,
  onUploadVersion,
  onDownloadVersion,
  onVersionUploaded,
  initialCategoryFilter = 'ALL',
  readOnly = false,
  className,
  'data-testid': dataTestId = 'version-history-component',
}) => {
  const fileInputId = useId();
  const categorySelectId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effective identifiers from props or contract detail object
  const effectiveContractId = propContractId || contract?.id || '';
  const effectiveParentId = propParentContractId ?? contract?.parent_contract_id ?? null;
  const effectiveTitle = contractTitle || contract?.title || 'Contract Document';

  // Merge provided version list or contract detail document_versions
  const initialVersions = useMemo(() => {
    if (propDocumentVersions && Array.isArray(propDocumentVersions)) {
      return propDocumentVersions;
    }
    if (contract?.document_versions && Array.isArray(contract.document_versions)) {
      return contract.document_versions;
    }
    return [];
  }, [propDocumentVersions, contract?.document_versions]);

  // Local state for dynamically updated document versions
  const [localVersions, setLocalVersions] = useState<DocumentVersionResponse[]>(initialVersions);

  // Sync state if initialVersions change externally
  React.useEffect(() => {
    setLocalVersions(initialVersions);
  }, [initialVersions]);

  // Category filter state ('ALL', 'Contract', 'SOW', 'NDA', 'Exhibit')
  const [activeFilter, setActiveFilter] = useState<VersionCategoryFilter>(initialCategoryFilter);

  // Sort order ('newest' or 'oldest')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Upload form visibility state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Upload form input state
  const [uploadCategory, setUploadCategory] = useState<ContractCategory>('Contract');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Status feedback state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [downloadingVersionId, setDownloadingVersionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedChecksumId, setCopiedChecksumId] = useState<string | null>(null);

  // Category version counts calculation [FR-3]
  const categoryCounts = useMemo(() => {
    const counts: Record<VersionCategoryFilter, number> = {
      ALL: localVersions.length,
      Contract: 0,
      SOW: 0,
      NDA: 0,
      Exhibit: 0,
    };
    localVersions.forEach((v) => {
      const cat = (v.category_type as ContractCategory) || 'Contract';
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      }
    });
    return counts;
  }, [localVersions]);

  // Filtered and sorted document versions [FR-4]
  const filteredVersions = useMemo(() => {
    let result = [...localVersions];

    if (activeFilter !== 'ALL') {
      result = result.filter(
        (v) => (v.category_type || '').toLowerCase() === activeFilter.toLowerCase()
      );
    }

    result.sort((a, b) => {
      const timeA = new Date(a.uploaded_at || 0).getTime();
      const timeB = new Date(b.uploaded_at || 0).getTime();
      if (timeA !== timeB) {
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      }
      return sortOrder === 'newest'
        ? b.version_number - a.version_number
        : a.version_number - b.version_number;
    });

    return result;
  }, [localVersions, activeFilter, sortOrder]);

  // Handle category filter tab change
  const handleTabChange = useCallback((category: VersionCategoryFilter) => {
    setActiveFilter(category);
    if (category !== 'ALL') {
      setUploadCategory(category);
    }
  }, []);

  // Handle file drop / selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMessage(null);
    }
  };

  // Upload document version handler [FR-4, FR-10]
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setIsUploading(true);

    try {
      let createdVersion: DocumentVersionResponse | undefined | void;

      if (onUploadVersion) {
        createdVersion = await onUploadVersion(uploadCategory, selectedFile);
      } else {
        if (!effectiveContractId) {
          throw new Error('Contract ID is missing. Cannot upload document version.');
        }
        createdVersion = await contractApi.uploadDocumentVersion(
          effectiveContractId,
          uploadCategory,
          selectedFile
        );
      }

      // If a response is returned, add to local list
      let newVersionObj: DocumentVersionResponse;
      if (createdVersion && typeof createdVersion === 'object' && 'id' in createdVersion) {
        newVersionObj = createdVersion as DocumentVersionResponse;
      } else {
        // Fallback synthetic entry if backend returns void
        const currentMaxVer = localVersions
          .filter((v) => v.category_type === uploadCategory)
          .reduce((max, v) => Math.max(max, v.version_number), 0);

        newVersionObj = {
          id: `temp-${Date.now()}`,
          contract_id: effectiveContractId,
          category_type: uploadCategory,
          version_number: currentMaxVer + 1,
          file_path: `/uploads/${uploadCategory.toLowerCase()}/${selectedFile.name}`,
          checksum: 'uploaded-sha256-hash',
          uploaded_at: new Date().toISOString(),
        };
      }

      setLocalVersions((prev) => [newVersionObj, ...prev]);
      setSuccessMessage(
        `Successfully uploaded ${uploadCategory} document version v${newVersionObj.version_number}.`
      );
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsUploadOpen(false);

      if (onVersionUploaded) {
        onVersionUploaded(newVersionObj);
      }
    } catch (err: any) {
      const msg = err?.message || err?.detail || 'Failed to upload document version.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Download document version handler [FR-4]
  const handleDownload = async (version: DocumentVersionResponse) => {
    setErrorMessage(null);
    setDownloadingVersionId(version.id);

    try {
      if (onDownloadVersion) {
        await onDownloadVersion(version);
      } else {
        if (!effectiveContractId) {
          throw new Error('Contract ID is missing. Cannot download document version.');
        }
        const blob = await contractApi.downloadDocumentVersion(
          effectiveContractId,
          version.id
        );

        // Trigger browser blob download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = getCleanFileName(version.file_path);
        link.download = filename || `document_v${version.version_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      const msg = err?.message || err?.detail || 'Failed to download document version.';
      setErrorMessage(msg);
    } finally {
      setDownloadingVersionId(null);
    }
  };

  // Copy checksum helper
  const handleCopyChecksum = (hash: string, id: string) => {
    if (!hash) return;
    try {
      navigator.clipboard.writeText(hash);
      setCopiedChecksumId(id);
      setTimeout(() => setCopiedChecksumId(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <section
      data-testid={dataTestId}
      className={cn(
        'w-full bg-[#fbf9f4] text-[#1b1c19] border border-[#d1c4b9] rounded-lg shadow-sm p-6 space-y-6',
        className
      )}
      aria-label="Document Version History and Attachments"
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#d1c4b9]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-serif text-2xl font-normal text-[#59452b]">
              Document Version History
            </h2>
            <StatusLabel status="active" label={`${localVersions.length} Total Versions`} size="sm" />
          </div>
          <p className="text-sm text-[#4e453d]">
            Sequential version control and supporting attachments for{' '}
            <span className="font-medium text-[#1b1c19]">{effectiveTitle}</span>
          </p>

          {/* Parent Contract Relationship Indicator [FR-10] */}
          {effectiveParentId && (
            <div
              data-testid="parent-contract-badge"
              className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-[#e4e2dd] border border-[#80756b]/30 rounded-md text-xs text-[#374a5f]"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4 text-[#715a3f]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <span>
                <strong>Parent Agreement ID:</strong> {effectiveParentId}
              </span>
              <span className="text-gray-500 font-normal">
                (Supporting Exhibits & SOWs attached directly)
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        {!readOnly && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="upload-toggle-button"
              onClick={() => {
                setIsUploadOpen((prev) => !prev);
                setErrorMessage(null);
              }}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:ring-offset-2',
                isUploadOpen
                  ? 'bg-[#e4e2dd] text-[#1b1c19] hover:bg-[#dbdad5]'
                  : 'bg-[#735c41] text-[#ffffff] hover:bg-[#59452b]'
              )}
              aria-expanded={isUploadOpen}
              aria-controls="upload-form-panel"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isUploadOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                )}
              </svg>
              <span>{isUploadOpen ? 'Cancel Upload' : 'Upload Revised File / Attachment'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Global Status Notifications */}
      {errorMessage && (
        <div
          role="alert"
          data-testid="version-history-error-alert"
          className="p-4 bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a] text-sm rounded-md flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#93000a] hover:underline font-medium text-xs ml-4"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          data-testid="version-history-success-alert"
          className="p-4 bg-[#d1fae5] border border-[#064e3b]/30 text-[#064e3b] text-sm rounded-md flex items-center justify-between"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-[#064e3b] hover:underline font-medium text-xs ml-4"
            aria-label="Dismiss message"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Collapsible Document Upload Panel [FR-4, FR-10] */}
      {!readOnly && isUploadOpen && (
        <form
          id="upload-form-panel"
          data-testid="upload-form"
          onSubmit={handleUploadSubmit}
          className="p-5 bg-[#f0eee9] border border-[#d1c4b9] rounded-lg space-y-4 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-medium text-[#59452b]">
              Upload Document Version or Supporting Attachment
            </h3>
            <span className="text-xs text-[#80756b]">FR-3, FR-4, FR-10 Compliant</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Selector [FR-3] */}
            <div className="space-y-1">
              <label
                htmlFor={categorySelectId}
                className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d]"
              >
                Document Category
              </label>
              <select
                id={categorySelectId}
                data-testid="category-select"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as ContractCategory)}
                className="w-full p-2.5 bg-white border border-[#80756b] rounded-md text-sm text-[#1b1c19] focus:outline-none focus:ring-2 focus:ring-[#735c41]"
              >
                {ALLOWED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} {cat === 'Contract' ? '(Primary Agreement)' : '(Supporting Attachment)'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#80756b]">
                {uploadCategory === 'Contract'
                  ? 'Revising the main contract agreement file.'
                  : `Attaching supporting ${uploadCategory} directly to parent contract record.`}
              </p>
            </div>

            {/* File Selection / Dropzone */}
            <div className="space-y-1">
              <label
                htmlFor={fileInputId}
                className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d]"
              >
                Select Revised File
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors bg-white',
                  isDragOver ? 'border-[#735c41] bg-[#fbf9f4]' : 'border-[#d1c4b9]',
                  selectedFile ? 'border-emerald-600 bg-emerald-50/20' : ''
                )}
                onClick={() => fileInputRef.current?.click()}
                role="region"
                aria-label="File upload dropzone"
              >
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  data-testid="file-input"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt"
                />
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#1b1c19] truncate">
                      📄 {selectedFile.name}
                    </p>
                    <p className="text-xs text-[#80756b]">
                      {formatFileSize(selectedFile.size)} - Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-[#4e453d]">
                      Drag and drop document file here, or{' '}
                      <span className="text-[#735c41] font-medium underline">browse</span>
                    </p>
                    <p className="text-xs text-[#80756b]">Supports PDF, DOCX, DOC, TXT</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsUploadOpen(false);
                setSelectedFile(null);
              }}
              className="px-4 py-2 text-sm text-[#4e453d] hover:text-[#1b1c19] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-upload-button"
              disabled={isUploading || !selectedFile}
              className={cn(
                'px-5 py-2 rounded-md font-medium text-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:ring-offset-2',
                isUploading || !selectedFile
                  ? 'bg-[#80756b]/50 cursor-not-allowed'
                  : 'bg-[#735c41] hover:bg-[#59452b]'
              )}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Uploading Version...</span>
                </span>
              ) : (
                `Upload ${uploadCategory} Version`
              )}
            </button>
          </div>
        </form>
      )}

      {/* Category Filter Tabs [FR-3] */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#d1c4b9] pb-2">
          {/* Tab buttons */}
          <div
            role="tablist"
            aria-label="Filter document versions by category"
            className="flex items-center gap-1 overflow-x-auto max-w-full pb-1"
          >
            <button
              type="button"
              role="tab"
              data-testid="category-tab-ALL"
              aria-selected={activeFilter === 'ALL'}
              onClick={() => handleTabChange('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#735c41]',
                activeFilter === 'ALL'
                  ? 'bg-[#59452b] text-white shadow-sm'
                  : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#e4e2dd]'
              )}
            >
              All Categories ({categoryCounts.ALL})
            </button>

            {ALLOWED_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = activeFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  data-testid={`category-tab-${cat}`}
                  aria-selected={isSelected}
                  onClick={() => handleTabChange(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#735c41]',
                    isSelected
                      ? 'bg-[#59452b] text-white shadow-sm'
                      : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#e4e2dd]'
                  )}
                >
                  {cat}s ({count})
                </button>
              );
            })}
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[#4e453d]">
            <label htmlFor="sort-order-select" className="sr-only">
              Sort Order
            </label>
            <span className="font-medium">Sort:</span>
            <select
              id="sort-order-select"
              data-testid="sort-order-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="p-1 bg-white border border-[#d1c4b9] rounded text-xs text-[#1b1c19] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Parent-Child Attachment Informational Note [FR-10] */}
        {activeFilter !== 'ALL' && activeFilter !== 'Contract' && (
          <div className="p-3 bg-[#f5f3ee] border-l-4 border-[#374a5f] rounded-r-md text-xs text-[#4e453d]">
            <strong>Supporting Attachments ({activeFilter}s):</strong> Showing attached{' '}
            {activeFilter} documents linked to the parent contract record. Uploading a revised{' '}
            {activeFilter} increments its sequential version while retaining full historical access.
          </div>
        )}

        {/* Document Versions List / Table [FR-4] */}
        {filteredVersions.length === 0 ? (
          <div
            data-testid="no-versions-state"
            className="p-8 text-center bg-[#f0eee9]/50 border border-dashed border-[#d1c4b9] rounded-lg space-y-3"
          >
            <svg
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-[#80756b]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#1b1c19]">
                No document versions found in category "{activeFilter}".
              </p>
              <p className="text-xs text-[#80756b]">
                {readOnly
                  ? 'No documents have been uploaded for this category yet.'
                  : 'Use the upload button above to add the first document version or attachment.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              data-testid="version-table"
              className="w-full text-left border-collapse text-xs md:text-sm"
              aria-label="Document version history table"
            >
              <thead>
                <tr className="border-b border-[#d1c4b9] bg-[#f0eee9] text-[#4e453d] font-semibold">
                  <th scope="col" className="py-3 px-4">
                    Version
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Category
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Filename & Path
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Checksum (SHA-256)
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Uploaded
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d1c4b9]/60">
                {filteredVersions.map((v) => {
                  const catKey = (v.category_type as ContractCategory) || 'Contract';
                  const style = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.Contract;
                  const cleanName = getCleanFileName(v.file_path);
                  const isDownloadingThis = downloadingVersionId === v.id;

                  return (
                    <tr
                      key={v.id}
                      data-testid={`version-item-${v.id}`}
                      className="hover:bg-[#f0eee9]/60 transition-colors"
                    >
                      {/* Version Number */}
                      <td className="py-3 px-4 font-mono font-bold text-[#59452b]">
                        v{v.version_number}
                      </td>

                      {/* Category Badge [FR-3] */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-block px-2.5 py-0.5 rounded text-xs font-semibold border',
                            style.bg,
                            style.text,
                            style.border
                          )}
                        >
                          {v.category_type || 'Contract'}
                        </span>
                      </td>

                      {/* Filename & Path */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#1b1c19] truncate max-w-xs">
                            {cleanName}
                          </span>
                          <span className="text-[11px] text-[#80756b] truncate max-w-xs font-mono">
                            {v.file_path}
                          </span>
                        </div>
                      </td>

                      {/* Checksum */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <code
                            data-testid={`checksum-${v.id}`}
                            title={v.checksum}
                            className="bg-[#e4e2dd]/70 px-1.5 py-0.5 rounded text-[11px] font-mono text-[#30312e]"
                          >
                            {formatChecksum(v.checksum)}
                          </code>
                          {v.checksum && (
                            <button
                              type="button"
                              onClick={() => handleCopyChecksum(v.checksum, v.id)}
                              className="text-[#80756b] hover:text-[#1b1c19] p-1 rounded focus:outline-none"
                              aria-label={`Copy checksum for version ${v.version_number}`}
                              title="Copy SHA-256 checksum to clipboard"
                            >
                              {copiedChecksumId === v.id ? (
                                <span className="text-xs text-emerald-700 font-bold">✓</span>
                              ) : (
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Uploaded Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-[#4e453d]">
                        <div>{formatTimestamp(v.uploaded_at)}</div>
                        {v.uploaded_by_id && (
                          <div className="text-[11px] text-[#80756b]">
                            By: {v.uploaded_by_id.slice(0, 8)}...
                          </div>
                        )}
                      </td>

                      {/* Download Action [FR-4] */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          data-testid={`download-version-${v.id}`}
                          onClick={() => handleDownload(v)}
                          disabled={isDownloadingThis}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e4e2dd] hover:bg-[#dbdad5] text-[#1b1c19] rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]"
                          aria-label={`Download version ${v.version_number} of ${v.category_type} file`}
                        >
                          {isDownloadingThis ? (
                            <span className="flex items-center gap-1">
                              <svg
                                className="animate-spin h-3 w-3 text-[#1b1c19]"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              <span>Downloading...</span>
                            </span>
                          ) : (
                            <>
                              <svg
                                className="w-3.5 h-3.5 text-[#59452b]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                              <span>Download</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default VersionHistory;
