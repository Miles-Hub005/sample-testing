'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  SenderType,
  TicketAttachment,
  TicketMessage,
  supportService,
  validateAttachmentFile,
} from '../../services/support';

// ============================================================================
// Types & Interfaces [FR-2, FR-3, NFR-2, NFR-4]
// ============================================================================

export interface TicketThreadProps {
  /**
   * Support ticket identifier. Required.
   */
  ticketId: string;

  /**
   * Sequential messages array. If supplied, the component renders this controlled list.
   * If omitted, messages are fetched automatically via `supportService.getMessages(ticketId)`.
   */
  messages?: TicketMessage[];

  /**
   * Optional loading indicator override flag.
   */
  loading?: boolean;

  /**
   * Optional external error message override.
   */
  error?: string | null;

  /**
   * Sender ID for new reply messages posted from this component.
   * Defaults to 'current_user'.
   */
  senderId?: string;

  /**
   * Sender type for new reply messages posted from this component ('client' | 'agent' | 'system').
   * Defaults to 'client'.
   */
  senderType?: SenderType;

  /**
   * Optional callback invoked when a user posts a message or attachment reply.
   */
  onSendMessage?: (messageBody: string, file?: File | null) => Promise<void> | void;

  /**
   * Custom download handler for file attachments.
   */
  onDownloadAttachment?: (attachment: TicketAttachment) => void;

  /**
   * Callback invoked when user clicks the manual refresh button.
   */
  onRefresh?: () => void;

  /**
   * Read-only mode flag. When true, hides or disables the reply form composer.
   */
  readOnly?: boolean;

  /**
   * Additional container CSS classes.
   */
  className?: string;

  /**
   * Custom data-testid attribute for unit testing.
   */
  'data-testid'?: string;
}

// ============================================================================
// Helper Functions
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
 * Format date string into readable timestamp.
 */
