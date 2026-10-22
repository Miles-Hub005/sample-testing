'use client';

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  CreditCard,
  FileText,
  Clock,
  AlertCircle,
  Download,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Building2,
  User,
  KeyRound,
  BarChart3,
  Search,
  Filter,
} from 'lucide-react';
import { StatusLabel } from '../../components/common/StatusLabel';
import { apiClient, UserMeResponse } from '../../services/apiClient';

interface Invoice {
  id: string;
  period: string;
  amount: string;
  date: string;
  method: string;
  status: 'Paid' | 'Processing' | 'Pending';
}

export default function FinancialsPage() {
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Invoice filtering state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [downloadedInvoiceId, setDownloadedInvoiceId] = useState<string | null>(null);

  // Sample invoices for the active tenant
  const invoices: Invoice[] = [
    
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadUserData() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getMe();
        if (isMounted) {
          setUser(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load user financial session context.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownloadReceipt = (invoiceId: string) => {
    setDownloadedInvoiceId(invoiceId);
    setTimeout(() => {
      setDownloadedInvoiceId(null);
    }, 3000);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesQuery =
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.period.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.method.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-8" data-testid="financials-page">
      {/* Page Header */}
      <header className="border-b border-[#e4e2dd] pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#1b1c19] tracking-tight">
              Financials & Billing Management
            </h1>
            <p className="mt-2 text-base text-[#4e453d] max-w-2xl">
              Tenant billing summaries, invoice histories, subscription tier allocations, and usage-based financial metering.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusLabel status="online" label="Billing Systems Active" size="md" />
            <StatusLabel status="active" label="Tenant Isolated" size="md" />
          </div>
        </div>
      </header>

      {/* User Session & Tenant Context Banner */}
      <section
        aria-labelledby="financial-context-heading"
        className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-6 shadow-sm"
      >
        <h2 id="financial-context-heading" className="sr-only">
          Active Session Identity and Financial Context
        </h2>

        {loading ? (
          <div
            className="flex items-center justify-center py-6 text-[#4e453d]"
            aria-busy="true"
            aria-label="Loading financial session context"
          >
            <Clock className="w-5 h-5 animate-spin mr-2 text-[#735c41]" aria-hidden="true" />
            <span className="text-sm font-medium">Fetching active identity and tenant financial context...</span>
          </div>
        ) : error ? (
          <div
            className="flex items-start gap-3 p-4 bg-[#ffdad6] text-[#93000a] rounded-md border border-[#ba1a1a]"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm">Financial Context Alert</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        ) : user ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 bg-[#fbf9f4] p-3.5 rounded-md border border-[#e4e2dd]">
              <User className="w-5 h-5 text-[#735c41] flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-[#4e453d] font-medium uppercase tracking-wider">User Identity</p>
                <p className="text-sm font-semibold text-[#1b1c19] truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#fbf9f4] p-3.5 rounded-md border border-[#e4e2dd]">
              <Building2 className="w-5 h-5 text-[#735c41] flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-[#4e453d] font-medium uppercase tracking-wider">Tenant Scope</p>
                <p className="text-sm font-semibold text-[#1b1c19] truncate">{user.tenant_id}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#fbf9f4] p-3.5 rounded-md border border-[#e4e2dd]">
              <KeyRound className="w-5 h-5 text-[#735c41] flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-[#4e453d] font-medium uppercase tracking-wider">Assigned Roles</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((r) => (
                      <span
                        key={r}
                        className="inline-block bg-[#eae8e3] text-[#1b1c19] text-xs px-2 py-0.5 rounded font-mono font-medium"
                      >
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#4e453d]">No assigned roles</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#fbf9f4] p-3.5 rounded-md border border-[#e4e2dd]">
              <ShieldCheck className="w-5 h-5 text-[#735c41] flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-[#4e453d] font-medium uppercase tracking-wider">Account Status</p>
                <p className="text-sm font-semibold text-[#1b1c19]">Verified & Active</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Financial Overview Metrics Cards */}
      <section aria-labelledby="financial-overview-heading" className="space-y-4">
        <h2 id="financial-overview-heading" className="text-xl font-serif text-[#1b1c19]">
          Financial Overview & Billing Summary
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Subscription Tier */}
          <div className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4e453d] uppercase tracking-wider">
                Subscription Plan
              </span>
              <DollarSign className="w-5 h-5 text-[#735c41]" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-[#1b1c19]">$2,450.00 / mo</p>
            <p className="text-xs text-[#4e453d]">Enterprise Tier Allocation</p>
          </div>

          {/* Card 2: Billing Cycle */}
          <div className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4e453d] uppercase tracking-wider">
                Current Billing Cycle
              </span>
              <Clock className="w-5 h-5 text-[#735c41]" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-[#1b1c19]">Oct 01 – Oct 31</p>
            <p className="text-xs text-[#4e453d]">Renews in 25 Days</p>
          </div>

          {/* Card 3: Account Balance */}
          <div className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4e453d] uppercase tracking-wider">
                Outstanding Balance
              </span>
              <CreditCard className="w-5 h-5 text-[#735c41]" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-[#1b1c19]">$0.00</p>
            <p className="text-xs text-[#4e453d]">All Invoices Paid (Current)</p>
          </div>

          {/* Card 4: Metered API Units */}
          <div className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4e453d] uppercase tracking-wider">
                Metered API Quota
              </span>
              <BarChart3 className="w-5 h-5 text-[#735c41]" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-[#1b1c19]">124,850 / 500k</p>
            <p className="text-xs text-[#4e453d]">25% Monthly Quota Utilized</p>
          </div>
        </div>
      </section>

      {/* Invoice History & Payment Records Table */}
      <section aria-labelledby="invoices-heading" className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e4e2dd] pb-4">
          <div>
            <h2 id="invoices-heading" className="text-xl font-serif text-[#1b1c19]">
              Invoice History & Payment Records
            </h2>
            <p className="text-sm text-[#4e453d] mt-1">
              Historical billing statements and receipt downloads for tenant transactions.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#4e453d] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[#fbf9f4] border border-[#e4e2dd] rounded-md text-sm text-[#1b1c19] placeholder-[#80756b] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                aria-label="Search invoice history"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#4e453d]" aria-hidden="true" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 bg-[#fbf9f4] border border-[#e4e2dd] rounded-md text-sm text-[#1b1c19] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                aria-label="Filter invoices by status"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Processing">Processing</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {downloadedInvoiceId && (
          <div
            className="flex items-center gap-2 p-3 bg-[#eae8e3] text-[#1b1c19] rounded-md border border-[#735c41]"
            role="status"
          >
            <CheckCircle2 className="w-5 h-5 text-[#735c41] flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">
              Receipt for <strong>{downloadedInvoiceId}</strong> generated successfully.
            </span>
          </div>
        )}

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" aria-label="Tenant Invoice History">
            <thead>
              <tr className="border-b border-[#e4e2dd] text-xs font-semibold uppercase tracking-wider text-[#4e453d] bg-[#eae8e3]/50">
                <th scope="col" className="py-3 px-4">Invoice ID</th>
                <th scope="col" className="py-3 px-4">Billing Period</th>
                <th scope="col" className="py-3 px-4">Amount</th>
                <th scope="col" className="py-3 px-4">Payment Date</th>
                <th scope="col" className="py-3 px-4">Payment Method</th>
                <th scope="col" className="py-3 px-4">Status</th>
                <th scope="col" className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e2dd]">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[#fbf9f4] transition-colors text-sm text-[#1b1c19]">
                    <td className="py-3.5 px-4 font-mono font-medium">{invoice.id}</td>
                    <td className="py-3.5 px-4">{invoice.period}</td>
                    <td className="py-3.5 px-4 font-semibold">{invoice.amount}</td>
                    <td className="py-3.5 px-4 text-[#4e453d]">{invoice.date}</td>
                    <td className="py-3.5 px-4 text-[#4e453d]">{invoice.method}</td>
                    <td className="py-3.5 px-4">
                      <StatusLabel status="online" label={invoice.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadReceipt(invoice.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#fbf9f4] hover:bg-[#eae8e3] text-[#735c41] border border-[#e4e2dd] rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]"
                        aria-label={`Download receipt for invoice ${invoice.id}`}
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[#4e453d]">
                    No invoices matching the selected search query or status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Subscription Tier Allocation & Metered Quota */}
      <section aria-labelledby="tier-quota-heading" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-6 shadow-sm space-y-4">
          <h2 id="tier-quota-heading" className="text-xl font-serif text-[#1b1c19]">
            Metered API Quota & Usage Allocation
          </h2>
          <p className="text-sm text-[#4e453d]">
            Enterprise billing allocation tracks real-time API call volume and RBAC verification requests.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[#1b1c19]">Monthly API Request Consumption</span>
              <span className="font-mono text-[#735c41] font-medium">124,850 / 500,000 requests</span>
            </div>

            <div className="w-full bg-[#e4e2dd] h-3 rounded-full overflow-hidden" role="progressbar" aria-valuenow={25} aria-valuemin={0} aria-valuemax={100} aria-label="API Request Consumption Progress">
              <div className="bg-[#735c41] h-full rounded-full transition-all duration-500" style={{ width: '25%' }} />
            </div>

            <div className="flex items-center justify-between text-xs text-[#4e453d] pt-1">
              <span>25% Utilized</span>
              <span>375,150 Requests Remaining</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#e4e2dd] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#4e453d]">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#735c41] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>Overage Protection Enabled: Requests automatically scaled without downtime.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#735c41] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>Real-time Audit Correlation: Every API request linked to JSON audit records.</span>
            </div>
          </div>
        </div>

        {/* Enterprise Plan Included Features */}
        <div className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-serif text-[#1b1c19]">Enterprise Plan Features</h3>
          <ul className="space-y-3 text-sm text-[#4e453d]">
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#735c41]" aria-hidden="true" />
              <span>Strict Multi-Tenant Isolation</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#735c41]" aria-hidden="true" />
              <span>Sub-20ms RBAC Evaluation SLA</span>
            </li>
            <li className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#735c41]" aria-hidden="true" />
              <span>Fail-Safe Non-Blocking Audit Logging</span>
            </li>
            <li className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#735c41]" aria-hidden="true" />
              <span>24/7 Priority Support & Response SLA</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Tenant Financial Isolation & Security Policy */}
      <section aria-labelledby="financial-security-heading" className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-6 shadow-sm space-y-4">
        <h2 id="financial-security-heading" className="text-xl font-serif text-[#1b1c19]">
          Tenant Financial Security & Compliance Policy
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-[#fbf9f4] p-4 rounded-md border border-[#e4e2dd] space-y-2">
            <h3 className="text-sm font-semibold text-[#1b1c19]">Multi-Tenant Scoping</h3>
            <p className="text-xs text-[#4e453d]">
              Billing statements and payment methods are strictly isolated by tenant identifier. Cross-tenant financial inspection attempts are rejected with HTTP 403 Forbidden.
            </p>
          </div>

          <div className="bg-[#fbf9f4] p-4 rounded-md border border-[#e4e2dd] space-y-2">
            <h3 className="text-sm font-semibold text-[#1b1c19]">Zero Payment Data Exposure</h3>
            <p className="text-xs text-[#4e453d]">
              Payment credentials are managed via PCI-DSS compliant vaulting. No sensitive card numbers or bank credentials exist in standard logs or API response payloads.
            </p>
          </div>

          <div className="bg-[#fbf9f4] p-4 rounded-md border border-[#e4e2dd] space-y-2">
            <h3 className="text-sm font-semibold text-[#1b1c19]">Audit Log Event Correlation</h3>
            <p className="text-xs text-[#4e453d]">
              All financial actions, invoice views, and receipt downloads emit structured JSON audit events to stdout with correlation IDs for security compliance.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
