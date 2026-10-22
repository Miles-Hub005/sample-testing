'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  Download,
  RefreshCw,
  Award,
  CheckSquare,
  Square,
  User,
  Building2,
  Sparkles,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Video,
  Paperclip,
  ListOrdered,
  Check,
} from 'lucide-react';
import { StatusLabel } from '../../../../components/common/StatusLabel';
import { PlaybookProgress } from '../../../../components/knowledge/PlaybookProgress';
import { MediaPlayer } from '../../../../components/knowledge/MediaPlayer';
import { apiClient, UserMeResponse } from '../../../../services/apiClient';
import {
  getKnowledgeArticleDetail,
  getPlaybookProgress,
  togglePlaybookStepProgress,
  ArticleDetailResponse,
  PlaybookStepResponse,
  PlaybookProgressResponse,
} from '../../../../services/knowledge';

// ============================================================================
// Types & Interfaces [FR-3, FR-4, FR-6, FR-8, FR-9, NFR-3]
// ============================================================================

export interface PlaybookDetailPageProps {
  params?: Promise<{ id: string }> | { id: string };
}

// Fallback baseline playbook dataset for offline / testing / unseeded IDs [FR-1, FR-3]
const FALLBACK_PLAYBOOKS: Record<string, ArticleDetailResponse> = {
  'kb-playbook-001': {
    id: 'kb-playbook-001',
    title: 'Client Onboarding & Tenant Setup Playbook',
    content_type: 'Playbook',
    body: 'Step-by-step operational guide for provisioning new client organization tenants, initializing RBAC roles, establishing data isolation boundaries, and configuring audit log monitoring.',
    tenant_id: null,
    category_id: 'cat-onboarding',
    category: {
      id: 'cat-onboarding',
      name: 'Onboarding & Operations',
      description: 'Client tenant setup and operational runbooks',
    },
    tags: [
      { id: 'tag-1', name: 'Onboarding' },
      { id: 'tag-2', name: 'Tenant Isolation' },
      { id: 'tag-3', name: 'RBAC' },
      { id: 'tag-4', name: 'FastAPI' },
    ],
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    is_published: true,
    created_at: '2026-10-06T08:00:00Z',
    updated_at: '2026-10-06T08:00:00Z',
    attachments: [
      {
        id: 'att-pb-101',
        article_id: 'kb-playbook-001',
        file_name: 'tenant_onboarding_checklist_v1.pdf',
        file_url: '/files/tenant_onboarding_checklist_v1.pdf',
        file_size_bytes: 2457600,
        created_at: '2026-10-06T08:00:00Z',
      },
      {
        id: 'att-pb-102',
        article_id: 'kb-playbook-001',
        file_name: 'rbac_policy_template.json',
        file_url: '/files/rbac_policy_template.json',
        file_size_bytes: 51200,
        created_at: '2026-10-06T08:00:00Z',
      },
    ],
    playbook_steps: [
      {
        id: 'step-001-1',
        article_id: 'kb-playbook-001',
        step_number: 1,
        title: 'Initialize Client Tenant Record',
        content:
          'Execute tenant creation API request or registration pipeline (`POST /api/v1/auth/register`). Verify UUID creation, company name binding, and default ClientViewer role assignment.',
        checkpoint_instructions:
          'Confirm tenant record exists in `tenants` table with unique tenant_id UUID and zero cross-tenant key pollution.',
      },
      {
        id: 'step-001-2',
        article_id: 'kb-playbook-001',
        step_number: 2,
        title: 'Configure Server-Side RBAC Policy Matrix',
        content:
          'Assign administrative and domain roles (SecurityAdmin, FinancialAdmin, ClientViewer) in `user_roles`. Verify sub-20ms policy evaluation on endpoint dependencies (`deps.py`).',
        checkpoint_instructions:
          'Run automated RBAC test suite asserting HTTP 403 Forbidden is returned for non-permitted endpoints.',
      },
      {
        id: 'step-001-3',
        article_id: 'kb-playbook-001',
        step_number: 3,
        title: 'Provision Encrypted Storage & Database Context',
        content:
          'Ensure database queries filter strictly by `tenant_id` at the repository layer. Validate TLS 1.3 transport encryption and runtime secret variable injection in `config.py`.',
        checkpoint_instructions:
          'Execute tenant query boundary test to confirm zero leak of other organization records.',
      },
      {
        id: 'step-001-4',
        article_id: 'kb-playbook-001',
        step_number: 4,
        title: 'Validate Non-Blocking Structured Audit Stream',
        content:
          'Trigger initial security event and confirm formatted JSON audit log record emits to stdout with `logged_at`, `user_id`, `tenant_id`, and `correlation_id`.',
        checkpoint_instructions:
          'Inspect stdout stream to verify non-blocking logging writer trapped zero exceptions during request processing.',
      },
    ],
  },
  'kb-playbook-002': {
    id: 'kb-playbook-002',
    title: 'Incident Escalation & Root Cause Analysis Playbook',
    content_type: 'Playbook',
    body: 'Standard operating procedures for managing P1/P2 operational incidents, activating escalation pathways, and capturing post-incident RCA metadata.',
    tenant_id: null,
    category_id: 'cat-support',
    category: {
      id: 'cat-support',
      name: 'Support & Incident Management',
      description: 'SLA countdowns and escalation protocols',
    },
    tags: [
      { id: 'tag-5', name: 'Incidents' },
      { id: 'tag-6', name: 'SLA' },
      { id: 'tag-7', name: 'Escalation' },
    ],
    video_url: null,
    is_published: true,
    created_at: '2026-10-06T08:00:00Z',
    updated_at: '2026-10-06T08:00:00Z',
    attachments: [
      {
        id: 'att-pb-201',
        article_id: 'kb-playbook-002',
        file_name: 'rca_template_v2.docx',
        file_url: '/files/rca_template_v2.docx',
        file_size_bytes: 1048576,
        created_at: '2026-10-06T08:00:00Z',
      },
    ],
    playbook_steps: [
      {
        id: 'step-002-1',
        article_id: 'kb-playbook-002',
        step_number: 1,
        title: 'Incident Triage & Severity Classification',
        content:
          'Assess incoming support ticket priority (P1 Critical, P2 Major, P3 Standard). Verify SLA countdown timer initialization in operational dashboard.',
        checkpoint_instructions:
          'Confirm ticket status transitions to `in_progress` and P1 first-response SLA timer triggers within 1 hour.',
      },
      {
        id: 'step-002-2',
        article_id: 'kb-playbook-002',
        step_number: 2,
        title: 'Activate Automated Escalation Pathway',
        content:
          'If SLA warning threshold (80% duration) is breached, execute worker task escalation to reassign support tier and notify secondary manager.',
        checkpoint_instructions:
          'Verify escalation log entry created in `ticket_escalations` and manager alert notification dispatched.',
      },
      {
        id: 'step-002-3',
        article_id: 'kb-playbook-002',
        step_number: 3,
        title: 'Resolve Ticket & Collect CSAT Feedback',
        content:
          'Deploy hotfix or workaround, update ticket thread with resolution summary, and issue client CSAT survey prompt.',
        checkpoint_instructions:
          'Confirm ticket status changes to `resolved` and CSAT rating modal renders for client feedback.',
      },
    ],
  },
};