export function formatTimestamp(dateStr?: string | null): string {
  if (!dateStr) {
    return 'Just now';
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns sender badge display attributes based on sender_type.
 */
export function getSenderBadgeInfo(senderType?: SenderType) {
  const normalized = (senderType || 'client').toLowerCase().trim();

  switch (normalized) {
    case 'agent':
      return {
        label: 'Support Agent',
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        badgeClass: 'bg-tertiary/15 text-tertiary border-tertiary/30',
        cardClass: 'bg-surface-container-low border-tertiary/20',
      };
    case 'system':
      return {
        label: 'System Notification',
        icon: <Bot className="w-3.5 h-3.5" />,
        badgeClass: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/40',
        cardClass: 'bg-surface-container-high/40 border-outline-variant/30',
      };
    case 'client':
    default:
      return {
        label: 'Client',
        icon: <User className="w-3.5 h-3.5" />,
        badgeClass: 'bg-primary-container/20 text-primary border-primary-container/40',
        cardClass: 'bg-surface-container-lowest border-outline-variant/40',
      };
  }
}

/**
 * Return appropriate Lucide icon component based on file MIME type or filename extension.
 */
export function getAttachmentIcon(mimeType?: string, filename?: string) {
  const mime = (mimeType || '').toLowerCase();
  const name = (filename || '').toLowerCase();

  if (mime.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    return <ImageIcon className="w-4 h-4 text-primary shrink-0" />;
  }
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('text') ||
    name.match(/\.(pdf|txt|doc|docx)$/)
  ) {
    return <FileText className="w-4 h-4 text-tertiary shrink-0" />;
  }
  return <File className="w-4 h-4 text-on-surface-variant shrink-0" />;
}

// ============================================================================
// Sequential Ticket Thread Component [FR-2, FR-3, NFR-2, NFR-4]
// ============================================================================

export function TicketThread({
  ticketId,
  messages: controlledMessages,
  loading: controlledLoading,
  error: controlledError,
  senderId = 'current_user',
  senderType = 'client',
  onSendMessage,
  onDownloadAttachment,
  onRefresh,
  readOnly = false,
  className,
  'data-testid': testId = 'ticket-thread-component',
}: TicketThreadProps) {
  // Internal thread state for uncontrolled usage
  const [internalMessages, setInternalMessages] = useState<TicketMessage[]>(controlledMessages || []);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(
    controlledLoading !== undefined ? controlledLoading : !controlledMessages
  );
  const [historyError, setHistoryError] = useState<string | null>(controlledError || null);

  // Reply Composer Form State
  const [replyText, setReplyText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize state when controlled props change
  useEffect(() => {
    if (controlledMessages !== undefined) {
      setInternalMessages(controlledMessages);
    }
  }, [controlledMessages]);

  useEffect(() => {
    if (controlledLoading !== undefined) {
      setIsLoadingHistory(controlledLoading);
    }
  }, [controlledLoading]);

  useEffect(() => {
    if (controlledError !== undefined) {
      setHistoryError(controlledError);
    }
  }, [controlledError]);

  // Fetch chronological message history when ticketId changes or uncontrolled
  const fetchMessageHistory = useCallback(async () => {
    if (!ticketId || controlledMessages !== undefined) {
      return;
    }
    try {
      setIsLoadingHistory(true);
      setHistoryError(null);
      const data = await supportService.getMessages(ticketId);
      setInternalMessages(data || []);
    } catch (err: any) {
      setHistoryError(err?.message || 'Failed to load message history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [ticketId, controlledMessages]);

  useEffect(() => {
    fetchMessageHistory();
  }, [fetchMessageHistory]);

  // Manual Refresh Handler
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
    if (controlledMessages === undefined) {
      fetchMessageHistory();
    }
  };

  // File Attachment Selection Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileValidationError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation = validateAttachmentFile(file);
    if (!validation.valid) {
      setFileValidationError(validation.error || 'Invalid file attachment.');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
  };

  // Remove Selected Attachment File
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle File Attachment Download
  const handleDownloadAttachment = async (attachment: TicketAttachment) => {
    if (!attachment) {
      return;
    }
    if (onDownloadAttachment) {
      onDownloadAttachment(attachment);
      return;
    }

    try {
      setDownloadingId(attachment.id);
      setPostError(null);
      const blob = await supportService.downloadAttachment(attachment.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setPostError(err?.message || `Failed to download file '${attachment.filename}'.`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle Post Reply Submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);

    if (fileValidationError) {
      return;
    }

    const trimmedBody = replyText.trim();
    if (!trimmedBody && !selectedFile) {
      setPostError('Please enter a message or attach a file.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (onSendMessage) {
        await onSendMessage(trimmedBody, selectedFile);
      } else {
        if (selectedFile) {
          await supportService.uploadAttachment(
            ticketId,
            selectedFile,
            senderId,
            senderType,
            trimmedBody
          );
        } else {
          await supportService.createMessage(ticketId, {
            sender_id: senderId,
            sender_type: senderType,
            message_body: trimmedBody,
          });
        }

        if (controlledMessages === undefined) {
          await fetchMessageHistory();
        }
      }

      // Reset form on success
      setReplyText('');
      handleRemoveFile();
    } catch (err: any) {
      setPostError(err?.message || 'Failed to post message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasError = !!(historyError || postError);

  return (
    <section
      data-testid={testId}
      className={cn(
        'flex flex-col space-y-4 font-sans bg-surface p-4 sm:p-6 rounded-lg border border-outline-variant/50 shadow-sm',
        className
      )}
      aria-label="Ticket Message Thread"
    >
      {/* Thread Header */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
        <div className="flex items-center space-x-2.5">
          <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-serif font-medium text-on-surface">
            Message Thread
          </h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/40">
            {internalMessages.length} {internalMessages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoadingHistory}
          className="inline-flex items-center space-x-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded hover:bg-surface-container-high disabled:opacity-50"
          title="Refresh message history"
          aria-label="Refresh message thread history"
        >
          <RefreshCw
            className={cn('w-4 h-4', isLoadingHistory && 'animate-spin text-primary')}
            aria-hidden="true"
          />
          <span className="hidden sm:inline font-medium">Refresh</span>
        </button>
      </div>

      {/* History Error Banner */}
      {historyError && (
        <div
          role="alert"
          className="p-3 text-sm bg-error/10 text-error border border-error/20 rounded-md flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{historyError}</span>
          </div>
          <button
            type="button"
            onClick={fetchMessageHistory}
            className="text-xs underline hover:no-underline font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Post Submission Error Banner */}
      {postError && (
        <div
          role="alert"
          className="p-3 text-sm bg-error/10 text-error border border-error/20 rounded-md flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{postError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPostError(null)}
            className="p-1 hover:bg-error/20 rounded transition-colors"
            aria-label="Dismiss error banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading History State */}
      {isLoadingHistory ? (
        <div
          className="flex flex-col items-center justify-center p-8 space-y-3 text-on-surface-variant"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
          <span className="text-sm font-medium">History loading spinner</span>
        </div>
      ) : internalMessages.length === 0 ? (
        /* Empty History State */
        <div
          className="flex flex-col items-center justify-center p-8 border border-dashed border-outline-variant/60 rounded-lg text-on-surface-variant space-y-2 bg-surface-container-low/40"
          data-testid="empty-thread-message"
        >
          <MessageSquare className="w-8 h-8 text-outline/60" aria-hidden="true" />
          <p className="text-sm font-medium">No messages recorded in thread.</p>
        </div>
      ) : (
        /* Sequential Message History List */
        <div
          className="space-y-4 max-h-[600px] overflow-y-auto pr-1"
          role="log"
          aria-live="polite"
          aria-label="Chronological ticket messages"
        >
          {internalMessages.map((msg, idx) => {
            const badge = getSenderBadgeInfo(msg.sender_type);
            const attachments = msg.attachments || [];

            return (
              <article
                key={msg.id || `msg-${idx}`}
                data-testid={`thread-message-${msg.id || idx}`}
                className={cn(
                  'p-4 rounded-lg border space-y-3 transition-colors',
                  badge.cardClass
                )}
              >
                {/* Message Metadata Header */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span
                      className={cn(
                        'inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                        badge.badgeClass
                      )}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                    <span className="font-mono text-on-surface-variant/80 font-medium">
                      {msg.sender_id || 'Unknown Sender'}
                    </span>
                  </div>
                  <time
                    dateTime={msg.created_at || undefined}
                    className="text-on-surface-variant/70 text-xs font-sans"
                  >
                    {formatTimestamp(msg.created_at)}
                  </time>
                </div>

                {/* Message Body Content */}
                {msg.message_body && (
                  <p className="text-sm leading-relaxed text-on-surface whitespace-pre-wrap font-sans">
                    {msg.message_body}
                  </p>
                )}

                {/* File Attachments Links */}
                {attachments.length > 0 && (
                  <div className="pt-2 border-t border-outline-variant/30 space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs text-on-surface-variant font-medium">
                      <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Attachments ({attachments.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 rounded border border-outline-variant/50 bg-surface hover:bg-surface-container-high/40 transition-colors text-xs"
                          data-testid={`attachment-item-${att.id}`}
                        >
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            {getAttachmentIcon(att.mime_type, att.filename)}
                            <div className="flex flex-col min-w-0">
                              <span
                                className="font-medium text-on-surface truncate max-w-[160px] sm:max-w-[180px]"
                                title={att.filename}
                              >
                                {att.filename}
                              </span>
                              <span className="text-[11px] text-on-surface-variant/70">
                                {formatFileSize(att.file_size_bytes)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(att)}
                            disabled={downloadingId === att.id}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-surface-container-high hover:bg-primary/10 text-primary transition-colors font-medium shrink-0 disabled:opacity-50"
                            title={`Download ${att.filename}`}
                            aria-label={`Download attachment ${att.filename}`}
                          >
                            {downloadingId === att.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">Download</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Reply Composer Form */}
      {!readOnly && (
        <form
          onSubmit={handleSendMessage}
          className="pt-4 border-t border-outline-variant/40 space-y-3"
          aria-label="Post thread reply"
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor={`reply-textarea-${ticketId}`}
              className="text-xs font-medium text-on-surface-variant uppercase tracking-wider"
            >
              Post Reply
            </label>
            <span className="text-xs text-on-surface-variant/70">
              Max file attachment size: 10 MB
            </span>
          </div>

          <textarea
            id={`reply-textarea-${ticketId}`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply message here..."
            rows={3}
            disabled={isSubmitting}
            aria-label="Reply message body"
            className="w-full p-3 text-sm text-on-surface bg-surface-container-lowest border border-outline-variant/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50 resize-y transition-shadow"
          />

          {/* Selected File Badge / Validation Error */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                id={`file-input-${ticketId}`}
                onChange={handleFileSelect}
                disabled={isSubmitting}
                className="hidden"
                data-testid="thread-file-input"
              />

              <label
                htmlFor={`file-input-${ticketId}`}
                className={cn(
                  'cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 rounded border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container-high text-xs font-medium text-on-surface-variant transition-colors',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Paperclip className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Attach File</span>
              </label>

              {selectedFile && (
                <div
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-primary-container/20 text-primary border border-primary-container/40 text-xs font-medium"
                  data-testid="selected-file-badge"
                >
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-[180px] truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <span className="text-[11px] opacity-80">
                    ({formatFileSize(selectedFile.size)})
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-0.5 hover:bg-primary-container/40 rounded-full transition-colors"
                    aria-label="Remove attached file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !!fileValidationError ||
                (!replyText.trim() && !selectedFile)
              }
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-md bg-primary text-on-primary hover:bg-primary-container font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              data-testid="send-reply-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>Send Reply</span>
                </>
              )}
            </button>
          </div>

          {/* Inline Validation Error */}
          {fileValidationError && (
            <p
              className="text-xs text-error font-medium flex items-center space-x-1"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{fileValidationError}</span>
            </p>
          )}
        </form>
      )}
    </section>
  );
}

export default TicketThread;
