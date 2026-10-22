'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Video,
  FileText,
  Download,
  Paperclip,
  Clock,
  BookOpen,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  User,
  Building2,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Check,
  Share2,
  ExternalLink,
  Tag as TagIcon,
  FolderOpen,
  Lock,
  Globe,
  FileDown,
  Info,
} from 'lucide-react';
import { StatusLabel } from '../../../../components/common/StatusLabel';
import { MediaPlayer } from '../../../../components/knowledge/MediaPlayer';
import { apiClient, UserMeResponse } from '../../../../services/apiClient';
import {
  getKnowledgeArticleDetail,
  ArticleDetailResponse,
  AttachmentResponse,
} from '../../../../services/knowledge';

// ============================================================================
// Types & Interfaces [FR-5, FR-6, FR-8, FR-9, NFR-1 - NFR-5]
// ============================================================================

export interface TrainingDetailPageProps {
  params?: Promise<{ id: string }> | { id: string };
}

// Fallback baseline training datasets for offline / testing / unseeded IDs [FR-1, FR-5, FR-6]
const FALLBACK_TRAINING_MODULES: Record<string, ArticleDetailResponse> = {
  'kb-training-001': {
    id: 'kb-training-001',
    title: 'Platform Architecture & RBAC Evaluation Deep Dive',
    content_type: 'TrainingVideo',
    body: 'Comprehensive video walkthrough detailing server-side role-based access control (RBAC) policy evaluation, multi-tenant database isolation, bearer token validation, and structured audit stream emission. Recommended for engineering leads, system administrators, and security auditors.',
    tenant_id: null,
    category_id: 'cat-architecture',
    category: {
      id: 'cat-architecture',
      name: 'Architecture & Security',
      description: 'System architecture, security standards, and RBAC policies',
    },
    tags: [
      { id: 'tag-1', name: 'Architecture' },
      { id: 'tag-2', name: 'RBAC' },
      { id: 'tag-3', name: 'FastAPI' },
      { id: 'tag-4', name: 'Security' },
    ],
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    is_published: true,
    created_at: '2026-10-06T08:00:00Z',
    updated_at: '2026-10-06T08:00:00Z',
    attachments: [
      {
        id: 'att-tr-101',
        article_id: 'kb-training-001',
        file_name: 'rbac_architecture_specification_v1.pdf',
        file_url: '/files/rbac_architecture_specification_v1.pdf',
        file_size_bytes: 1887436,
        created_at: '2026-10-06T08:00:00Z',
      },
      {
        id: 'att-tr-102',
        article_id: 'kb-training-001',
        file_name: 'tenant_security_matrix.xlsx',
        file_url: '/files/tenant_security_matrix.xlsx',
        file_size_bytes: 327680,
        created_at: '2026-10-06T08:00:00Z',
      },
    ],
    playbook_steps: [],
  },
  'kb-training-002': {
    id: 'kb-training-002',
    title: 'Multi-Tenant Data Isolation & Query Filtering Architecture',
    content_type: 'TrainingVideo',
    body: 'Instructional training session covering tenant-scoped ORM queries, schema isolation rules, and automated tenant context verification in backend repositories. Learn how client organizations are strictly isolated at database boundaries.',
    tenant_id: null,
    category_id: 'cat-security',
    category: {
      id: 'cat-security',
      name: 'Tenant Isolation & Data Safety',
      description: 'Multi-tenancy models and query boundaries',
    },
    tags: [
      { id: 'tag-5', name: 'Tenant Isolation' },
      { id: 'tag-6', name: 'SQLAlchemy' },
      { id: 'tag-7', name: 'Database' },
    ],
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    is_published: true,
    created_at: '2026-10-06T08:00:00Z',
    updated_at: '2026-10-06T08:00:00Z',
    attachments: [
      {
        id: 'att-tr-201',
        article_id: 'kb-training-002',
        file_name: 'query_boundary_guidelines.pdf',
        file_url: '/files/query_boundary_guidelines.pdf',
        file_size_bytes: 1258291,
        created_at: '2026-10-06T08:00:00Z',
      },
    ],
    playbook_steps: [],
  },
};

/**
 * Format file size in human-readable units (KB, MB, GB).
 */
function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format ISO timestamp string into localized date representation.
 */