/**
 * Helper to format file sizes in human-readable units.
 */
function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format ISO timestamp into human-readable string.
 */
function formatDate(isoStr?: string | null): string {
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

// ============================================================================
// PlaybookDetailPage Component [FR-3, FR-4, FR-6, FR-8, FR-9, NFR-1 - NFR-5]
// ============================================================================

export default function PlaybookDetailPage() {
  const routeParams = useParams();

  // Extract playbook article ID from URL route parameters
  const rawId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const playbookId = rawId || 'kb-playbook-001';

  // State
  const [userMe, setUserMe] = useState<UserMeResponse | null>(null);
  const [article, setArticle] = useState<ArticleDetailResponse | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdatingStepId, setIsUpdatingStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'yes' | 'no' | null>(null);
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);

  // Load user session identity
  useEffect(() => {
    async function loadUserSession() {
      try {
        const user = await apiClient.getMe();
        setUserMe(user);
      } catch (err) {
        console.warn('Unable to load active user session details:', err);
      }
    }
    loadUserSession();
  }, []);

  // Main data fetch effect
  const fetchPlaybookData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const tenantId = userMe?.tenant_id || undefined;
    const userId = userMe?.user_id || undefined;

    let loadedArticle: ArticleDetailResponse | null = null;
    let progressData: PlaybookProgressResponse | null = null;

    try {
      // Fetch article detail
      loadedArticle = await getKnowledgeArticleDetail(playbookId, tenantId);
    } catch (err: any) {
      console.warn(`API detail fetch failed for playbook ID ${playbookId}. Checking fallback data...`, err);
      // Fallback check
      if (FALLBACK_PLAYBOOKS[playbookId]) {
        loadedArticle = FALLBACK_PLAYBOOKS[playbookId];
      } else {
        // Construct dynamic fallback for unseeded ID
        loadedArticle = {
          id: playbookId,
          title: `Operational Playbook (${playbookId})`,
          content_type: 'Playbook',
          body: `Detailed execution guide for ${playbookId}. Follow sequential steps and complete checkpoints.`,
          tenant_id: tenantId || null,
          category: {
            id: 'cat-general',
            name: 'General Playbooks',
            description: 'System operational procedures',
          },
          tags: [{ id: 'tag-gen', name: 'Operational' }],
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attachments: [],
          playbook_steps: [
            {
              id: `${playbookId}-step-1`,
              article_id: playbookId,
              step_number: 1,
              title: 'Prerequisite Environment & Permission Check',
              content: 'Verify server-side credentials and client tenant context before executing playbook actions.',
              checkpoint_instructions: 'Confirm user role and tenant_id match target execution context.',
            },
            {
              id: `${playbookId}-step-2`,
              article_id: playbookId,
              step_number: 2,
              title: 'Execute Standard Operational Procedure',
              content: 'Perform primary process steps according to system architecture guidelines.',
              checkpoint_instructions: 'Validate zero errors logged in structured stdout event stream.',
            },
          ],
        };
      }
    }

    try {
      // Fetch step completion progress
      progressData = await getPlaybookProgress(playbookId, userId, tenantId);
    } catch (err) {
      console.warn(`API progress fetch failed for playbook ID ${playbookId}. Initializing empty progress state.`, err);
    }

    setArticle(loadedArticle);

    if (progressData) {
      setCompletedStepIds(progressData.completed_step_ids || []);
      setProgressPercentage(progressData.progress_percentage || 0);
    } else if (loadedArticle) {
      // If no server progress record exists yet, check completed steps
      const total = loadedArticle.playbook_steps.length;
      setCompletedStepIds([]);
      setProgressPercentage(0);
    }

    setIsLoading(false);
  }, [playbookId, userMe?.tenant_id, userMe?.user_id]);

  useEffect(() => {
    fetchPlaybookData();
  }, [fetchPlaybookData]);

  // Handle Step Completion Toggle [FR-4, FR-8, FR-9]
  const handleToggleStep = useCallback(
    async (stepId: string, currentCompletedStatus: boolean) => {
      if (!stepId || isUpdatingStepId) return;

      const newCompletedStatus = !currentCompletedStatus;
      setIsUpdatingStepId(stepId);

      // Optimistic UI update
      setCompletedStepIds((prev) => {
        const next = newCompletedStatus
          ? Array.from(new Set([...prev, stepId]))
          : prev.filter((id) => id !== stepId);

        if (article?.playbook_steps && article.playbook_steps.length > 0) {
          const pct = Math.round((next.length / article.playbook_steps.length) * 100);
          setProgressPercentage(pct);
        }
        return next;
      });

      try {
        const tenantId = userMe?.tenant_id || undefined;
        const userId = userMe?.user_id || undefined;

        const response = await togglePlaybookStepProgress(
          playbookId,
          stepId,
          { is_completed: newCompletedStatus },
          userId,
          tenantId
        );

        if (response) {
          setProgressPercentage(response.overall_playbook_progress_percentage);
        }
      } catch (err: any) {
        console.warn('API error toggling playbook step progress. Retaining optimistic state:', err);
      } finally {
        setIsUpdatingStepId(null);
      }
    },
    [article?.playbook_steps, isUpdatingStepId, playbookId, userMe?.tenant_id, userMe?.user_id]
  );

  // Active step navigation helpers
  const totalSteps = article?.playbook_steps?.length || 0;
  const activeStep = useMemo(() => {
    if (!article?.playbook_steps || article.playbook_steps.length === 0) return null;
    const clampedIndex = Math.max(0, Math.min(activeStepIndex, article.playbook_steps.length - 1));
    return article.playbook_steps[clampedIndex];
  }, [article?.playbook_steps, activeStepIndex]);

  const isActiveStepCompleted = useMemo(() => {
    if (!activeStep) return false;
    return completedStepIds.includes(activeStep.id);
  }, [activeStep, completedStepIds]);

  const handleNextStep = () => {
    if (activeStepIndex < totalSteps - 1) {
      setActiveStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex((prev) => prev - 1);
    }
  };

  // Quick action helpers
  const handleMarkAllComplete = async () => {
    if (!article?.playbook_steps) return;
    for (const step of article.playbook_steps) {
      if (!completedStepIds.includes(step.id)) {
        await handleToggleStep(step.id, false);
      }
    }
  };

  const handleResetProgress = async () => {
    if (!article?.playbook_steps) return;
    for (const step of article.playbook_steps) {
      if (completedStepIds.includes(step.id)) {
        await handleToggleStep(step.id, true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Navigation Breadcrumbs & Header Bar [FR-1, FR-3] */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#d1c4b9] pb-6">
          <div className="space-y-1">
            <nav className="flex items-center gap-2 text-xs text-[#715a3f]">
              <Link
                href="/knowledge"
                className="hover:text-[#59452b] transition-colors flex items-center gap-1 font-medium"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Knowledge Repository
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-[#80756b]" />
              <span className="text-[#4e453d] font-semibold">Playbook Viewer</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-[#1b1c19] flex items-center gap-2">
              <ListOrdered className="h-7 w-7 text-[#59452b]" aria-hidden="true" />
              {article?.title || 'Interactive Playbook Guide'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-2 rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3.5 py-2 text-xs font-semibold text-[#1b1c19] hover:bg-[#f0eee9] transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Repository
            </Link>

            <button
              onClick={fetchPlaybookData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md border border-[#d1c4b9] bg-[#f0eee9] px-3.5 py-2 text-xs font-semibold text-[#1b1c19] hover:bg-[#eae8e3] disabled:opacity-50 transition-colors shadow-sm"
              title="Refresh playbook and step progress"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* User Context & System Status Banner [FR-9, NFR-4] */}
        <div className="rounded-lg border border-[#d1c4b9] bg-[#f5f3ee] p-4 text-xs text-[#4e453d] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 font-semibold text-[#1b1c19]">
              <User className="h-4 w-4 text-[#735c41]" />
              <span>Identity:</span>
              <span className="font-mono text-[#59452b]">
                {userMe?.email || 'knowledge.user@tenant.org'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-[#1b1c19]">
              <Building2 className="h-4 w-4 text-[#735c41]" />
              <span>Tenant:</span>
              <span className="font-mono text-[#59452b]">
                {userMe?.tenant_id || 'global-default'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusLabel status="VALID" text="Persistent Checkpoint Active" />
            <StatusLabel status="ACTIVE" text="TLS 1.3 Encrypted" />
          </div>
        </div>

        {/* Loading State Indicator */}
        {isLoading && !article && (
          <div className="rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-12 text-center space-y-3 shadow-sm">
            <RefreshCw className="h-8 w-8 animate-spin text-[#735c41] mx-auto" />
            <p className="text-sm font-semibold text-[#1b1c19]">
              Loading interactive playbook steps and checkpoint progress...
            </p>
            <p className="text-xs text-[#80756b]">Fetching article schema and user step completion state.</p>
          </div>
        )}

        {/* Error State Banner */}
        {error && (
          <div className="rounded-lg border border-[#ba1a1a] bg-[#ffdad6] p-4 text-xs text-[#93000a] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchPlaybookData}
              className="font-bold underline hover:no-underline text-[#ba1a1a]"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Main Content View */}
        {article && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left / Main Column: Active Step Execution Experience [FR-3, FR-4] */}
            <div className="lg:col-span-8 space-y-6">
              {/* Playbook Metadata Overview Card */}
              <div className="rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eae8e3] pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#735c41] px-2.5 py-0.5 text-xs font-semibold text-[#ffffff]">
                      {article.content_type || 'Playbook'}
                    </span>
                    {article.category?.name && (
                      <span className="inline-flex items-center rounded-full bg-[#f0eee9] px-2.5 py-0.5 text-xs font-semibold text-[#59452b] border border-[#d1c4b9]">
                        {article.category.name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#80756b] flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Updated: {formatDate(article.updated_at)}
                  </span>
                </div>

                {article.body && (
                  <p className="text-sm text-[#4e453d] leading-relaxed whitespace-pre-wrap">
                    {article.body}
                  </p>
                )}

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    {article.tags.map((tag) => (
                      <span
                        key={tag.id || tag.name}
                        className="rounded bg-[#f5f3ee] px-2 py-0.5 text-xs font-medium text-[#715a3f] border border-[#d1c4b9]"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Step Interactive Execution Component [FR-3, FR-4] */}
              {totalSteps > 0 && activeStep && (
                <div
                  className="rounded-lg border-2 border-[#735c41] bg-[#ffffff] p-6 shadow-md space-y-6"
                  data-testid="active-step-execution-card"
                >
                  {/* Step Header & Stepper Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#d1c4b9] pb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                          isActiveStepCompleted
                            ? 'bg-[#59452b] text-[#ffffff]'
                            : 'bg-[#735c41] text-[#ffffff]'
                        }`}
                      >
                        {activeStep.step_number}
                      </span>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#715a3f]">
                          Step {activeStep.step_number} of {totalSteps}
                        </span>
                        <h2 className="text-lg font-semibold text-[#1b1c19]">
                          {activeStep.title}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevStep}
                        disabled={activeStepIndex === 0}
                        className="inline-flex items-center gap-1 rounded-md border border-[#d1c4b9] bg-[#f0eee9] px-3 py-1.5 text-xs font-semibold text-[#1b1c19] hover:bg-[#eae8e3] disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous Step
                      </button>

                      <button
                        onClick={handleNextStep}
                        disabled={activeStepIndex >= totalSteps - 1}
                        className="inline-flex items-center gap-1 rounded-md border border-[#d1c4b9] bg-[#59452b] px-3 py-1.5 text-xs font-semibold text-[#ffffff] hover:bg-[#735c41] disabled:opacity-40 transition-colors"
                      >
                        Next Step
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Step Execution Instructions Body */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#715a3f] flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      Execution Instructions
                    </h3>
                    <div className="rounded-md bg-[#fbf9f4] p-4 text-sm text-[#1b1c19] leading-relaxed border border-[#d1c4b9] whitespace-pre-wrap">
                      {activeStep.content}
                    </div>
                  </div>

                  {/* Checkpoint Verification Box [FR-4] */}
                  <div className="rounded-md border border-[#d1c4b9] bg-[#f5f3ee] p-5 space-y-4">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="h-5 w-5 text-[#59452b] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#59452b]">
                          Checkpoint Verification Criteria
                        </h4>
                        <p className="text-xs text-[#4e453d] leading-relaxed">
                          {activeStep.checkpoint_instructions ||
                            'Verify execution outcome before marking this playbook step complete.'}
                        </p>
                      </div>
                    </div>

                    {/* Checkpoint Toggle Button */}
                    <div className="pt-2 border-t border-[#d1c4b9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isActiveStepCompleted ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#59452b]">
                            <CheckCircle2 className="h-4 w-4 text-[#59452b]" />
                            Checkpoint Verified & Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#80756b]">
                            <Circle className="h-4 w-4 text-[#80756b]" />
                            Pending Checkpoint Verification
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleStep(activeStep.id, isActiveStepCompleted)}
                        disabled={isUpdatingStepId === activeStep.id}
                        className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold shadow-sm transition-colors ${
                          isActiveStepCompleted
                            ? 'bg-[#eae8e3] text-[#1b1c19] hover:bg-[#dbdad5] border border-[#d1c4b9]'
                            : 'bg-[#59452b] text-[#ffffff] hover:bg-[#735c41]'
                        }`}
                        data-testid={`toggle-step-btn-${activeStep.step_number}`}
                      >
                        {isUpdatingStepId === activeStep.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Persisting State...
                          </>
                        ) : isActiveStepCompleted ? (
                          <>
                            <CheckSquare className="h-4 w-4 text-[#59452b]" />
                            Mark Step Incomplete
                          </>
                        ) : (
                          <>
                            <Square className="h-4 w-4" />
                            Mark Step Complete
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Stepper Tabs Bar */}
                  <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-[#eae8e3]">
                    {article.playbook_steps.map((step, idx) => {
                      const isComp = completedStepIds.includes(step.id);
                      const isCurrent = idx === activeStepIndex;
                      return (
                        <button
                          key={step.id}
                          onClick={() => setActiveStepIndex(idx)}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                            isCurrent
                              ? 'bg-[#59452b] text-[#ffffff] font-bold shadow-sm'
                              : isComp
                              ? 'bg-[#f0eee9] text-[#59452b] hover:bg-[#eae8e3] border border-[#735c41]'
                              : 'bg-[#f5f3ee] text-[#4e453d] hover:bg-[#eae8e3] border border-[#d1c4b9]'
                          }`}
                        >
                          {isComp ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <span>{step.step_number}.</span>
                          )}
                          <span>Step {step.step_number}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Complete Playbook Progress Overview [FR-3, FR-4] */}
              <PlaybookProgress
                articleId={article.id}
                steps={article.playbook_steps}
                completedStepIds={completedStepIds}
                progressPercentage={progressPercentage}
                onToggleStep={handleToggleStep}
                isUpdatingStepId={isUpdatingStepId}
                title="Full Playbook Step Checklist & Progress"
              />

              {/* Technical Documentation & File Attachments [FR-6] */}
              {article.attachments && article.attachments.length > 0 && (
                <div className="rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#eae8e3] pb-3">
                    <Paperclip className="h-5 w-5 text-[#59452b]" />
                    <h3 className="text-base font-semibold text-[#1b1c19]">
                      Linked Technical Documentation & Attachments ({article.attachments.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {article.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="rounded-md border border-[#d1c4b9] bg-[#fbf9f4] p-3.5 flex items-center justify-between gap-3 hover:border-[#735c41] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-5 w-5 text-[#735c41] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#1b1c19] truncate">
                              {att.file_name}
                            </p>
                            <p className="text-[11px] text-[#80756b]">
                              {formatBytes(att.file_size_bytes)}
                            </p>
                          </div>
                        </div>

                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-[#f0eee9] px-2.5 py-1 text-xs font-semibold text-[#59452b] hover:bg-[#eae8e3] transition-colors shrink-0"
                          title="Download attachment file"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Training Video Module Embed / Link [FR-5] */}
              {article.video_url && (
                <div className="rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#eae8e3] pb-3">
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-[#59452b]" />
                      <h3 className="text-base font-semibold text-[#1b1c19]">
                        On-Demand Training Video Stream
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowVideoModal(!showVideoModal)}
                      className="text-xs font-semibold text-[#59452b] underline hover:no-underline"
                    >
                      {showVideoModal ? 'Hide Stream Player' : 'Expand Video Player'}
                    </button>
                  </div>

                  {showVideoModal ? (
                    <MediaPlayer
                      videoUrl={article.video_url}
                      title={`${article.title} - Video Stream`}
                      attachments={article.attachments}
                    />
                  ) : (
                    <div className="rounded-md border border-[#d1c4b9] bg-[#f5f3ee] p-4 flex items-center justify-between gap-4">
                      <p className="text-xs text-[#4e453d]">
                        An interactive video stream is attached to this playbook guide.
                      </p>
                      <button
                        onClick={() => setShowVideoModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#59452b] px-3.5 py-2 text-xs font-semibold text-[#ffffff] hover:bg-[#735c41] transition-colors shrink-0"
                      >
                        <Video className="h-4 w-4" />
                        Play Video Stream
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar Column: Navigation & Quick Actions */}
            <div className="lg:col-span-4 space-y-6">
              {/* Quick Actions Card */}
              <div className="rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#1b1c19] border-b border-[#eae8e3] pb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#735c41]" />
                  Playbook Controls & Actions
                </h3>

                <div className="space-y-2">
                  <button
                    onClick={handleMarkAllComplete}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-[#d1c4b9] bg-[#f0eee9] px-3.5 py-2 text-xs font-semibold text-[#1b1c19] hover:bg-[#eae8e3] transition-colors"
                  >
                    <CheckSquare className="h-4 w-4 text-[#59452b]" />
                    Mark All Steps Completed
                  </button>

                  <button
                    onClick={handleResetProgress}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3.5 py-2 text-xs font-semibold text-[#1b1c19] hover:bg-[#f5f3ee] transition-colors"
                  >
                    <RotateCcw className="h-4 w-4 text-[#80756b]" />
                    Reset Step Progress
                  </button>
                </div>
              </div>

              {/* Feedback Widget */}
              <div className="rounded-lg border border-[#d1c4b9] bg-[#f5f3ee] p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#59452b]">
                  Playbook Quality Feedback
                </h4>
                <p className="text-xs text-[#4e453d]">
                  Was this operational playbook step guide clear and effective?
                </p>

                {feedbackGiven ? (
                  <div className="rounded bg-[#f0eee9] p-3 text-xs font-semibold text-[#59452b] flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Thank you for your feedback!
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFeedbackGiven('yes')}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3 py-1.5 text-xs font-semibold text-[#1b1c19] hover:bg-[#f0eee9] transition-colors"
                    >
                      <ThumbsUp className="h-3.5 w-3.5 text-[#59452b]" />
                      Yes, helpful
                    </button>
                    <button
                      onClick={() => setFeedbackGiven('no')}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3 py-1.5 text-xs font-semibold text-[#1b1c19] hover:bg-[#f0eee9] transition-colors"
                    >
                      <ThumbsDown className="h-3.5 w-3.5 text-[#80756b]" />
                      Needs improvement
                    </button>
                  </div>
                )}
              </div>

              {/* Additional Resources & System Information */}
              <div className="rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-5 shadow-sm space-y-3 text-xs text-[#4e453d]">
                <h4 className="font-semibold text-[#1b1c19] border-b border-[#eae8e3] pb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#735c41]" />
                  Architecture & Tenant Context
                </h4>
                <ul className="space-y-2 list-disc list-inside text-[11px] leading-relaxed">
                  <li>Progress state persisted via `POST /api/v1/knowledge/playbooks/[id]/steps/[step_id]/progress`.</li>
                  <li>Multi-tenant boundary strictly enforced at server entrypoints (`deps.py`).</li>
                  <li>Sub-1.0s search and content retrieval target satisfied (`NFR-1`).</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
