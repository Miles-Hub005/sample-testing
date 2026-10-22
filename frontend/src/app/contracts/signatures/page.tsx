'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  PenTool,
  ArrowLeft,
  Building2,
  X,
  ShieldCheck,
  Eye,
  Filter,
  Check,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { StatusLabel } from '../../../components/common/StatusLabel';
import { SignaturePad } from '../../../components/contracts/signature_pad';
import { apiClient, UserMeResponse } from '../../../services/apiClient';
import {
  contractApi,
  PendingSignatureItemResponse,
  SignatureExecuteResponse,
} from '../../../services/contract_api';

export default function SignaturesHubPage() {
  // Session & User Identity State
  const [user, setUser] = useState<UserMeResponse | null>(null);

  // Pending Signature Requests State
  const [pendingItems, setPendingItems] = useState<PendingSignatureItemResponse[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Active Signature Request Modal State
  const [activeRequest, setActiveRequest] = useState<PendingSignatureItemResponse | null>(null);
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);

  // Notification Banner
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Session Completed Signature Request IDs for optimistic local updates
  const [completedRequestIds, setCompletedRequestIds] = useState<string[]>([]);

  // Fetch Pending Signatures
  const fetchPendingSignatures = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const response = await contractApi.listPendingSignatures();
      const items = response?.items || [];
      setPendingItems(items);
      setTotalCount(response?.total_count ?? items.length);
    } catch (err: any) {
      console.error('Error retrieving pending signatures:', err);
      setError(err?.message || 'Failed to retrieve pending signature requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // On Mount: Load user profile and pending signature list
  useEffect(() => {
    let isMounted = true;

    apiClient
      .getMe()
      .then((data) => {
        if (isMounted) setUser(data);
      })
      .catch(() => {
        // Non-fatal user identity lookup fallback
      });

    fetchPendingSignatures();

    return () => {
      isMounted = false;
    };
  }, [fetchPendingSignatures]);

  // Auto-dismiss notification after 6 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Client-side Filtered Pending Signature Items
  const filteredItems = useMemo(() => {
    return pendingItems.filter((item) => {
      const titleMatch = item.contract_title ? item.contract_title.toLowerCase().includes(searchQuery.toLowerCase().trim()) : false;
      const counterpartyMatch = item.counterparty ? item.counterparty.toLowerCase().includes(searchQuery.toLowerCase().trim()) : false;
      const idMatch = item.signature_request_id ? item.signature_request_id.toLowerCase().includes(searchQuery.toLowerCase().trim()) : false;
      
      const matchesSearch = !searchQuery.trim() || titleMatch || counterpartyMatch || idMatch;

      const isCompletedLocally = completedRequestIds.includes(item.signature_request_id);
      const effectiveStatus = isCompletedLocally ? 'EXECUTED' : item.status;

      const matchesStatus =
        statusFilter === 'ALL' ||
        effectiveStatus.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [pendingItems, searchQuery, statusFilter, completedRequestIds]);

  // Count of Unique Counterparties
  const uniqueCounterpartiesCount = useMemo(() => {
    const set = new Set<string>();
    pendingItems.forEach((item) => {
      if (item.counterparty) set.add(item.counterparty);
    });
    return set.size;
  }, [pendingItems]);

  // Open Signature Modal
  const handleOpenSignModal = (item: PendingSignatureItemResponse) => {
    setActiveRequest(item);
    setIsSignModalOpen(true);
  };

  // Close Signature Modal
  const handleCloseSignModal = () => {
    setIsSignModalOpen(false);
    setActiveRequest(null);
  };

  // Handle Signature Capture Callback
  const handleSignatureCaptured = (result: SignatureExecuteResponse | { digest: string }) => {
    if (activeRequest?.signature_request_id) {
      setCompletedRequestIds((prev) => [...prev, activeRequest.signature_request_id]);
    }

    setNotification({
      message: `Signature successfully executed for "${activeRequest?.contract_title || 'Contract'}"! All parties notified.`,
      type: 'success',
    });

    handleCloseSignModal();
    fetchPendingSignatures(true);
  };

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen"
      data-testid="signatures-hub-page"
    >
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#e4e2dd]">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2">
            <Link
              href="/contracts"
              className="inline-flex items-center text-sm font-medium text-[#735c41] hover:text-[#59452b] transition-colors"
              data-testid="back-to-repository-link"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Contracts Repository
            </Link>
          </nav>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#f5f3ee] text-[#59452b] rounded-lg border border-[#d1c4b9]">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-normal text-[#1b1c19] tracking-tight">
                Centralized E-Signature Hub
              </h1>
              <p className="text-sm text-[#4e453d] mt-0.5">
                Review, manage, and execute pending digital signature requests across active agreements [FR-5, FR-6].
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchPendingSignatures(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-[#d1c4b9] text-[#4e453d] bg-white hover:bg-[#f5f3ee] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-colors disabled:opacity-50"
            data-testid="refresh-signatures-btn"
            title="Refresh pending signatures list"
          >
            <RotateCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh List'}
          </button>
        </div>
      </div>

      {/* Success / Error Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-md border flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-[#f0eee9] border-[#735c41] text-[#281804]'
              : 'bg-[#ffdad6] border-[#ba1a1a] text-[#93000a]'
          }`}
          role="status"
          data-testid="notification-banner"
        >
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#59452b] flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#ba1a1a] flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[#4e453d] hover:text-[#1b1c19] p-1 rounded-md"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Pending Requests Stat */}
        <div
          className="bg-white p-5 rounded-lg border border-[#e4e2dd] shadow-sm flex items-center justify-between"
          data-testid="pending-count-card"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#80756b]">
              Pending Execution
            </p>
            <h2 className="text-3xl font-serif font-medium text-[#1b1c19] mt-1">
              {totalCount}
            </h2>
            <p className="text-xs text-[#4e453d] mt-1">
              Awaiting digital signature
            </p>
          </div>
          <div className="p-3 bg-[#f5f3ee] text-[#59452b] rounded-full">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Counterparties Stat */}
        <div
          className="bg-white p-5 rounded-lg border border-[#e4e2dd] shadow-sm flex items-center justify-between"
          data-testid="counterparties-count-card"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#80756b]">
              Active Counterparties
            </p>
            <h2 className="text-3xl font-serif font-medium text-[#1b1c19] mt-1">
              {uniqueCounterpartiesCount}
            </h2>
            <p className="text-xs text-[#4e453d] mt-1">
              Distinct external entities
            </p>
          </div>
          <div className="p-3 bg-[#f5f3ee] text-[#735c41] rounded-full">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* User Identity Stat */}
        <div
          className="bg-white p-5 rounded-lg border border-[#e4e2dd] shadow-sm flex items-center justify-between"
          data-testid="signatory-role-card"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#80756b]">
              Authorized Signatory
            </p>
            <p className="text-base font-medium text-[#1b1c19] mt-1 truncate max-w-[180px]">
              {user?.email || 'Authorized User'}
            </p>
            <p className="text-xs text-[#4e453d] mt-1">
              {user?.roles?.join(', ') || 'ClientViewer'}
            </p>
          </div>
          <div className="p-3 bg-[#f5f3ee] text-[#59452b] rounded-full">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#e4e2dd] shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <label htmlFor="search-signatures-input" className="sr-only">
            Search signature requests
          </label>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#80756b]" />
          <input
            id="search-signatures-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by contract title or counterparty..."
            className="w-full pl-9 pr-4 py-2 border border-[#d1c4b9] rounded-md text-sm text-[#1b1c19] bg-white placeholder-[#80756b] focus:outline-none focus:ring-2 focus:ring-[#735c41]"
            data-testid="search-signatures-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#80756b] hover:text-[#1b1c19]"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-[#80756b] uppercase tracking-wider hidden sm:inline">
            Status:
          </span>
          <div className="inline-flex rounded-md border border-[#d1c4b9] bg-[#f5f3ee] p-0.5">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white text-[#59452b] shadow-sm'
                  : 'text-[#4e453d] hover:text-[#1b1c19]'
              }`}
              data-testid="filter-status-all"
            >
              All ({pendingItems.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'PENDING' || statusFilter === 'PENDING_SIGNATURE'
                  ? 'bg-white text-[#59452b] shadow-sm'
                  : 'text-[#4e453d] hover:text-[#1b1c19]'
              }`}
              data-testid="filter-status-pending"
            >
              Pending Execution
            </button>
            <button
              onClick={() => setStatusFilter('EXECUTED')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'EXECUTED'
                  ? 'bg-white text-[#59452b] shadow-sm'
                  : 'text-[#4e453d] hover:text-[#1b1c19]'
              }`}
              data-testid="filter-status-executed"
            >
              Executed ({completedRequestIds.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Pending Signatures Content Area */}
      {loading ? (
        <div
          className="bg-white rounded-lg border border-[#e4e2dd] p-12 text-center"
          aria-busy="true"
          data-testid="loading-signatures"
        >
          <RotateCw className="w-8 h-8 animate-spin text-[#735c41] mx-auto mb-3" />
          <h2 className="text-base font-medium text-[#1b1c19]">
            Loading Pending Signature Requests...
          </h2>
          <p className="text-xs text-[#80756b] mt-1">
            Retrieving contract agreements awaiting authorization [NFR-5].
          </p>
        </div>
      ) : error ? (
        <div
          className="bg-white rounded-lg border border-[#ffdad6] p-8 text-center"
          role="alert"
          data-testid="signatures-error"
        >
          <AlertCircle className="w-10 h-10 text-[#ba1a1a] mx-auto mb-3" />
          <h2 className="text-lg font-medium text-[#1b1c19] mb-1">
            Failed to Load Pending Signatures
          </h2>
          <p className="text-sm text-[#4e453d] max-w-md mx-auto mb-4">
            {error}
          </p>
          <button
            onClick={() => fetchPendingSignatures()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[#59452b] hover:bg-[#735c41] transition-colors"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="bg-white rounded-lg border border-[#e4e2dd] p-12 text-center shadow-sm"
          data-testid="no-pending-signatures"
        >
          <div className="w-12 h-12 bg-[#f5f3ee] text-[#735c41] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif text-[#1b1c19] mb-2">
            No Pending Signatures Required
          </h2>
          <p className="text-sm text-[#4e453d] max-w-md mx-auto mb-6">
            {searchQuery
              ? `No signature requests match your query "${searchQuery}". Try adjusting your search.`
              : 'All contract agreements assigned to your workspace are fully executed or no pending requests exist.'}
          </p>
          <div className="flex items-center justify-center space-x-4">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 text-sm font-medium rounded-md border border-[#80756b] text-[#59452b] bg-white hover:bg-[#f5f3ee] transition-colors"
              >
                Clear Search
              </button>
            )}
            <Link
              href="/contracts"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[#59452b] hover:bg-[#735c41] transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Go to Contracts Repository
            </Link>
          </div>
        </div>
      ) : (
        /* Pending Signatures Table / List Container */
        <div
          className="bg-white rounded-lg border border-[#e4e2dd] shadow-sm overflow-hidden"
          data-testid="pending-signatures-list"
        >
          <div className="px-6 py-4 bg-[#f5f3ee] border-b border-[#e4e2dd] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#735c41]" />
              <h2 className="text-sm font-medium text-[#1b1c19]">
                Contracts Awaiting Digital Execution ({filteredItems.length})
              </h2>
            </div>
            <span className="text-xs text-[#80756b]">
              Click &quot;Execute Signature&quot; to inspect and digitally sign agreement
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e4e2dd] bg-[#fbf9f4] text-xs font-medium text-[#80756b] uppercase tracking-wider">
                  <th scope="col" className="px-6 py-3">Contract Title</th>
                  <th scope="col" className="px-6 py-3">Counterparty</th>
                  <th scope="col" className="px-6 py-3">Signatory ID</th>
                  <th scope="col" className="px-6 py-3">Requested At</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e2dd]">
                {filteredItems.map((item) => {
                  const isCompletedLocally = completedRequestIds.includes(item.signature_request_id);
                  const effectiveStatus = isCompletedLocally ? 'EXECUTED' : item.status;

                  return (
                    <tr
                      key={item.signature_request_id}
                      className="hover:bg-[#f9f7f2] transition-colors"
                      data-testid={`signature-item-${item.signature_request_id}`}
                    >
                      {/* Contract Title & Link */}
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          <FileText className="w-5 h-5 text-[#735c41] flex-shrink-0 mt-0.5" />
                          <div>
                            <Link
                              href={`/contracts/${item.contract_id}`}
                              className="font-medium text-[#1b1c19] hover:text-[#59452b] hover:underline text-sm transition-colors"
                              data-testid={`contract-link-${item.contract_id}`}
                              title="View contract details"
                            >
                              {item.contract_title || 'Untitled Contract Agreement'}
                            </Link>
                            <p className="text-xs text-[#80756b] font-mono mt-0.5">
                              Req ID: {item.signature_request_id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Counterparty */}
                      <td className="px-6 py-4 text-sm text-[#4e453d]">
                        <div className="flex items-center space-x-1.5">
                          <Building2 className="w-4 h-4 text-[#80756b]" />
                          <span>{item.counterparty || 'Unknown Counterparty'}</span>
                        </div>
                      </td>

                      {/* Signatory ID */}
                      <td className="px-6 py-4 text-xs text-[#80756b] font-mono">
                        {item.signatory_id || 'Self'}
                      </td>

                      {/* Requested At */}
                      <td className="px-6 py-4 text-sm text-[#4e453d]">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Pending'}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusLabel status={effectiveStatus} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/contracts/${item.contract_id}`}
                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#d1c4b9] text-[#4e453d] bg-white hover:bg-[#f5f3ee] transition-colors"
                            data-testid={`view-contract-link-${item.contract_id}`}
                            title="Inspect contract details"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Inspect
                          </Link>

                          {effectiveStatus === 'EXECUTED' || effectiveStatus === 'COMPLETED' ? (
                            <span
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-[#59452b] bg-[#f0eee9] border border-[#735c41] rounded-md"
                              data-testid={`executed-badge-${item.signature_request_id}`}
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Executed
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenSignModal(item)}
                              className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-md text-white bg-[#59452b] hover:bg-[#735c41] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-colors shadow-sm"
                              data-testid={`sign-btn-${item.signature_request_id}`}
                            >
                              <PenTool className="w-3.5 h-3.5 mr-1.5" />
                              Execute Signature
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Signature Pad Modal Dialog [FR-6] */}
      {isSignModalOpen && activeRequest && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signature-modal-heading"
          data-testid="signature-modal"
        >
          <div className="bg-[#fbf9f4] rounded-lg border border-[#e4e2dd] shadow-xl max-w-3xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#e4e2dd] mb-6">
              <div>
                <h2 id="signature-modal-heading" className="text-xl font-serif text-[#1b1c19]">
                  Digital Signature Execution
                </h2>
                <p className="text-xs text-[#4e453d] mt-0.5">
                  Contract: <span className="font-medium text-[#1b1c19]">{activeRequest.contract_title || 'Agreement'}</span> | Counterparty: <span className="font-medium text-[#1b1c19]">{activeRequest.counterparty || 'N/A'}</span>
                </p>
              </div>
              <button
                onClick={handleCloseSignModal}
                className="text-[#80756b] hover:text-[#1b1c19] p-1.5 rounded-md hover:bg-[#e4e2dd] transition-colors"
                aria-label="Close signature modal"
                data-testid="close-signature-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SignaturePad Component */}
            <SignaturePad
              signatureRequestId={activeRequest.signature_request_id}
              contractId={activeRequest.contract_id}
              contractTitle={activeRequest.contract_title || 'Contract Agreement'}
              signatoryName={user?.email ? user.email.split('@')[0] : 'Authorized Signatory'}
              signatoryRole="Authorized Signatory"
              signatoryId={activeRequest.signatory_id || user?.user_id}
              status={completedRequestIds.includes(activeRequest.signature_request_id) ? 'EXECUTED' : activeRequest.status}
              onSignatureCaptured={handleSignatureCaptured}
              onCancel={handleCloseSignModal}
              data-testid="hub-signature-pad"
            />
          </div>
        </div>
      )}
    </div>
  );
}
