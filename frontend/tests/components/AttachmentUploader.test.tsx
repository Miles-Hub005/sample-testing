import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  AttachmentUploader,
  formatFileSize,
  getFileIconType,
  getAcceptAttribute,
} from '../../src/components/support/AttachmentUploader';
import { supportService, TicketAttachment } from '../../src/services/support';

// Mock supportService
vi.mock('../../src/services/support', async () => {
  const actual = await vi.importActual('../../src/services/support');
  return {
    ...actual,
    supportService: {
      ...actual.supportService,
      uploadAttachment: vi.fn(),
    },
  };
});

describe('AttachmentUploader Component & Helper Functions', () => {
  const mockTicketId = 'tkt-test-999';

  const createMockFile = (
    name: string = 'document.pdf',
    sizeBytes: number = 1024 * 500, // 500 KB
    type: string = 'application/pdf'
  ): File => {
    const blob = new Blob(['a'.repeat(Math.min(sizeBytes, 100))], { type });
    Object.defineProperty(blob, 'size', { value: sizeBytes, writable: false });
    Object.defineProperty(blob, 'name', { value: name, writable: false });
    return blob as File;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL and revokeObjectURL
    if (typeof URL.createObjectURL !== 'function') {
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    }
  });

  describe('Pure Helper Functions', () => {
    it('formatFileSize formats file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(undefined)).toBe('0 B');
      expect(formatFileSize(-50)).toBe('0 B');
    });

    it('getFileIconType classifies MIME types and filenames correctly', () => {
      expect(getFileIconType('image/png', 'pic.png')).toBe('image');
      expect(getFileIconType('application/pdf', 'doc.pdf')).toBe('pdf');
      expect(
        getFileIconType(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'spec.docx'
        )
      ).toBe('document');
      expect(getFileIconType('text/plain', 'notes.txt')).toBe('text');
      expect(getFileIconType('application/zip', 'archive.zip')).toBe('file');
    });

    it('getAcceptAttribute constructs HTML accept attribute from MIME types', () => {
      const defaultAccept = getAcceptAttribute();
      expect(defaultAccept).toContain('.jpg');
      expect(defaultAccept).toContain('.pdf');
      expect(defaultAccept).toContain('.txt');

      const customAccept = getAcceptAttribute(['image/png', 'application/pdf']);
      expect(customAccept).toBe('.png,.pdf');
    });
  });

  describe('Component Rendering & File Selection', () => {
    it('renders initial dropzone with default labels', () => {
      render(<AttachmentUploader ticketId={mockTicketId} label="Upload Proof" />);

      expect(screen.getByText('Upload Proof')).toBeDefined();
      expect(screen.getByText('Click to browse')).toBeDefined();
      expect(screen.getByText(/or drag and drop file here/i)).toBeDefined();
    });

    it('validates and rejects oversized files [FR-3, NFR-2]', async () => {
      const onFileSelect = vi.fn();
      const onUploadError = vi.fn();

      render(
        <AttachmentUploader
          ticketId={mockTicketId}
          maxSizeBytes={1024 * 1024 * 5} // 5 MB limit
          onFileSelect={onFileSelect}
          onUploadError={onUploadError}
        />
      );

      const oversizedFile = createMockFile('large_video.mp4', 1024 * 1024 * 8, 'image/jpeg'); // 8 MB
      const fileInput = screen.getByTestId('attachment-uploader-file-input');

      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      await waitFor(() => {
        expect(onFileSelect).toHaveBeenCalledWith(
          oversizedFile,
          expect.objectContaining({ valid: false })
        );
      });

      expect(
        screen.getByText(/exceeds maximum allowed threshold of 5.0 MB/i)
      ).toBeDefined();
      expect(onUploadError).toHaveBeenCalledWith(
        expect.stringContaining('exceeds maximum allowed threshold')
      );
    });

    it('validates and rejects forbidden MIME file types [FR-3, NFR-2]', async () => {
      const onFileSelect = vi.fn();
      const onUploadError = vi.fn();

      render(
        <AttachmentUploader
          ticketId={mockTicketId}
          allowedMimeTypes={['image/jpeg', 'application/pdf']}
          onFileSelect={onFileSelect}
          onUploadError={onUploadError}
        />
      );

      const forbiddenFile = createMockFile('script.exe', 1024 * 100, 'application/x-msdownload');
      const fileInput = screen.getByTestId('attachment-uploader-file-input');

      fireEvent.change(fileInput, { target: { files: [forbiddenFile] } });

      await waitFor(() => {
        expect(onFileSelect).toHaveBeenCalledWith(
          forbiddenFile,
          expect.objectContaining({ valid: false })
        );
      });

      expect(screen.getByText(/is not permitted/i)).toBeDefined();
      expect(onUploadError).toHaveBeenCalledWith(expect.stringContaining('is not permitted'));
    });

    it('accepts valid file and displays file information and thumbnail', async () => {
      const onFileSelect = vi.fn();

      render(<AttachmentUploader ticketId={mockTicketId} onFileSelect={onFileSelect} />);

      const validFile = createMockFile('screenshot.png', 1024 * 250, 'image/png');
      const fileInput = screen.getByTestId('attachment-uploader-file-input');

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText('screenshot.png')).toBeDefined();
        expect(screen.getByText(/250.0 KB/i)).toBeDefined();
      });

      expect(onFileSelect).toHaveBeenCalledWith(
        validFile,
        expect.objectContaining({ valid: true })
      );
    });

    it('supports drag and drop file uploads', async () => {
      const onFileSelect = vi.fn();

      render(<AttachmentUploader ticketId={mockTicketId} onFileSelect={onFileSelect} />);

      const dropzone = screen.getByTestId('attachment-uploader-dropzone');
      const validFile = createMockFile('report.pdf', 1024 * 100, 'application/pdf');

      fireEvent.dragEnter(dropzone);
      fireEvent.dragOver(dropzone);
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [validFile] },
      });

      await waitFor(() => {
        expect(screen.getByText('report.pdf')).toBeDefined();
      });

      expect(onFileSelect).toHaveBeenCalledWith(
        validFile,
        expect.objectContaining({ valid: true })
      );
    });

    it('allows clearing selected file', async () => {
      const onFileSelect = vi.fn();

      render(<AttachmentUploader ticketId={mockTicketId} onFileSelect={onFileSelect} />);

      const validFile = createMockFile('notes.txt', 1024, 'text/plain');
      const fileInput = screen.getByTestId('attachment-uploader-file-input');

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByText('notes.txt')).toBeDefined();
      });

      const removeBtn = screen.getByTestId('attachment-uploader-remove-btn');
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(screen.queryByText('notes.txt')).toBeNull();
        expect(screen.getByText('Click to browse')).toBeDefined();
      });

      expect(onFileSelect).toHaveBeenLastCalledWith(null, { valid: true });
    });
  });

  describe('Upload Execution & Service Integration [NFR-4]', () => {
    it('executes manual upload via supportService when upload button is clicked', async () => {
      const mockAttachment: TicketAttachment = {
        id: 'att-555',
        message_id: 'msg-555',
        filename: 'document.pdf',
        file_size_bytes: 512000,
        mime_type: 'application/pdf',
        storage_key: 'keys/att-555.pdf',
        uploaded_at: '2026-10-06T12:00:00Z',
      };

      vi.mocked(supportService.uploadAttachment).mockResolvedValueOnce(mockAttachment);

      const onUploadSuccess = vi.fn();

      render(
        <AttachmentUploader
          ticketId={mockTicketId}
          senderId="usr_123"
          senderType="client"
          onUploadSuccess={onUploadSuccess}
        />
      );

      const validFile = createMockFile('document.pdf', 512000, 'application/pdf');
      const fileInput = screen.getByTestId('attachment-uploader-file-input');

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('attachment-uploader-upload-btn')).toBeDefined();
      });

      const uploadBtn = screen.getByTestId('attachment-uploader-upload-btn');
      fireEvent.click(uploadBtn);

      await waitFor(() => {
        expect(supportService.uploadAttachment).toHaveBeenCalledWith(
          mockTicketId,
          validFile,
          'usr_123',
          'client',
          undefined
        );
        expect(onUploadSuccess).toHaveBeenCalledWith(mockAttachment);
        expect(screen.getByText('Attachment uploaded successfully!')).toBeDefined();
      });
    });

    it('executes upload using custom onUpload prop (explicit dependency injection)', async () => {
      const customOnUpload = vi.fn().mockResolvedValue({
        id: 'att-custom',
        filename: 'custom.png',
        file_size_bytes: 1000,
        mime_type: 'image/png',
      });

      const onUploadSuccess = vi.fn();

      render(
        <AttachmentUploader
          onUpload={customOnUpload}
          onUploadSuccess={onUploadSuccess}
        />
      );

      const validFile = createMockFile('custom.png', 1000, 'image/png');
      const fileInput = screen.getByTestId('attachment-uploader-file-input');

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('attachment-uploader-upload-btn')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('attachment-uploader-upload-btn'));

      await waitFor(() => {
        expect(customOnUpload).toHaveBeenCalledWith(validFile);
        expect(onUploadSuccess).toHaveBeenCalled();
      });
    });

    it('executes autoUpload when enabled', async () => {
      const mockAttachment: TicketAttachment = {
        id: 'att-auto',
        filename: 'auto.pdf',
        file_size_bytes: 2000,
        mime_type: 'application/pdf',
      };

      vi.mocked(supportService.uploadAttachment).mockResolvedValueOnce(mockAttachment);

      const onUploadSuccess = vi.fn();

      render(
        <AttachmentUploader
          ticketId={mockTicketId}
          autoUpload={true}
          onUploadSuccess={onUploadSuccess}
        />
      );

      const validFile = createMockFile('auto.pdf', 2000, 'application/pdf');
      const fileInput = screen.getByTestId('attachment-uploader-file-input');

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(supportService.uploadAttachment).toHaveBeenCalled();
        expect(onUploadSuccess).toHaveBeenCalledWith(mockAttachment);
      });
    });

    it('handles network upload failure gracefully and displays error banner', async () => {
      vi.mocked(supportService.uploadAttachment).mockRejectedValueOnce(
        new Error('Network error during file upload')
      );

      const onUploadError = vi.fn();

      render(
        <AttachmentUploader
          ticketId={mockTicketId}
          onUploadError={onUploadError}
        />
      );

      const validFile = createMockFile('data.csv', 5000, 'text/plain');
      const fileInput = screen.getByTestId('attachment-uploader-file-input');

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('attachment-uploader-upload-btn')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('attachment-uploader-upload-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('attachment-uploader-upload-error')).toBeDefined();
        expect(screen.getByText('Network error during file upload')).toBeDefined();
        expect(onUploadError).toHaveBeenCalled();
      });
    });
  });

  describe('Disabled & ReadOnly Modes', () => {
    it('disables file browsing when disabled or readOnly is true', () => {
      const { rerender } = render(
        <AttachmentUploader ticketId={mockTicketId} disabled={true} />
      );

      const fileInput1 = screen.getByTestId(
        'attachment-uploader-file-input'
      ) as HTMLInputElement;
      expect(fileInput1.disabled).toBe(true);

      rerender(<AttachmentUploader ticketId={mockTicketId} readOnly={true} />);
      const fileInput2 = screen.getByTestId(
        'attachment-uploader-file-input'
      ) as HTMLInputElement;
      expect(fileInput2.disabled).toBe(true);
    });
  });
});