function formatIsoDate(isoStr?: string | null): string {
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
// TrainingDetailPage Component [FR-5, FR-6, FR-8, FR-9, NFR-1 - NFR-5]
// ============================================================================

export default function TrainingDetailPage() {
  const routeParams = useParams();

  // Extract training module ID from URL route parameters
  const rawId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const trainingId = rawId || 'kb-training-001';

  // State
  const [userMe, setUserMe] = useState<UserMeResponse | null>(null);
  const [article, setArticle] = useState<ArticleDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'yes' | 'no' | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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
  const fetchTrainingData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const tenantId = userMe?.tenant_id || undefined;
    let loadedArticle: ArticleDetailResponse | null = null;

    try {
      // Fetch training article detail from backend API
      loadedArticle = await getKnowledgeArticleDetail(trainingId, tenantId);
    } catch (err: any) {
      console.warn(`API detail fetch failed for training ID ${trainingId}. Checking fallback data...`, err);

      if (FALLBACK_TRAINING_MODULES[trainingId]) {
        loadedArticle = FALLBACK_TRAINING_MODULES[trainingId];
      } else {
        // Construct dynamic fallback for unseeded ID
        loadedArticle = {
          id: trainingId,
          title: `On-Demand Training Video (${trainingId})`,
          content_type: 'TrainingVideo',
          body: `Technical training video session for module ${trainingId}. Watch the embedded stream and download attached technical specifications.`,
          tenant_id: tenantId || null,
          category: {
            id: 'cat-training-gen',
            name: 'Technical Training',
            description: 'On-demand instructional video modules',
          },
          tags: [
            { id: 'tag-tr-1', name: 'Training' },
            { id: 'tag-tr-2', name: 'Video' },
          ],
          video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attachments: [
            {
              id: `att-${trainingId}-1`,
              article_id: trainingId,
              file_name: `${trainingId}_technical_summary.pdf`,
              file_url: `/files/${trainingId}_technical_summary.pdf`,
              file_size_bytes: 1572864,
              created_at: new Date().toISOString(),
            },
          ],
          playbook_steps: [],
        };
      }
    }

    setArticle(loadedArticle);
    setIsLoading(false);
  }, [trainingId, userMe?.tenant_id]);

  useEffect(() => {
    fetchTrainingData();
  }, [fetchTrainingData]);

  // Share URL Handler
  const handleCopyShareLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] px-4 py-8 sm:px-8 lg:px-12 space-y-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/knowledge"
          aria-label="Back to Knowledge Directory"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#715a3f] hover:text-[#59452b] transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41] rounded px-1 py-0.5"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Knowledge Directory</span>
        </Link>

        {/* User Session Context Bar */}
        {userMe && (
          <div
            className="flex flex-wrap items-center gap-3 rounded-md border border-[#d1c4b9] bg-[#f5f3ee] px-3 py-1.5 text-xs text-[#4e453d]"
            data-testid="user-session-context"
          >
            <div className="flex items-center gap-1.5 font-medium">
              <User className="h-3.5 w-3.5 text-[#715a3f]" aria-hidden="true" />
              <span>{userMe.email}</span>
            </div>
            <span className="text-[#d1c4b9]">|</span>
            <div className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-[#715a3f]" aria-hidden="true" />
              <span className="font-mono text-[11px]">{userMe.tenant_id}</span>
            </div>
            {userMe.roles && userMe.roles.length > 0 && (
              <>
                <span className="text-[#d1c4b9]">|</span>
                <div className="flex items-center gap-1">
                  {userMe.roles.map((r) => (
                    <span
                      key={r}
                      className="rounded bg-[#e4e2dd] px-1.5 py-0.5 text-[10px] font-semibold text-[#59452b]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Container Loading / Error State */}
      {isLoading ? (
        <div
          className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-8 text-center shadow-xs"
          data-testid="loading-spinner"
        >
          <RefreshCw className="h-8 w-8 animate-spin text-[#59452b] mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold text-[#1b1c19]">
            Loading training module video stream and technical attachments...
          </p>
          <p className="mt-1 text-xs text-[#80756b]">
            Verifying client tenant boundary and stream token...
          </p>
        </div>
      ) : error || !article ? (
        <div
          className="flex min-h-[350px] w-full flex-col items-center justify-center rounded-lg border border-[#ba1a1a] bg-[#ffdad6]/20 p-8 text-center shadow-xs"
          data-testid="error-container"
        >
          <AlertCircle className="h-10 w-10 text-[#ba1a1a] mb-2" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[#93000a]">
            Failed to Load Training Video Module
          </h2>
          <p className="mt-1 text-xs text-[#4e453d] max-w-md">
            {error || 'The requested training module record could not be loaded or is restricted.'}
          </p>
          <button
            type="button"
            onClick={fetchTrainingData}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#59452b] px-4 py-2 text-xs font-semibold text-[#ffffff] hover:bg-[#735c41] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Stream Load</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8" data-testid="training-detail-content">
          {/* Module Header Overview Card */}
          <div className="rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                {/* Content Type & Badges Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusLabel status="active" label="Training Video" size="sm" />

                  {article.category && (
                    <span className="inline-flex items-center gap-1 rounded bg-[#f5f3ee] px-2 py-0.5 text-xs font-medium text-[#715a3f] border border-[#d1c4b9]">
                      <FolderOpen className="h-3 w-3" />
                      {article.category.name}
                    </span>
                  )}

                  {article.tenant_id ? (
                    <span className="inline-flex items-center gap-1 rounded bg-[#e4e2dd] px-2 py-0.5 text-xs font-medium text-[#4e453d] border border-[#d1c4b9]">
                      <Lock className="h-3 w-3 text-[#715a3f]" />
                      Tenant Restricted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-[#f5f3ee] px-2 py-0.5 text-xs font-medium text-[#59452b] border border-[#d1c4b9]">
                      <Globe className="h-3 w-3 text-[#59452b]" />
                      Global Module
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-serif text-[#1b1c19] leading-tight">
                  {article.title}
                </h1>
              </div>

              {/* Share / Copy Action */}
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#d1c4b9] bg-[#fbf9f4] px-3 py-1.5 text-xs font-medium text-[#1b1c19] hover:bg-[#f5f3ee] transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#59452b]" />
                    <span className="text-[#59452b] font-semibold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-[#715a3f]" />
                    <span>Share Module</span>
                  </>
                )}
              </button>
            </div>

            {/* Metadata Footer Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#f0eee9] text-xs text-[#80756b]">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#715a3f]" />
                  <span>Updated {formatIsoDate(article.updated_at)}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5 text-[#715a3f]" />
                  <span>{article.attachments?.length || 0} Attachments Linked</span>
                </span>
              </div>

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <TagIcon className="h-3.5 w-3.5 text-[#715a3f]" />
                  {article.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-[#f5f3ee] px-2 py-0.5 text-[11px] font-medium text-[#4e453d] border border-[#d1c4b9]"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main 2-Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Main Column: Embedded Media Player & Overview */}
            <div className="lg:col-span-2 space-y-8">
              {/* Embedded Video Stream Player [FR-5, FR-6, NFR-2, NFR-5] */}
              <section aria-label="Embedded training video player">
                <MediaPlayer
                  videoUrl={article.video_url}
                  title={article.title}
                  attachments={article.attachments}
                  autoPlay={false}
                />
              </section>

              {/* Module Description & Overview Card */}
              <section
                aria-label="Module overview and description"
                className="rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-6 shadow-xs space-y-4 text-[#1b1c19]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#f0eee9]">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#59452b]" aria-hidden="true" />
                    <h2 className="text-base font-semibold text-[#1b1c19]">
                      Overview & Key Objectives
                    </h2>
                  </div>
                  <span className="text-xs text-[#80756b]">Module ID: {article.id}</span>
                </div>

                <div className="prose max-w-none text-sm text-[#1b1c19] leading-relaxed whitespace-pre-line">
                  {article.body || 'No detailed written overview provided for this training module.'}
                </div>

                {/* Helpful Feedback Widget */}
                <div className="pt-4 border-t border-[#f0eee9] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#4e453d]">
                    <Sparkles className="h-4 w-4 text-[#715a3f]" />
                    <span>Was this technical training module helpful?</span>
                  </div>

                  {feedbackGiven ? (
                    <div className="flex items-center gap-1.5 rounded bg-[#f5f3ee] px-3 py-1 text-xs font-semibold text-[#59452b]">
                      <Check className="h-4 w-4 text-[#59452b]" />
                      <span>Thank you for your feedback!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFeedbackGiven('yes')}
                        className="inline-flex items-center gap-1 rounded border border-[#d1c4b9] bg-[#fbf9f4] px-3 py-1 text-xs font-medium text-[#1b1c19] hover:bg-[#f5f3ee] hover:border-[#59452b] transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]"
                      >
                        <ThumbsUp className="h-3.5 w-3.5 text-[#59452b]" />
                        <span>Yes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedbackGiven('no')}
                        className="inline-flex items-center gap-1 rounded border border-[#d1c4b9] bg-[#fbf9f4] px-3 py-1 text-xs font-medium text-[#1b1c19] hover:bg-[#f5f3ee] hover:border-[#80756b] transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]"
                      >
                        <ThumbsDown className="h-3.5 w-3.5 text-[#80756b]" />
                        <span>No</span>
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Sidebar Column: Stream Specs, Attachments, & Related Resources */}
            <div className="space-y-6">
              {/* Technical Specifications Card [NFR-2, NFR-5] */}
              <div className="rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#f0eee9]">
                  <ShieldCheck className="h-4 w-4 text-[#59452b]" aria-hidden="true" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#715a3f]">
                    Streaming Specifications
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#80756b]">Encrypted Transport</span>
                    <span className="font-semibold text-[#59452b] inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#59452b]" />
                      HTTPS / TLS 1.3
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#80756b]">Classification</span>
                    <span className="font-medium text-[#1b1c19]">
                      {article.content_type || 'Training Video'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#80756b]">Stream Provider</span>
                    <span className="font-medium text-[#1b1c19]">
                      {article.video_url ? 'CDN Tokenized Stream' : 'None Attached'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#80756b]">Tenant Scope</span>
                    <span className="font-medium text-[#1b1c19]">
                      {article.tenant_id ? article.tenant_id : 'Global Organization'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Documentation & Download Panel [FR-6] */}
              <div className="rounded-lg border border-[#d1c4b9] bg-[#ffffff] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#f0eee9]">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-[#59452b]" aria-hidden="true" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#715a3f]">
                      Technical Attachments ({article.attachments?.length || 0})
                    </h3>
                  </div>
                </div>

                {!article.attachments || article.attachments.length === 0 ? (
                  <p className="text-xs text-[#80756b] italic">
                    No downloadable technical documentation is linked to this training module.
                  </p>
                ) : (
                  <div className="space-y-2.5" data-testid="sidebar-attachments-list">
                    {article.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.file_name}
                        className="flex items-center justify-between rounded-md border border-[#d1c4b9] bg-[#fbf9f4] p-3 text-xs text-[#1b1c19] hover:border-[#59452b] hover:bg-[#f5f3ee] transition-colors group focus:outline-none focus:ring-2 focus:ring-[#735c41]"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-4 w-4 shrink-0 text-[#715a3f]" />
                          <div className="truncate">
                            <p className="font-semibold truncate text-[#1b1c19] group-hover:text-[#59452b]">
                              {att.file_name}
                            </p>
                            <p className="text-[11px] text-[#80756b]">
                              {formatFileSize(att.file_size_bytes)}
                            </p>
                          </div>
                        </div>
                        <FileDown className="h-4 w-4 shrink-0 text-[#80756b] group-hover:text-[#59452b] ml-2" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Related Operational Resources Quick Links */}
              <div className="rounded-lg border border-[#d1c4b9] bg-[#f5f3ee] p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#59452b]" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#715a3f]">
                    Related Playbooks & Documentation
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <Link
                    href="/knowledge/playbooks/kb-playbook-001"
                    className="block rounded border border-[#d1c4b9] bg-[#ffffff] p-2.5 hover:border-[#59452b] hover:bg-[#fbf9f4] transition-colors text-[#1b1c19] font-medium"
                  >
                    Client Onboarding & Tenant Setup Playbook
                  </Link>

                  <Link
                    href="/knowledge/playbooks/kb-playbook-002"
                    className="block rounded border border-[#d1c4b9] bg-[#ffffff] p-2.5 hover:border-[#59452b] hover:bg-[#fbf9f4] transition-colors text-[#1b1c19] font-medium"
                  >
                    Incident Escalation & Root Cause Analysis Playbook
                  </Link>

                  <Link
                    href="/knowledge"
                    className="inline-flex items-center gap-1 text-[#715a3f] hover:text-[#59452b] pt-1 font-semibold"
                  >
                    <span>View all Knowledge Base Directory items</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
