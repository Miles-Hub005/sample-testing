'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Star,
  RefreshCw,
  User,
  Building2,
  Tag,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Check,
  Award,
} from 'lucide-react';
import { StatusLabel } from '../../../components/common/StatusLabel';
import { SLACountdownTimer } from '../../../components/support/SLACountdownTimer';
import { TicketThread } from '../../../components/support/TicketThread';
import { CSATRatingModal } from '../../../components/support/CSATRatingModal';
import { apiClient, UserMeResponse } from '../../../services/apiClient';
import {
  supportService,
  Ticket,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  CSATRating,
  getSLATrackingRecord,
  TicketAttachment,
} from '../../../services/support';

export interface SupportDetailPageProps {
  params?: Promise<{ id: string }> | { id: string };
}

/**
 * Format ISO timestamp string into readable date and time.
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

// Fallback ticket templates for offline or demo rendering
const FALLBACK_TICKETS: Record<string, Ticket> = {
  'TKT-102938': {
    id: 'TKT-102938',
    priority: 'P1',
    status: 'open',
    subject: 'Production API Gateway 502 Bad Gateway Outage',
    description:
      'Intermittent 502 Bad Gateway responses detected on primary API gateway endpoint during peak traffic hours.',
    client_id: 'tnt_supp_888',
    assigned_tier: 'Tier 3 - Escalations',
    assigned_agent_id: 'agent_sys_99',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    sla_trackings: [
      {
        id: 'sla-1',
        ticket_id: 'TKT-102938',
        target_type: 'first_response',
        target_due_at: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
        is_breached: false,
      },
      {
        id: 'sla-2',
        ticket_id: 'TKT-102938',
        target_type: 'resolution',
        target_due_at: new Date(Date.now() + 215 * 60 * 1000).toISOString(),
        is_breached: false,
      },
    ],
  },
  'TKT-102939': {
    id: 'TKT-102939',
    priority: 'P2',
    status: 'pending',
    subject: 'RBAC Policy Sync Delay for New User Roles',
    description:
      'Role permission updates take up to 2 minutes to propagate across cached sessions.',
    client_id: 'tnt_supp_888',
    assigned_tier: 'Tier 2 - Technical',
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    first_responded_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    sla_trackings: [
      {
        id: 'sla-3',
        ticket_id: 'TKT-102939',
        target_type: 'first_response',
        target_due_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        is_breached: true,
      },
      {
        id: 'sla-4',
        ticket_id: 'TKT-102939',
        target_type: 'resolution',
        target_due_at: new Date(Date.now() + 1200 * 60 * 1000).toISOString(),
        is_breached: false,
      },
    ],
  },
  'TKT-102940': {
    id: 'TKT-102940',
    priority: 'P3',
    status: 'resolved',
    subject: 'Request for Custom Audit Log Export Format',
    description:
      'Inquiry regarding CSV export options for tenant audit stream records.',
    client_id: 'tnt_supp_888',
    assigned_tier: 'Tier 1 - General',
    created_at: new Date(Date.now() - 1440 * 60 * 1000).toISOString(),
    first_responded_at: new Date(Date.now() - 1300 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  },
};

export default function SupportTicketDetailPage(props?: SupportDetailPageProps) {
  const router = useRouter();
  const routeParams = useParams();

  // Dynamic ticket ID resolution
  let ticketId = '';
  if (routeParams && typeof routeParams.id === 'string') {
    ticketId = routeParams.id;
  } else if (routeParams && Array.isArray(routeParams.id)) {
    ticketId = routeParams.id[0];
  }

  // Component state
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [csatRating, setCsatRating] = useState<CSATRating | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCSATModal, setShowCSATModal] = useState<boolean>(false);

  // Load session user and ticket details
  const loadData = useCallback(async () => {
    if (!ticketId) return;

    setLoading(true);
    setError(null);

    // Load session user
    try {
      const userData = await apiClient.getMe();
      setUser(userData);
    } catch {
      // Fallback session
      setUser({
        user_id: 'usr_supp_123',
        email: 'support.user@tenant.org',
        tenant_id: 'tnt_supp_888',
        roles: ['ClientViewer', 'SupportAgent'],
      });
    }

    // Load ticket details
    let fetchedTicket: Ticket | null = null;
    try {
      fetchedTicket = await supportService.getTicket(ticketId);
      setTicket(fetchedTicket);
    } catch (err: any) {
      // Use fallback if available or construct fallback ticket
      if (FALLBACK_TICKETS[ticketId]) {
        fetchedTicket = FALLBACK_TICKETS[ticketId];
      } else {
        fetchedTicket = {
          id: ticketId,
          priority: 'P2',
          status: 'open',
          subject: `Support Ticket ${ticketId}`,
          description: 'Ticket details retrieved from local context.',
          client_id: 'tnt_supp_888',
          assigned_tier: 'Tier 2 - Technical',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          sla_trackings: [
            {
              id: `sla-fr-${ticketId}`,
              ticket_id: ticketId,
              target_type: 'first_response',
              target_due_at: new Date(Date.now() + 210 * 60 * 1000).toISOString(),
              is_breached: false,
            },
            {
              id: `sla-res-${ticketId}`,
              ticket_id: ticketId,
              target_type: 'resolution',
              target_due_at: new Date(Date.now() + 1200 * 60 * 1000).toISOString(),
              is_breached: false,
            },
          ],
        };
      }
      setTicket(fetchedTicket);
    }

    // Load thread messages
    try {
      const msgs = await supportService.getMessages(ticketId);
      setMessages(msgs);
    } catch {
      // Fallback messages
      setMessages([
        {
          id: `msg-1-${ticketId}`,
          ticket_id: ticketId,
          sender_id: fetchedTicket?.client_id || 'client_user',
          sender_type: 'client',
          message_body: fetchedTicket?.description || 'Ticket reported by client.',
          created_at: fetchedTicket?.created_at || new Date().toISOString(),
        },
      ]);
    }

    // Load CSAT rating if ticket is resolved/closed
    if (fetchedTicket?.status === 'resolved' || fetchedTicket?.status === 'closed') {
      try {
        const rating = await supportService.getCSAT(ticketId);
        setCsatRating(rating);
      } catch {
        // Not rated yet
        setCsatRating(null);
      }
    } else {
      setCsatRating(null);
    }

    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract SLA tracking records
  const firstResponseSLA = useMemo(
    () => getSLATrackingRecord(ticket?.sla_trackings, 'first_response'),
    [ticket?.sla_trackings]
  );

  const resolutionSLA = useMemo(
    () => getSLATrackingRecord(ticket?.sla_trackings, 'resolution'),
    [ticket?.sla_trackings]
  );

  // Status transition handler
  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!ticketId || !ticket) return;

    setUpdatingStatus(true);
    try {
      const updated = await supportService.updateTicket(ticketId, {
        status: newStatus,
      });
      setTicket(updated);

      // If status transitioned to resolved, trigger CSAT modal
      if (newStatus === 'resolved' && !csatRating) {
        setShowCSATModal(true);
      }
    } catch (err: any) {
      // Optimistic local update
      const updatedLocal: Ticket = {
        ...ticket,
        status: newStatus,
        resolved_at: newStatus === 'resolved' ? new Date().toISOString() : ticket.resolved_at,
      };
      setTicket(updatedLocal);
      if (newStatus === 'resolved' && !csatRating) {
        setShowCSATModal(true);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Send message in thread
  const handleSendMessage = async (messageBody: string, file?: File | null) => {
    if (!ticketId || !user) return;

    if (file) {
      await supportService.uploadAttachment(
        ticketId,
        file,
        user.user_id,
        'client',
        messageBody
      );
    } else {
      await supportService.createMessage(ticketId, {
        sender_id: user.user_id,
        sender_type: 'client',
        message_body: messageBody,
      });
    }

    // Reload messages
    try {
      const updatedMsgs = await supportService.getMessages(ticketId);
      setMessages(updatedMsgs);
    } catch {
      // Append locally
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-loc-${Date.now()}`,
          ticket_id: ticketId,
          sender_id: user.user_id,
          sender_type: 'client',
          message_body: messageBody,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  // Download attachment handler
  const handleDownloadAttachment = async (attachment: TicketAttachment) => {
    try {
      const blob = await supportService.downloadAttachment(attachment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert(`Downloading attachment: ${attachment.filename}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] px-4 py-8 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d1c4b9]/50 pb-5">
          <div className="flex items-center space-x-3">
            <Link
              href="/support"
              className="inline-flex items-center space-x-2 text-sm font-medium text-[#715a3f] hover:text-[#59452b] transition-colors bg-white px-3 py-1.5 rounded border border-[#d1c4b9]"
              aria-label="Back to Support Tickets"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Tickets</span>
            </Link>
            <span className="text-[#80756b]">•</span>
            <span className="text-xs font-mono font-semibold text-[#4e453d] bg-[#f0eee9] px-2.5 py-1 rounded">
              {ticketId}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 text-xs font-medium bg-white hover:bg-[#f0eee9] text-[#1b1c19] px-3 py-2 rounded border border-[#d1c4b9] shadow-sm transition-all"
              title="Refresh Ticket Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {ticket && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <button
                onClick={() => handleUpdateStatus('resolved')}
                disabled={updatingStatus}
                className="inline-flex items-center space-x-1.5 text-xs font-medium bg-[#59452b] hover:bg-[#735c41] text-white px-3.5 py-2 rounded shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark as Resolved</span>
              </button>
            )}

            {ticket && (ticket.status === 'resolved' || ticket.status === 'closed') && (
              <>
                <button
                  onClick={() => handleUpdateStatus('open')}
                  disabled={updatingStatus}
                  className="inline-flex items-center space-x-1.5 text-xs font-medium bg-white hover:bg-[#f0eee9] text-[#1b1c19] px-3 py-2 rounded border border-[#d1c4b9] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reopen Ticket</span>
                </button>
                <button
                  onClick={() => setShowCSATModal(true)}
                  className="inline-flex items-center space-x-1.5 text-xs font-medium bg-[#a43b2c] hover:bg-[#842417] text-white px-3.5 py-2 rounded shadow-sm transition-colors"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{csatRating ? 'View Rating' : 'Rate Support'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div
            className="flex items-center justify-center py-12 bg-white rounded-lg border border-[#d1c4b9]/50 shadow-sm"
            data-testid="loading-state"
          >
            <RefreshCw className="w-6 h-6 animate-spin text-[#715a3f] mr-3" />
            <span className="text-sm text-[#4e453d]">
              Loading ticket details, messages, and SLA metrics...
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            className="p-4 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-lg text-[#93000a] text-sm flex items-center space-x-3"
            data-testid="error-state"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#ba1a1a]" />
            <span>{error}</span>
          </div>
        )}

        {!loading && ticket && (
          <>
            {/* Header Subject & Status Card */}
            <div className="bg-white rounded-lg p-6 border border-[#d1c4b9]/60 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${
                        ticket.priority === 'P1'
                          ? 'bg-[#ba1a1a] text-white'
                          : ticket.priority === 'P2'
                          ? 'bg-[#fd7d69] text-[#71160b]'
                          : 'bg-[#e4e2dd] text-[#1b1c19]'
                      }`}
                    >
                      {ticket.priority}
                    </span>
                    <StatusLabel status={ticket.status || 'open'} />
                    {ticket.assigned_tier && (
                      <span className="inline-flex items-center space-x-1 text-xs text-[#4e453d] bg-[#f0eee9] px-2.5 py-0.5 rounded border border-[#d1c4b9]/50">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#715a3f]" />
                        <span>{ticket.assigned_tier}</span>
                      </span>
                    )}
                  </div>

                  <h1 className="text-xl md:text-2xl font-serif text-[#1b1c19] font-medium leading-snug">
                    {ticket.subject}
                  </h1>
                </div>

                {/* CSAT Score Badge if already submitted */}
                {csatRating && (
                  <div className="bg-[#f0eee9] p-3 rounded-lg border border-[#d1c4b9] flex items-center space-x-3 self-start">
                    <div className="flex items-center text-amber-600">
                      {[1, 2, 3, 4, 5].map((star) =>
                        star <= csatRating.score ? (
                          <Star key={star} className="w-4 h-4 fill-amber-500 text-amber-500" />
                        ) : (
                          <Star key={star} className="w-4 h-4 text-gray-300" />
                        )
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#1b1c19]">
                        CSAT Score: {csatRating.score}/5
                      </div>
                      {csatRating.feedback_text && (
                        <div className="text-xs text-[#4e453d] italic truncate max-w-[200px]">
                          "{csatRating.feedback_text}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SLA Real-Time Timers Bar [FR-4, NFR-1] */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4e453d] flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#715a3f]" />
                  <span>SLA Compliance Timers</span>
                </h2>
                <span className="text-[11px] text-[#80756b]">Sub-second accuracy tracking</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Response Timer */}
                <SLACountdownTimer
                  targetType="first_response"
                  targetDueAt={firstResponseSLA?.target_due_at}
                  priority={ticket.priority}
                  status={ticket.status}
                  isCompleted={!!ticket.first_responded_at}
                  completedAt={ticket.first_responded_at}
                  isBreached={firstResponseSLA?.is_breached}
                  warningSentAt={firstResponseSLA?.warning_sent_at}
                  variant="card"
                  size="md"
                />

                {/* Resolution Timer */}
                <SLACountdownTimer
                  targetType="resolution"
                  targetDueAt={resolutionSLA?.target_due_at}
                  priority={ticket.priority}
                  status={ticket.status}
                  isCompleted={ticket.status === 'resolved' || ticket.status === 'closed' || !!ticket.resolved_at}
                  completedAt={ticket.resolved_at}
                  isBreached={resolutionSLA?.is_breached}
                  warningSentAt={resolutionSLA?.warning_sent_at}
                  variant="card"
                  size="md"
                />
              </div>
            </div>

            {/* CSAT Prompt Banner if Resolved and not rated [FR-9] */}
            {(ticket.status === 'resolved' || ticket.status === 'closed') && !csatRating && (
              <div
                className="bg-[#f0eee9] border-2 border-[#59452b]/30 p-5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm"
                data-testid="csat-prompt-banner"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-[#59452b] text-white rounded-full">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1b1c19]">
                      How was your support experience?
                    </h3>
                    <p className="text-xs text-[#4e453d]">
                      Your feedback helps us continuously improve our service quality and resolution speeds.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowCSATModal(true)}
                  className="w-full md:w-auto inline-flex items-center justify-center space-x-2 bg-[#59452b] hover:bg-[#735c41] text-white px-5 py-2.5 rounded font-medium text-xs shadow transition-colors"
                >
                  <Star className="w-4 h-4 fill-current text-amber-300" />
                  <span>Rate Support Experience</span>
                </button>
              </div>
            )}

            {/* Main Content Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Description & Message Thread */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description Box */}
                <div className="bg-white rounded-lg p-5 border border-[#d1c4b9]/60 shadow-sm space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4e453d] flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#715a3f]" />
                    <span>Issue Description</span>
                  </h2>
                  <p className="text-sm text-[#1b1c19] whitespace-pre-wrap leading-relaxed">
                    {ticket.description}
                  </p>
                </div>

                {/* Ticket Message Thread Component [FR-2, FR-3] */}
                <TicketThread
                  ticketId={ticketId}
                  messages={messages}
                  loading={loading}
                  senderId={user?.user_id || 'current_user'}
                  senderType="client"
                  onSendMessage={handleSendMessage}
                  onDownloadAttachment={handleDownloadAttachment}
                  onRefresh={loadData}
                />
              </div>

              {/* Right Column: Ticket Metadata Sidebar */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-5 border border-[#d1c4b9]/60 shadow-sm space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4e453d] border-b border-[#d1c4b9]/40 pb-2">
                    Ticket Metadata
                  </h3>

                  <dl className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <dt className="text-[#4e453d]">Ticket ID</dt>
                      <dd className="font-mono font-semibold text-[#1b1c19]">{ticket.id}</dd>
                    </div>

                    <div className="flex justify-between items-center">
                      <dt className="text-[#4e453d]">Priority</dt>
                      <dd className="font-semibold text-[#1b1c19]">{ticket.priority}</dd>
                    </div>

                    <div className="flex justify-between items-center">
                      <dt className="text-[#4e453d]">Status</dt>
                      <dd>
                        <StatusLabel status={ticket.status || 'open'} />
                      </dd>
                    </div>

                    <div className="flex justify-between items-center">
                      <dt className="text-[#4e453d]">Client ID</dt>
                      <dd className="font-mono text-[#1b1c19]">{ticket.client_id}</dd>
                    </div>

                    <div className="flex justify-between items-center">
                      <dt className="text-[#4e453d]">Assigned Support Tier</dt>
                      <dd className="font-medium text-[#1b1c19]">
                        {ticket.assigned_tier || 'Unassigned'}
                      </dd>
                    </div>

                    <div className="flex justify-between items-center">
                      <dt className="text-[#4e453d]">Assigned Agent ID</dt>
                      <dd className="font-mono text-[#1b1c19]">
                        {ticket.assigned_agent_id || 'Unassigned'}
                      </dd>
                    </div>

                    <div className="border-t border-[#d1c4b9]/40 pt-3 flex justify-between items-center">
                      <dt className="text-[#4e453d]">Created At</dt>
                      <dd className="text-[#1b1c19]">{formatTimestamp(ticket.created_at)}</dd>
                    </div>

                    <div className="flex justify-between items-center">
                      <dt className="text-[#4e453d]">First Responded At</dt>
                      <dd className="text-[#1b1c19]">
                        {formatTimestamp(ticket.first_responded_at)}
                      </dd>
                    </div>

                    <div className="flex justify-between items-center">
                      <dt className="text-[#4e453d]">Resolved At</dt>
                      <dd className="text-[#1b1c19]">{formatTimestamp(ticket.resolved_at)}</dd>
                    </div>
                  </dl>
                </div>

                {/* Escalation Policy Summary Card */}
                <div className="bg-[#f0eee9] rounded-lg p-4 border border-[#d1c4b9]/60 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#59452b]">
                    <ShieldCheck className="w-4 h-4 text-[#715a3f]" />
                    <span>SLA & Escalation Policy</span>
                  </div>
                  <p className="text-[11px] text-[#4e453d] leading-relaxed">
                    Automatic escalation pathways trigger when 80% of resolution SLA time elapses.
                    Priority P1 issues route directly to Tier 3 Escalations.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* CSAT Rating Modal Dialog [FR-9] */}
        {ticket && (
          <CSATRatingModal
            ticketId={ticket.id}
            ticketSubject={ticket.subject}
            isOpen={showCSATModal}
            existingRating={csatRating}
            onClose={() => setShowCSATModal(false)}
            onSubmitSuccess={(newRating) => {
              setCsatRating(newRating);
              setShowCSATModal(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
}
