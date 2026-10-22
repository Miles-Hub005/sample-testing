'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Layers,
  Paperclip,
  PenTool,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { StatusLabel } from '../../../components/common/StatusLabel';
import { ClauseViewer } from '../../../components/contracts/clause_viewer';
import { VersionHistory } from '../../../components/contracts/version_history';
import { AmendmentTimeline } from '../../../components/contracts/amendment_timeline';
import { SignaturePad } from '../../../components/contracts/signature_pad';
import { apiClient, UserMeResponse } from '../../../services/apiClient';
import {
  contractApi,
  ContractDetailResponse,
  ContractCategory,
  DocumentVersionResponse,
  AmendmentDetailResponse,
  SignatureExecuteResponse,
  ALLOWED_CATEGORIES,
} from '../../../services/contract_api';

export type ContractDetailTab = 'clauses' | 'versions' | 'amendments' | 'signature';

export interface ContractDetailPageProps {
  params?: Promise<{ id: string }> | { id: string };
}

/**
 * Format ISO date string into readable local or UTC date string.
 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Not set';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Format ISO timestamp into readable date and time.
 */
function formatTimestamp(isoStr?: string | null): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoStr;
  }
}

export default function ContractDetailPage(props?: ContractDetailPageProps) {
  const router = useRouter();

  // Next.js dynamic parameter resolution
  const routeParams = useParams();
  let paramId = '';
  if (routeParams && typeof routeParams.id === 'string') {
    paramId = routeParams.id;
  } else if (routeParams && Array.isArray(routeParams.id)) {
    paramId = routeParams.id[0];
  }

  // Support props.params if passed directly
  let propId = '';
  if (props?.params) {
    const p =
      typeof (props.params as any)?.then === 'function' && (React as any).use
        ? (React as any).use(props.params as Promise<{ id: string }>)
        : (props.params as { id: string });
    if (p && p.id) {
      propId = p.id;
    }
  }

  const contractId = propId || paramId || '';

  // Active User / Session State
  const [user, setUser] = useState<UserMeResponse | null>(null);

  // Contract Detail State
  const [contract, setContract] = useState<ContractDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<ContractDetailTab>('clauses');

  // Attach Supporting Document / Exhibit Modal State [FR-10]
  const [isAttachModalOpen, setIsAttachModalOpen] = useState<boolean>(false);
  const [attachCategory, setAttachCategory] = useState<ContractCategory>('Exhibit');
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachLoading, setAttachLoading] = useState<boolean>(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachSuccessMsg, setAttachSuccessMsg] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch Session Identity
  useEffect(() => {
    let isMounted = true;
    apiClient
      .getMe()
      .then((data) => {
        if (isMounted) setUser(data);
      })
      .catch(() => {
        // Silent session check fallback
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Full Contract Detail
  const fetchContractDetail = useCallback(
    async (isManualRefresh = false) => {
      if (!contractId) {
        setError('No contract identifier provided.');
        setLoading(false);
        return;
      }

      if (isManualRefresh) {
        setRefreshing(true);
      } else if (!contract) {
        setLoading(true);
      }
      setError(null);

      try {
        const detail = await contractApi.getContractDetail(contractId);
        setContract(detail);
      } catch (err: any) {
        const msg =
          err?.detail || err?.message || 'Failed to load contract detail from server.';
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [contractId, contract]
  );

  useEffect(() => {
    fetchContractDetail();
  }, [contractId]);

  // Handle Attach Supporting SOW / Exhibit [FR-10]
  const handleAttachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    if (!attachFile) {
      setAttachError('Please select a file to attach.');
      return;
    }

    setAttachLoading(true);
    setAttachError(null);
    setAttachSuccessMsg(null);

    try {
      await contractApi.uploadDocumentVersion(contract.id, attachCategory, attachFile);
      setAttachSuccessMsg(`Successfully attached supporting ${attachCategory} document.`);
      setAttachFile(null);
      // Refetch details to reflect the new version/attachment
      await fetchContractDetail(true);
      setTimeout(() => {
        setIsAttachModalOpen(false);
        setAttachSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      const msg =
        err?.detail || err?.message || 'Failed to upload supporting document attachment.';
      setAttachError(msg);
    } finally {
      setAttachLoading(false);
    }
  };

  // Handle Delete Contract
  const handleDeleteContract = async () => {
    if (!contract) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await contractApi.deleteContract(contract.id);
      setIsDeleteModalOpen(false);
      router.push('/contracts');
    } catch (err: any) {
      const msg =
        err?.detail || err?.message || 'Failed to delete contract record.';
      setDeleteError(msg);
      setDeleteLoading(false);
    }
  };

  // Count totals for tab badges
  const clauseCount = (contract?.clauses?.length || 0);
  const versionCount = (contract?.document_versions?.length || 0);
  const amendmentCount = (contract?.amendments?.length || 0);
  const slaCount = (contract?.slas?.length || 0);

  if (loading) {
    return (
      <main
        className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-[#4e453d]"
        data-testid="contract-detail-loading"
        aria-busy="true"
        aria-label="Loading contract details"
      >
        <div className="flex items-center space-x-3 mb-4">
          <RefreshCw className="w-8 h-8 animate-spin text-[#735c41]" />
          <span className="text-lg font-medium text-[#1b1c19]">
            Loading contract details...
          </span>
        </div>
        <p className="text-sm text-[#80756b]">
          Retrieving contract clauses, SLAs, document versions, and audit log...
        </p>
      </main>
    );
  }

  if (error || !contract) {
    return (
      <main
        className="max-w-5xl mx-auto p-6 my-12 bg-white rounded-lg border border-[#e4e2dd] shadow-sm text-center"
        data-testid="contract-detail-error"
        role="alert"
      >
        <div className="w-12 h-12 bg-[#ffdad6] text-[#ba1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-serif text-[#1b1c19] mb-2">
          Unable to Load Contract
        </h1>
        <p className="text-[#4e453d] mb-6 max-w-md mx-auto">
          {error || 'The requested contract record could not be found or accessed.'}
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Link
            href="/contracts"
            className="inline-flex items-center px-4 py-2 border border-[#80756b] text-sm font-medium rounded-md text-[#59452b] bg-white hover:bg-[#f5f3ee] transition-colors"
            data-testid="back-to-repository-link"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contracts
          </Link>
          <button
            onClick={() => fetchContractDetail(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[#59452b] hover:bg-[#735c41] transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
      data-testid="contract-detail-page"
    >
      {/* Top Breadcrumb and Nav */}
      <nav aria-label="Breadcrumb" className="flex items-center justify-between">
        <Link
          href="/contracts"
          className="inline-flex items-center text-sm font-medium text-[#735c41] hover:text-[#59452b] transition-colors"
          data-testid="back-to-repository-link"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Contracts Repository
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchContractDetail(true)}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-[#d1c4b9] text-[#4e453d] bg-white hover:bg-[#f5f3ee] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-colors"
            data-testid="refresh-contract-btn"
            title="Refresh contract data"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={() => setIsAttachModalOpen(true)}
            className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-md border border-[#735c41] text-[#59452b] bg-[#f5f3ee] hover:bg-[#eae8e3] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-colors"
            data-testid="attach-exhibit-btn"
          >
            <Paperclip className="w-3.5 h-3.5 mr-1.5" />
            Attach Exhibit / SOW
          </button>

          {user?.roles?.includes('ContractAdmin') && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-[#ffdad6] text-[#ba1a1a] bg-white hover:bg-[#ffdad6] focus:outline-none focus:ring-2 focus:ring-[#ba1a1a] transition-colors"
              data-testid="delete-contract-btn"
              title="Delete contract record"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </button>
          )}
        </div>
      </nav>

      {/* Contract Detail Header Banner */}
      <header className="bg-white rounded-lg border border-[#e4e2dd] shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-[#e4e2dd] pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-[#f0eee9] text-[#4e453d] border border-[#d1c4b9]"
                data-testid="contract-category-badge"
              >
                {contract.category}
              </span>

              <StatusLabel
                status={contract.status}
                size="md"
                data-testid="contract-status-badge"
              />

              {contract.parent_contract_id && (
                <Link
                  href={`/contracts/${contract.parent_contract_id}`}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-[#735c41] bg-[#f5f3ee] hover:bg-[#eae8e3] transition-colors"
                  title="View Parent Contract"
                >
                  <Layers className="w-3 h-3 mr-1 text-[#735c41]" />
                  Child Document (Parent: {contract.parent_contract_id.substring(0, 8)}...)
                </Link>
              )}
            </div>

            <h1
              className="text-2xl sm:text-3xl font-serif text-[#1b1c19] tracking-tight"
              data-testid="contract-title"
            >
              {contract.title}
            </h1>
          </div>

          {contract.status === 'PENDING_SIGNATURE' && (
            <div className="flex items-center">
              <button
                onClick={() => setActiveTab('signature')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[#735c41] hover:bg-[#59452b] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-colors"
              >
                <PenTool className="w-4 h-4 mr-2" />
                Execute Pending Signature
              </button>
            </div>
          )}
        </div>

        {/* Key Contract Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div className="flex items-start space-x-3">
            <Building2 className="w-5 h-5 text-[#80756b] mt-0.5 flex-shrink-0" />
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#80756b] font-medium">
                Counterparty
              </span>
              <span className="text-base font-medium text-[#1b1c19]">
                {contract.counterparty}
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-[#80756b] mt-0.5 flex-shrink-0" />
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#80756b] font-medium">
                Start Date
              </span>
              <span className="text-base font-medium text-[#1b1c19]">
                {formatDate(contract.start_on)}
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-[#80756b] mt-0.5 flex-shrink-0" />
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#80756b] font-medium">
                Expiration Date
              </span>
              <span className="text-base font-medium text-[#1b1c19]">
                {formatDate(contract.expires_on)}
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-[#80756b] mt-0.5 flex-shrink-0" />
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#80756b] font-medium">
                Active SLAs / Clauses
              </span>
              <span className="text-base font-medium text-[#1b1c19]">
                {slaCount} SLAs / {clauseCount} Clauses
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Tabs Navigation */}
      <section className="space-y-6">
        <div className="border-b border-[#e4e2dd] bg-white rounded-t-lg px-4 sm:px-6 pt-2">
          <div
            role="tablist"
            aria-label="Contract Sections"
            className="flex space-x-8 overflow-x-auto scrollbar-none"
          >
            <button
              role="tab"
              aria-selected={activeTab === 'clauses'}
              aria-controls="panel-clauses"
              id="tab-clauses"
              onClick={() => setActiveTab('clauses')}
              className={`py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
                activeTab === 'clauses'
                  ? 'border-[#735c41] text-[#59452b]'
                  : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#d1c4b9]'
              }`}
              data-testid="tab-clauses"
            >
              <FileText className="w-4 h-4" />
              <span>Clauses & Key Terms & SLAs</span>
              {clauseCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0eee9] text-[#4e453d]">
                  {clauseCount}
                </span>
              )}
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'versions'}
              aria-controls="panel-versions"
              id="tab-versions"
              onClick={() => setActiveTab('versions')}
              className={`py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
                activeTab === 'versions'
                  ? 'border-[#735c41] text-[#59452b]'
                  : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#d1c4b9]'
              }`}
              data-testid="tab-versions"
            >
              <History className="w-4 h-4" />
              <span>Document Versions & Exhibits</span>
              {versionCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0eee9] text-[#4e453d]">
                  {versionCount}
                </span>
              )}
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'amendments'}
              aria-controls="panel-amendments"
              id="tab-amendments"
              onClick={() => setActiveTab('amendments')}
              className={`py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
                activeTab === 'amendments'
                  ? 'border-[#735c41] text-[#59452b]'
                  : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#d1c4b9]'
              }`}
              data-testid="tab-amendments"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Amendment Audit Trail</span>
              {amendmentCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0eee9] text-[#4e453d]">
                  {amendmentCount}
                </span>
              )}
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'signature'}
              aria-controls="panel-signature"
              id="tab-signature"
              onClick={() => setActiveTab('signature')}
              className={`py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
                activeTab === 'signature'
                  ? 'border-[#735c41] text-[#59452b]'
                  : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#d1c4b9]'
              }`}
              data-testid="tab-signature"
            >
              <PenTool className="w-4 h-4" />
              <span>E-Signatures</span>
              {contract.status === 'PENDING_SIGNATURE' && (
                <span className="w-2 h-2 rounded-full bg-[#a43b2c] animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Panels */}
        <div className="bg-white rounded-b-lg border border-t-0 border-[#e4e2dd] p-6">
          {/* 1. Clauses & Key Terms & SLAs Panel [FR-1] */}
          {activeTab === 'clauses' && (
            <div
              id="panel-clauses"
              role="tabpanel"
              aria-labelledby="tab-clauses"
              data-testid="clauses-tab-panel"
            >
              <ClauseViewer contract={contract} />
            </div>
          )}

          {/* 2. Document Versions & Exhibits Panel [FR-3, FR-10] */}
          {activeTab === 'versions' && (
            <div
              id="panel-versions"
              role="tabpanel"
              aria-labelledby="tab-versions"
              data-testid="versions-tab-panel"
            >
              <VersionHistory
                contractId={contract.id}
                contract={contract}
                parentContractId={contract.parent_contract_id}
                onVersionUploaded={() => fetchContractDetail(true)}
              />
            </div>
          )}

          {/* 3. Amendment Audit Trail Panel [FR-7] */}
          {activeTab === 'amendments' && (
            <div
              id="panel-amendments"
              role="tabpanel"
              aria-labelledby="tab-amendments"
              data-testid="amendments-tab-panel"
            >
              <AmendmentTimeline
                contractId={contract.id}
                contract={contract}
                onAmendmentAdded={() => fetchContractDetail(true)}
              />
            </div>
          )}

          {/* 4. E-Signature Execution Panel */}
          {activeTab === 'signature' && (
            <div
              id="panel-signature"
              role="tabpanel"
              aria-labelledby="tab-signature"
              data-testid="signature-tab-panel"
              className="space-y-6"
            >
              <div className="max-w-2xl mx-auto">
                <SignaturePad
                  contractId={contract.id}
                  contractTitle={contract.title}
                  signatoryName={contract.counterparty}
                  signatoryRole="Authorized Counterparty Representative"
                  status={contract.status === 'PENDING_SIGNATURE' ? 'PENDING' : contract.status}
                  onSignatureCaptured={() => fetchContractDetail(true)}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Attach Supporting Exhibit / SOW Modal [FR-10] */}
      {isAttachModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attach-modal-title"
          data-testid="attach-modal"
        >
          <div className="bg-white rounded-lg border border-[#e4e2dd] shadow-xl max-w-lg w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#e4e2dd] pb-4">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-5 h-5 text-[#735c41]" />
                <h2
                  id="attach-modal-title"
                  className="text-lg font-serif text-[#1b1c19]"
                >
                  Attach Supporting Exhibit or SOW
                </h2>
              </div>
              <button
                onClick={() => setIsAttachModalOpen(false)}
                className="text-[#80756b] hover:text-[#1b1c19] p-1 rounded transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {attachError && (
              <div
                className="p-3 text-sm text-[#93000a] bg-[#ffdad6] rounded border border-[#ba1a1a]/20 flex items-start space-x-2"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{attachError}</span>
              </div>
            )}

            {attachSuccessMsg && (
              <div
                className="p-3 text-sm text-[#1b1c19] bg-[#f0eee9] rounded border border-[#735c41]/30 flex items-start space-x-2"
                role="status"
              >
                <CheckCircle2 className="w-4 h-4 text-[#735c41] mt-0.5 flex-shrink-0" />
                <span>{attachSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleAttachSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="attach-category-select"
                  className="block text-xs font-medium uppercase tracking-wider text-[#4e453d] mb-1.5"
                >
                  Attachment Category Type [FR-3, FR-10]
                </label>
                <select
                  id="attach-category-select"
                  value={attachCategory}
                  onChange={(e) => setAttachCategory(e.target.value as ContractCategory)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#d1c4b9] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:border-[#735c41]"
                  data-testid="attach-category-select"
                >
                  <option value="Exhibit">Exhibit</option>
                  <option value="SOW">Statement of Work (SOW)</option>
                  <option value="NDA">Non-Disclosure Agreement (NDA)</option>
                  <option value="Contract">Revised Main Contract</option>
                </select>
                <p className="mt-1 text-xs text-[#80756b]">
                  Supporting exhibits and SOWs are directly linked to this parent agreement record ({contract.id.substring(0, 8)}...).
                </p>
              </div>

              <div>
                <label
                  htmlFor="attach-file-input"
                  className="block text-xs font-medium uppercase tracking-wider text-[#4e453d] mb-1.5"
                >
                  Upload Supporting Document File (.pdf, .docx)
                </label>
                <input
                  id="attach-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-sm text-[#4e453d] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#f0eee9] file:text-[#59452b] hover:file:bg-[#eae8e3] cursor-pointer"
                  data-testid="attach-file-input"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#e4e2dd]">
                <button
                  type="button"
                  onClick={() => setIsAttachModalOpen(false)}
                  disabled={attachLoading}
                  className="px-4 py-2 text-sm font-medium text-[#4e453d] bg-white border border-[#d1c4b9] rounded-md hover:bg-[#f5f3ee] transition-colors"
                  data-testid="attach-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attachLoading || !attachFile}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#59452b] rounded-md hover:bg-[#735c41] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-colors disabled:opacity-50"
                  data-testid="attach-submit-btn"
                >
                  {attachLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Uploading Attachment...
                    </>
                  ) : (
                    <>
                      <Paperclip className="w-4 h-4 mr-2" />
                      Attach Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Contract Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          data-testid="delete-modal"
        >
          <div className="bg-white rounded-lg border border-[#e4e2dd] shadow-xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center space-x-3 text-[#ba1a1a]">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h2 id="delete-modal-title" className="text-lg font-serif font-medium">
                Confirm Contract Deletion
              </h2>
            </div>

            <p className="text-sm text-[#4e453d]">
              Are you sure you want to delete <strong className="text-[#1b1c19]">{contract.title}</strong>?
              This action will remove the agreement record, clauses, SLAs, document versions, and amendment logs.
            </p>

            {deleteError && (
              <div
                className="p-3 text-sm text-[#93000a] bg-[#ffdad6] rounded border border-[#ba1a1a]/20"
                role="alert"
              >
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#e4e2dd]">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-[#4e453d] bg-white border border-[#d1c4b9] rounded-md hover:bg-[#f5f3ee] transition-colors"
                data-testid="cancel-delete-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteContract}
                disabled={deleteLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#ba1a1a] rounded-md hover:bg-[#93000a] transition-colors disabled:opacity-50"
                data-testid="confirm-delete-btn"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
