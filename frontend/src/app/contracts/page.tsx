'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Filter,
  Plus,
  RotateCw,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  PenTool,
  ShieldCheck,
  ArrowRight,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { StatusLabel } from '../../components/common/StatusLabel';
import { ClauseViewer } from '../../components/contracts/clause_viewer';
import { apiClient, UserMeResponse } from '../../services/apiClient';
import {
  listContracts,
  getContractDetail,
  createContract,
  ALLOWED_CATEGORIES,
  ALLOWED_STATUSES,
  ContractCategory,
  ContractStatus,
  ContractSummaryResponse,
  ContractDetailResponse,
  ContractCreateRequest,
} from '../../services/contract_api';

export default function ContractsPage() {
  // Session & Identity Context State
  const [user, setUser] = useState<UserMeResponse | null>(null);

  // Repository List & Filter State
  const [contracts, setContracts] = useState<ContractSummaryResponse[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter Parameters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [counterpartyFilter, setCounterpartyFilter] = useState<string>('');
  const [expiresBeforeFilter, setExpiresBeforeFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Quick Inspection / Clause Viewer Modal State
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedContractDetail, setSelectedContractDetail] = useState<ContractDetailResponse | null>(null);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // New Contract Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    category: ContractCategory;
    counterparty: string;
    start_on: string;
    expires_on: string;
  }>({
    title: '',
    category: 'Contract',
    counterparty: '',
    start_on: '',
    expires_on: '',
  });

  // Load Active User Info
  useEffect(() => {
    let isMounted = true;
    apiClient
      .getMe()
      .then((data) => {
        if (isMounted) setUser(data);
      })
      .catch(() => {
        // Non-fatal session lookup
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Repository Contracts
  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams: any = {
        page,
        limit,
      };

      if (categoryFilter && categoryFilter !== 'ALL') {
        queryParams.category = categoryFilter;
      }
      if (statusFilter && statusFilter !== 'ALL') {
        queryParams.status = statusFilter;
      }
      if (counterpartyFilter.trim()) {
        queryParams.counterparty = counterpartyFilter.trim();
      }
      if (expiresBeforeFilter.trim()) {
        queryParams.expires_before = expiresBeforeFilter.trim();
      }

      const res = await listContracts(queryParams);
      setContracts(res.items || []);
      setTotalCount(res.total_count || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve contract records from repository.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, counterpartyFilter, expiresBeforeFilter, page, limit]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Reset Filters
  const handleResetFilters = () => {
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setCounterpartyFilter('');
    setExpiresBeforeFilter('');
    setPage(1);
  };

  // Quick Clause/SLA Inspection Handler
  const handleInspectContract = async (contractId: string) => {
    setSelectedContractId(contractId);
    setInspectLoading(true);
    setInspectError(null);
    setSelectedContractDetail(null);
    try {
      const detail = await getContractDetail(contractId);
      setSelectedContractDetail(detail);
    } catch (err: any) {
      setInspectError(err?.message || 'Failed to load contract details for inspection.');
    } finally {
      setInspectLoading(false);
    }
  };

  const closeInspectModal = () => {
    setSelectedContractId(null);
    setSelectedContractDetail(null);
    setInspectError(null);
  };

  // Submit New Contract Handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccessMsg(null);

    if (!formData.title.trim()) {
      setCreateError('Contract title is required.');
      return;
    }
    if (!formData.counterparty.trim()) {
      setCreateError('Counterparty name is required.');
      return;
    }

    setCreateLoading(true);
    try {
      const payload: ContractCreateRequest = {
        title: formData.title.trim(),
        category: formData.category,
        counterparty: formData.counterparty.trim(),
        start_on: formData.start_on.trim() || undefined,
        expires_on: formData.expires_on.trim() || undefined,
      };

      const newContract = await createContract(payload);
      setCreateSuccessMsg(`Contract "${newContract.title}" successfully created!`);
      setFormData({
        title: '',
        category: 'Contract',
        counterparty: '',
        start_on: '',
        expires_on: '',
      });
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccessMsg(null);
      }, 1000);
      fetchContracts();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create contract.');
    } finally {
      setCreateLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const activeFiltersCount =
    (categoryFilter !== 'ALL' ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0) +
    (counterpartyFilter.trim() !== '' ? 1 : 0) +
    (expiresBeforeFilter.trim() !== '' ? 1 : 0);

  return (
    <div className="space-y-8 bg-[#fbf9f4] min-h-screen p-4 sm:p-6 md:p-8" data-testid="contracts-page">
      {/* Page Header */}
      <header className="border-b border-[#e4e2dd] pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#735c41] mb-1">
              <FileText className="w-4 h-4 text-[#735c41]" aria-hidden="true" />
              <span>Contract Lifecycle & Governance</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#1b1c19] tracking-tight">
              Contract Repository
            </h1>
            <p className="mt-2 text-base text-[#4e453d] max-w-3xl">
              Centralized repository for searching, filtering, and managing Master Agreements, SOWs, NDAs, exhibits, clauses, and SLA obligations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/contracts/signatures"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#f0eee9] hover:bg-[#eae8e3] text-[#59452b] border border-[#d1c4b9] font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]"
              aria-label="Go to E-Signature Hub"
            >
              <PenTool className="w-4 h-4 text-[#735c41]" aria-hidden="true" />
              <span>Signature Hub</span>
            </Link>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#59452b] hover:bg-[#735c41] text-[#ffffff] font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#735c41]"
              data-testid="create-contract-btn"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>New Contract</span>
            </button>
          </div>
        </div>

        {/* User Session Info Badge */}
        {user && (
          <div className="mt-4 flex items-center gap-3 text-xs text-[#4e453d] bg-[#f0eee9] px-3 py-1.5 rounded-md border border-[#e4e2dd] w-fit">
            <ShieldCheck className="w-3.5 h-3.5 text-[#735c41]" aria-hidden="true" />
            <span>
              Session: <strong className="text-[#1b1c19]">{user.email}</strong> ({user.tenant_id})
            </span>
            {user.roles && user.roles.length > 0 && (
              <span className="bg-[#e4e2dd] text-[#1b1c19] px-1.5 py-0.5 rounded font-mono">
                {user.roles.join(', ')}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Filter & Search Bar Section */}
      <section
        aria-labelledby="filter-section-heading"
        className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 id="filter-section-heading" className="text-lg font-serif text-[#1b1c19] flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#735c41]" aria-hidden="true" />
            <span>Filter Repository Documents</span>
          </h2>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-[#735c41] hover:text-[#59452b] underline font-medium focus:outline-none"
              data-testid="clear-filters-btn"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear All ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label htmlFor="category-select" className="block text-xs font-medium text-[#4e453d] uppercase tracking-wider mb-1">
              Document Category
            </label>
            <select
              id="category-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3 py-2 text-sm text-[#1b1c19] focus:border-[#735c41] focus:ring-1 focus:ring-[#735c41] outline-none"
              data-testid="category-filter"
            >
              <option value="ALL">All Categories</option>
              {ALLOWED_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-select" className="block text-xs font-medium text-[#4e453d] uppercase tracking-wider mb-1">
              Lifecycle Status
            </label>
            <select
              id="status-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3 py-2 text-sm text-[#1b1c19] focus:border-[#735c41] focus:ring-1 focus:ring-[#735c41] outline-none"
              data-testid="status-filter"
            >
              <option value="ALL">All Statuses</option>
              {ALLOWED_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Counterparty Search Input */}
          <div>
            <label htmlFor="counterparty-input" className="block text-xs font-medium text-[#4e453d] uppercase tracking-wider mb-1">
              Counterparty Name
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#80756b]" aria-hidden="true" />
              <input
                id="counterparty-input"
                type="text"
                placeholder="Search counterparty..."
                value={counterpartyFilter}
                onChange={(e) => {
                  setCounterpartyFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-[#d1c4b9] bg-[#ffffff] pl-9 pr-3 py-2 text-sm text-[#1b1c19] focus:border-[#735c41] focus:ring-1 focus:ring-[#735c41] outline-none"
                data-testid="counterparty-search"
              />
            </div>
          </div>

          {/* Expiration Date Filter */}
          <div>
            <label htmlFor="expiration-input" className="block text-xs font-medium text-[#4e453d] uppercase tracking-wider mb-1">
              Expires On or Before
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-[#80756b]" aria-hidden="true" />
              <input
                id="expiration-input"
                type="date"
                value={expiresBeforeFilter}
                onChange={(e) => {
                  setExpiresBeforeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-[#d1c4b9] bg-[#ffffff] pl-9 pr-3 py-2 text-sm text-[#1b1c19] focus:border-[#735c41] focus:ring-1 focus:ring-[#735c41] outline-none"
                data-testid="expiration-filter"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Repository List Section */}
      <section aria-labelledby="repository-list-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="repository-list-heading" className="text-xl font-serif text-[#1b1c19]">
              Documents & Contracts
            </h2>
            <span className="text-xs font-mono bg-[#eae8e3] text-[#4e453d] px-2 py-0.5 rounded-full">
              {totalCount} {totalCount === 1 ? 'record' : 'records'}
            </span>
          </div>

          <button
            onClick={fetchContracts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-[#735c41] hover:text-[#59452b] font-medium transition-colors focus:outline-none"
            aria-label="Refresh contract list"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error Alert State */}
        {error && (
          <div
            className="flex items-start gap-3 p-4 bg-[#ffdad6] text-[#93000a] rounded-md border border-[#ba1a1a]"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold">Repository Error</p>
              <p className="mt-1">{error}</p>
              <button
                onClick={fetchContracts}
                className="mt-2 text-xs font-medium underline hover:text-[#71160b]"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner / Skeleton */}
        {loading && (
          <div
            className="flex flex-col items-center justify-center py-12 bg-[#f0eee9] border border-[#e4e2dd] rounded-lg text-[#4e453d]"
            aria-busy="true"
            aria-label="Loading repository contracts"
          >
            <RotateCw className="w-6 h-6 animate-spin text-[#735c41] mb-2" aria-hidden="true" />
            <span className="text-sm font-medium">Fetching contract repository data...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && contracts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#f0eee9] border border-[#e4e2dd] rounded-lg text-center">
            <FileText className="w-10 h-10 text-[#80756b] mb-3" aria-hidden="true" />
            <h3 className="text-base font-serif text-[#1b1c19]">No Contracts Found</h3>
            <p className="text-sm text-[#4e453d] max-w-md mt-1">
              No agreement records match your current filter criteria. Try clearing filters or creating a new contract.
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 text-xs font-medium text-[#59452b] bg-[#eae8e3] hover:bg-[#dbdad5] rounded-md transition-colors"
              >
                Clear Active Filters
              </button>
            )}
          </div>
        )}

        {/* Contract Table Grid */}
        {!loading && !error && contracts.length > 0 && (
          <div className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#1b1c19]">
                <thead className="bg-[#eae8e3] border-b border-[#e4e2dd] text-xs font-serif text-[#4e453d] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3.5 px-4">
                      Title & ID
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Category
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Counterparty
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Status
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Start Date
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Expires On
                    </th>
                    <th scope="col" className="py-3.5 px-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4e2dd] bg-[#fbf9f4]">
                  {contracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className="hover:bg-[#f5f3ee] transition-colors"
                      data-testid={`contract-row-${contract.id}`}
                    >
                      {/* Title & ID */}
                      <td className="py-3.5 px-4 font-medium">
                        <Link
                          href={`/contracts/${contract.id}`}
                          className="text-[#1b1c19] hover:text-[#735c41] font-semibold flex items-center gap-1.5 group"
                        >
                          <span>{contract.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#735c41] transition-opacity" />
                        </Link>
                        <span className="block text-xs font-mono text-[#80756b] mt-0.5">
                          ID: {contract.id}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block text-xs font-mono bg-[#e4e2dd] text-[#1b1c19] px-2.5 py-1 rounded">
                          {contract.category}
                        </span>
                      </td>

                      {/* Counterparty */}
                      <td className="py-3.5 px-4 text-[#4e453d]">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#80756b]" aria-hidden="true" />
                          <span>{contract.counterparty}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusLabel status={contract.status} size="sm" />
                      </td>

                      {/* Start Date */}
                      <td className="py-3.5 px-4 text-xs font-mono text-[#4e453d]">
                        {contract.start_on ? contract.start_on : '—'}
                      </td>

                      {/* Expires On */}
                      <td className="py-3.5 px-4 text-xs font-mono text-[#4e453d]">
                        {contract.expires_on ? contract.expires_on : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleInspectContract(contract.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#735c41] hover:text-[#59452b] bg-[#f0eee9] hover:bg-[#eae8e3] px-2.5 py-1.5 rounded border border-[#d1c4b9] transition-colors focus:outline-none"
                          title="Quick Inspect Clauses & SLAs"
                          data-testid="quick-inspect-btn"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Inspect</span>
                        </button>

                        <Link
                          href={`/contracts/${contract.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#ffffff] bg-[#59452b] hover:bg-[#735c41] px-2.5 py-1.5 rounded transition-colors focus:outline-none"
                        >
                          <span>Details</span>
                          <ArrowRight className="w-3 h-3" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#f0eee9] border-t border-[#e4e2dd] text-xs text-[#4e453d]">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded border border-[#d1c4b9] bg-[#ffffff] px-2 py-1 text-xs text-[#1b1c19] outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>per page</span>
              </div>

              <div>
                Page <strong className="text-[#1b1c19]">{page}</strong> of{' '}
                <strong className="text-[#1b1c19]">{totalPages}</strong> ({totalCount} total items)
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded border border-[#d1c4b9] bg-[#ffffff] hover:bg-[#f5f3ee] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4 text-[#1b1c19]" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded border border-[#d1c4b9] bg-[#ffffff] hover:bg-[#f5f3ee] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-4 h-4 text-[#1b1c19]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Quick Clause/SLA Inspection Drawer / Modal (FR-1) */}
      {selectedContractId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1b1c19]/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-drawer-title"
          data-testid="clause-inspection-drawer"
        >
          <div className="bg-[#fbf9f4] border border-[#e4e2dd] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#f0eee9] border-b border-[#e4e2dd]">
              <div>
                <h3 id="inspect-drawer-title" className="text-lg font-serif text-[#1b1c19] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#735c41]" aria-hidden="true" />
                  <span>Contract Clause & SLA Inspector</span>
                </h3>
                <p className="text-xs text-[#4e453d]">
                  Quick inspection view for key terms, highlighted clauses, and active SLAs [FR-1]
                </p>
              </div>

              <button
                onClick={closeInspectModal}
                className="p-1.5 text-[#80756b] hover:text-[#1b1c19] rounded-md hover:bg-[#eae8e3] transition-colors"
                aria-label="Close Inspector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {inspectLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-[#4e453d]">
                  <RotateCw className="w-6 h-6 animate-spin text-[#735c41] mb-2" />
                  <span className="text-sm font-medium">Loading clauses, key terms, and SLAs...</span>
                </div>
              )}

              {inspectError && (
                <div className="p-4 bg-[#ffdad6] text-[#93000a] rounded-md border border-[#ba1a1a]" role="alert">
                  <p className="font-semibold text-sm">Failed to load contract inspection</p>
                  <p className="text-xs mt-1">{inspectError}</p>
                </div>
              )}

              {!inspectLoading && !inspectError && selectedContractDetail && (
                <div className="space-y-6">
                  {/* Detailed Clause Viewer Component */}
                  <ClauseViewer
                    contract={selectedContractDetail}
                    title={selectedContractDetail.title}
                    category={selectedContractDetail.category}
                    status={selectedContractDetail.status}
                    counterparty={selectedContractDetail.counterparty}
                  />

                  <div className="pt-4 border-t border-[#e4e2dd] flex items-center justify-between">
                    <span className="text-xs text-[#4e453d] font-mono">
                      Contract ID: {selectedContractDetail.id}
                    </span>

                    <Link
                      href={`/contracts/${selectedContractDetail.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#59452b] text-[#ffffff] hover:bg-[#735c41] rounded-md transition-colors"
                    >
                      <span>Full Contract View & Documents</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Contract Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1b1c19]/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-modal-title"
          data-testid="create-contract-modal"
        >
          <div className="bg-[#fbf9f4] border border-[#e4e2dd] rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#f0eee9] border-b border-[#e4e2dd]">
              <h3 id="create-modal-title" className="text-lg font-serif text-[#1b1c19] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#735c41]" aria-hidden="true" />
                <span>Create New Agreement Record</span>
              </h3>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-[#80756b] hover:text-[#1b1c19] rounded-md hover:bg-[#eae8e3] transition-colors"
                aria-label="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-[#ffdad6] text-[#93000a] text-xs rounded-md border border-[#ba1a1a]">
                  {createError}
                </div>
              )}

              {createSuccessMsg && (
                <div className="p-3 bg-[#d0e4ff] text-[#071d30] text-xs rounded-md border border-[#4f6278] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#374a5f]" />
                  <span>{createSuccessMsg}</span>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label htmlFor="create-title" className="block text-xs font-medium text-[#4e453d] uppercase tracking-wider mb-1">
                  Agreement Title *
                </label>
                <input
                  id="create-title"
                  type="text"
                  required
                  placeholder="e.g. Master Services Agreement 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3 py-2 text-sm text-[#1b1c19] focus:border-[#735c41] focus:ring-1 focus:ring-[#735c41] outline-none"
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <label htmlFor="create-category" className="block text-xs font-medium text-[#4e453d] uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  id="create-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ContractCategory })}
                  className="w-full rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3 py-2 text-sm text-[#1b1c19] focus:border-[#735c41] focus:ring-1 focus:ring-[#735c41] outline-none"
                >
                  {ALLOWED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Counterparty Input */}
              <div>
                <label htmlFor="create-counterparty" className="block text-xs font-medium text-[#4e453d] uppercase tracking-wider mb-1">
                  Counterparty *
                </label>
                <input
                  id="create-counterparty"
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={formData.counterparty}
                  onChange={(e) => setFormData({ ...formData, counterparty: e.target.value })}
                  className="w-full rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3 py-2 text-sm text-[#1b1c19] focus:border-[#735c41] focus:ring-1 focus:ring-[#735c41] outline-none"
                />
              </div>

              {/* Start & Expiration Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-start-on" className="block text-xs font-medium text-[#4e453d] uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    id="create-start-on"
                    type="date"
                    value={formData.start_on}
                    onChange={(e) => setFormData({ ...formData, start_on: e.target.value })}
                    className="w-full rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3 py-2 text-sm text-[#1b1c19] focus:border-[#735c41] focus:ring-1 focus:ring-[#735c41] outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="create-expires-on" className="block text-xs font-medium text-[#4e453d] uppercase tracking-wider mb-1">
                    Expires On
                  </label>
                  <input
                    id="create-expires-on"
                    type="date"
                    value={formData.expires_on}
                    onChange={(e) => setFormData({ ...formData, expires_on: e.target.value })}
                    className="w-full rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3 py-2 text-sm text-[#1b1c19] focus:border-[#735c41] focus:ring-1 focus:ring-[#735c41] outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e4e2dd] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#4e453d] bg-[#f0eee9] hover:bg-[#eae8e3] rounded-md transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-xs font-medium text-[#ffffff] bg-[#59452b] hover:bg-[#735c41] rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{createLoading ? 'Creating...' : 'Create Contract'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
