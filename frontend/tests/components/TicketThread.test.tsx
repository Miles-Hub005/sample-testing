import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  TicketThread,
  formatFileSize,
  formatTimestamp,
  getSenderBadgeInfo,
  getAttachmentIcon,
} from '../../src/components/support/TicketThread';
import { supportService, TicketMessage, TicketAttachment } from '../../src/services/support';

// Mock supportService
vi.mock('../../src/services/support', async () => {
  const actual = await vi.importActual('../../src/services/support');
  return {
    ...actual,
    supportService: {
      ...actual.supportService,
      getMessages: vi.fn(),
      createMessage: vi.fn(),
      uploadAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
    },
  };
});

describe('TicketThread Component & Helper Functions', () => {
  const mockTicketId = 'tkt-test-123';

  const mockMessages: TicketMessage[] = [
    {
      id: 'msg-1',
      ticket_id: mockTicketId,
      sender_id: 'usr_client_01',
      sender_type: 'client',
      message_body: 'I am unable to login to my dashboard account.',
      created_at: '2026-10-06T10:00:00Z',
      attachments: [
        {
          id: 'att-1',
          message_id: 'msg-1',
          filename: 'error_screenshot.png',
          file_size_bytes: 524288, // 512 KB
          mime_type: 'image/png',
          storage_key: 'keys/att-1.png',
          uploaded_at: '2026-10-06T10:00:00Z',
        },
      ],
    },
    {
      id: 'msg-2',
      ticket_id: mockTicketId,
      sender_id: 'agent_support_07',
      sender_type: 'agent',
      message_body: 'Thank you for reaching out. We are investigating the issue.',
      created_at: '2026-10-06T10:15:00Z',
      attachments: [],
    },
    {
      id: 'msg-3',
      ticket_id: mockTicketId,
      sender_id: 'system',
      sender_type: 'system',
      message_body: 'Ticket assigned to Tier 2 Support.',
      created_at: '2026-10-06T10:20:00Z',
      attachments: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pure Helper Functions', () => {
    it('formatFileSize formats byte amounts accurately', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(undefined)).toBe('0 B');
      expect(formatFileSize(-100)).toBe('0 B');
    });

    it('formatTimestamp formats dates cleanly', () => {
      expect(formatTimestamp(null)).toBe('Just now');
      expect(formatTimestamp(undefined)).toBe('Just now');
      const formatted = formatTimestamp('2026-10-06T10:00:00Z');
      expect(formatted).toContain('2026');
      expect(formatTimestamp('invalid-date')).toBe('invalid-date');
    });

    it('getSenderBadgeInfo returns correct attributes for client, agent, system', () => {
      expect(getSenderBadgeInfo('client').label).toBe('Client');
      expect(getSenderBadgeInfo('agent').label).toBe('Support Agent');
      expect(getSenderBadgeInfo('system').label).toBe('System Notification');
    });

    it('getAttachmentIcon returns appropriate file icon', () => {
      const imgIcon = getAttachmentIcon('image/png', 'photo.png');
      expect(imgIcon).toBeDefined();

      const docIcon = getAttachmentIcon('application/pdf', 'doc.pdf');
      expect(docIcon).toBeDefined();

      const genericIcon = getAttachmentIcon('application/octet-stream', 'binary.bin');
      expect(genericIcon).toBeDefined();
    });
  });

  describe('Rendering States', () => {
    it('renders history loading spinner when loading is true', () => {
      render(<TicketThread ticketId={mockTicketId} loading={true} />);

      expect(screen.getByText('History loading spinner')).toBeInTheDocument();
    });

    it('renders empty state text when message history is empty', () => {
      render(<TicketThread ticketId={mockTicketId} messages={[]} />);

      expect(screen.getByText('No messages recorded in thread.')).toBeInTheDocument();
    });

    it('renders sequential timestamped messages with sender badges and attachments', () => {
      render(<TicketThread ticketId={mockTicketId} messages={mockMessages} />);

      // Verify messages are rendered
      expect(screen.getByText('I am unable to login to my dashboard account.')).toBeInTheDocument();
      expect(
        screen.getByText('Thank you for reaching out. We are investigating the issue.')
      ).toBeInTheDocument();
      expect(screen.getByText('Ticket assigned to Tier 2 Support.')).toBeInTheDocument();

      // Verify sender badges
      expect(screen.getByText('Client')).toBeInTheDocument();
      expect(screen.getByText('Support Agent')).toBeInTheDocument();
      expect(screen.getByText('System Notification')).toBeInTheDocument();

      // Verify attachment details
      expect(screen.getByText('error_screenshot.png')).toBeInTheDocument();
      expect(screen.getByText('500.0 KB')).toBeInTheDocument();
    });

    it('fetches messages automatically via supportService when messages prop is omitted', async () => {
      (supportService.getMessages as any).mockResolvedValueOnce(mockMessages);

      render(<TicketThread ticketId={mockTicketId} />);

      await waitFor(() => {
        expect(supportService.getMessages).toHaveBeenCalledWith(mockTicketId);
        expect(screen.getByText('I am unable to login to my dashboard account.')).toBeInTheDocument();
      });
    });

    it('displays history error banner if fetching message history fails', async () => {
      (supportService.getMessages as any).mockRejectedValueOnce(
        new Error('Network connection timeout')
      );

      render(<TicketThread ticketId={mockTicketId} />);

      await waitFor(() => {
        expect(screen.getByText('Network connection timeout')).toBeInTheDocument();
      });
    });
  });

  describe('File Download Interactions', () => {
    it('invokes custom onDownloadAttachment handler when provided', () => {
      const onDownload = vi.fn();
      render(
        <TicketThread
          ticketId={mockTicketId}
          messages={mockMessages}
          onDownloadAttachment={onDownload}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /download attachment error_screenshot.png/i });
      fireEvent.click(downloadButton);

      expect(onDownload).toHaveBeenCalledWith(mockMessages[0].attachments![0]);
    });

    it('calls supportService.downloadAttachment when default handler is used', async () => {
      const mockBlob = new Blob(['dummy file content'], { type: 'image/png' });
      (supportService.downloadAttachment as any).mockResolvedValueOnce(mockBlob);

      // Mock URL methods
      window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-url');
      window.URL.revokeObjectURL = vi.fn();

      render(<TicketThread ticketId={mockTicketId} messages={mockMessages} />);

      const downloadButton = screen.getByRole('button', { name: /download attachment error_screenshot.png/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(supportService.downloadAttachment).toHaveBeenCalledWith('att-1');
      });
    });
  });

  describe('Reply Message Composer & Attachment Upload', () => {
    it('submits a new message reply via onSendMessage callback', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined);

      render(
        <TicketThread
          ticketId={mockTicketId}
          messages={mockMessages}
          onSendMessage={onSend}
        />
      );

      const textarea = screen.getByLabelText(/reply message body/i);
      fireEvent.change(textarea, { target: { value: 'Here is additional diagnostic info.' } });

      const sendButton = screen.getByTestId('send-reply-button');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith('Here is additional diagnostic info.', null);
      });
    });

    it('attaches a valid file and posts reply with supportService.uploadAttachment', async () => {
      (supportService.uploadAttachment as any).mockResolvedValueOnce({
        id: 'att-new',
        message_id: 'msg-new',
        filename: 'log.txt',
        file_size_bytes: 1024,
        mime_type: 'text/plain',
        storage_key: 'keys/log.txt',
      });
      (supportService.getMessages as any).mockResolvedValue(mockMessages);

      render(<TicketThread ticketId={mockTicketId} senderId="usr_client_01" />);

      await waitFor(() => {
        expect(screen.getByText('I am unable to login to my dashboard account.')).toBeInTheDocument();
      });

      const file = new File(['log content'], 'log.txt', { type: 'text/plain' });
      const fileInput = screen.getByTestId('thread-file-input');

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByTestId('selected-file-badge')).toBeInTheDocument();
      expect(screen.getByText('log.txt')).toBeInTheDocument();

      const textarea = screen.getByLabelText(/reply message body/i);
      fireEvent.change(textarea, { target: { value: 'Attached system logs.' } });

      const sendButton = screen.getByTestId('send-reply-button');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(supportService.uploadAttachment).toHaveBeenCalledWith(
          mockTicketId,
          file,
          'usr_client_01',
          'client',
          'Attached system logs.'
        );
      });
    });

    it('displays file validation error when file size exceeds boundary limit', () => {
      render(<TicketThread ticketId={mockTicketId} messages={mockMessages} />);

      // Create an oversized 15MB file (>10MB default limit)
      const oversizedContent = new ArrayBuffer(15 * 1024 * 1024);
      const oversizedFile = new File([oversizedContent], 'huge_file.zip', {
        type: 'application/zip',
      });

      const fileInput = screen.getByTestId('thread-file-input');
      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      expect(
        screen.getByText(/exceeds maximum allowed threshold/i)
      ).toBeInTheDocument();
    });

    it('displays inline error banner when posting a message fails', async () => {
      (supportService.createMessage as any).mockRejectedValueOnce(
        new Error('Failed to post message.')
      );

      render(<TicketThread ticketId={mockTicketId} senderId="usr_test" />);

      const textarea = screen.getByLabelText(/reply message body/i);
      fireEvent.change(textarea, { target: { value: 'Test failing message post.' } });

      const sendButton = screen.getByTestId('send-reply-button');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to post message.')).toBeInTheDocument();
      });
    });

    it('does not render reply form when readOnly is true', () => {
      render(<TicketThread ticketId={mockTicketId} messages={mockMessages} readOnly={true} />);

      expect(screen.queryByLabelText(/reply message body/i)).toBeNull();
      expect(screen.queryByTestId('send-reply-button')).toBeNull();
    });
  });
});
