import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SignaturePad } from '../../src/components/contracts/signature_pad';
import {
  SignatureExecuteResponse,
  contractApi,
} from '../../src/services/contract_api';

// Mock contractApi service
vi.mock('../../src/services/contract_api', async () => {
  const actual = await vi.importActual<typeof import('../../src/services/contract_api')>(
    '../../src/services/contract_api'
  );
  return {
    ...actual,
    contractApi: {
      ...actual.contractApi,
      executeSignature: vi.fn(),
    },
  };
});

describe('SignaturePad Component [FR-6]', () => {
  const mockExecuteResponse: SignatureExecuteResponse = {
    signature_request_id: 'sig-req-123',
    contract_id: 'contract-456',
    status: 'EXECUTED',
    executed_at: '2026-10-06T10:00:00Z',
    all_signatures_completed: true,
    resulting_contract_status: 'ACTIVE',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial signature pad in pending mode with default controls', () => {
    render(
      <SignaturePad
        signatureRequestId="sig-req-123"
        contractId="contract-456"
        contractTitle="Master Services Agreement"
        signatoryName="John Doe"
        signatoryRole="Chief Executive Officer"
      />
    );

    // Assert header and status
    expect(screen.getByText('Execute Digital Signature')).toBeInTheDocument();
    expect(screen.getByText(/Master Services Agreement/i)).toBeInTheDocument();
    expect(screen.getByText('PENDING EXECUTION')).toBeInTheDocument();

    // Assert inputs
    const nameInput = screen.getByLabelText(/Signatory Full Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('John Doe');

    const roleInput = screen.getByLabelText(/Signatory Title \/ Role/i) as HTMLInputElement;
    expect(roleInput.value).toBe('Chief Executive Officer');

    // Assert capture mode tabs
    expect(screen.getByRole('tab', { name: /Draw Signature/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Type Signature/i })).toBeInTheDocument();

    // Assert canvas element
    const canvas = screen.getByRole('img', { name: /Digital signature drawing canvas/i });
    expect(canvas).toBeInTheDocument();

    // Assert legal acknowledgement checkbox
    const checkbox = screen.getByLabelText(/Legal Authorization Acknowledgement/i);
    expect(checkbox).not.toBeChecked();

    // Execute button should be disabled initially (not agreed and no drawing yet)
    const executeButton = screen.getByRole('button', { name: /Execute Digital Signature/i });
    expect(executeButton).toBeDisabled();
  });

  it('switches to typed signature mode and updates preview', () => {
    render(
      <SignaturePad
        signatureRequestId="sig-req-123"
        signatoryName="Alice Smith"
      />
    );

    // Switch to Type mode
    const typeTab = screen.getByRole('tab', { name: /Type Signature/i });
    fireEvent.click(typeTab);

    // Assert type input appears
    const typeInput = screen.getByPlaceholderText(/Type your full legal signature/i) as HTMLInputElement;
    expect(typeInput).toBeInTheDocument();

    // Type signature text
    fireEvent.change(typeInput, { target: { value: 'Alice Smith, CEO' } });

    // Check preview container updates
    expect(screen.getByText('Alice Smith, CEO')).toBeInTheDocument();
  });

  it('allows legal agreement toggle and enables execution button when typed signature is present', () => {
    render(
      <SignaturePad
        signatureRequestId="sig-req-123"
        signatoryName="Bob Marley"
      />
    );

    // Switch to type mode
    fireEvent.click(screen.getByRole('tab', { name: /Type Signature/i }));

    const typeInput = screen.getByPlaceholderText(/Type your full legal signature/i);
    fireEvent.change(typeInput, { target: { value: 'Bob Marley' } });

    const checkbox = screen.getByLabelText(/Legal Authorization Acknowledgement/i);
    const executeButton = screen.getByRole('button', { name: /Execute Digital Signature/i });

    expect(executeButton).toBeDisabled();

    // Check legal checkbox
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Now execute button should be enabled
    expect(executeButton).not.toBeDisabled();
  });

  it('executes signature via contractApi.executeSignature successfully', async () => {
    vi.mocked(contractApi.executeSignature).mockResolvedValue(mockExecuteResponse);
    const onCapturedSpy = vi.fn();

    render(
      <SignaturePad
        signatureRequestId="sig-req-123"
        contractId="contract-456"
        signatoryName="Carol Danvers"
        onSignatureCaptured={onCapturedSpy}
      />
    );

    // Switch to type mode
    fireEvent.click(screen.getByRole('tab', { name: /Type Signature/i }));
    fireEvent.change(screen.getByPlaceholderText(/Type your full legal signature/i), {
      target: { value: 'Carol Danvers' },
    });

    // Check legal checkbox
    fireEvent.click(screen.getByLabelText(/Legal Authorization Acknowledgement/i));

    // Click submit
    const executeButton = screen.getByRole('button', { name: /Execute Digital Signature/i });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(contractApi.executeSignature).toHaveBeenCalledWith(
        'sig-req-123',
        expect.objectContaining({
          signature_digest: expect.stringContaining('TYPED_SIG_Carol%20Danvers'),
        })
      );
    });

    await waitFor(() => {
      expect(onCapturedSpy).toHaveBeenCalledWith(mockExecuteResponse);
      expect(screen.getByText('Digital Signature Executed')).toBeInTheDocument();
      expect(screen.getByText(/Signature Captured Successfully/i)).toBeInTheDocument();
      expect(screen.getByText('EXECUTED')).toBeInTheDocument();
    });
  });

  it('invokes custom onExecute callback when provided', async () => {
    const onExecuteSpy = vi.fn().mockResolvedValue(mockExecuteResponse);
    const onCapturedSpy = vi.fn();

    render(
      <SignaturePad
        signatureRequestId="sig-req-999"
        signatoryName="David Miller"
        onExecute={onExecuteSpy}
        onSignatureCaptured={onCapturedSpy}
      />
    );

    // Switch to type mode
    fireEvent.click(screen.getByRole('tab', { name: /Type Signature/i }));
    fireEvent.change(screen.getByPlaceholderText(/Type your full legal signature/i), {
      target: { value: 'David Miller' },
    });

    // Check legal checkbox and submit
    fireEvent.click(screen.getByLabelText(/Legal Authorization Acknowledgement/i));
    fireEvent.click(screen.getByRole('button', { name: /Execute Digital Signature/i }));

    await waitFor(() => {
      expect(onExecuteSpy).toHaveBeenCalledWith(
        'sig-req-999',
        expect.stringContaining('TYPED_SIG_David%20Miller')
      );
      expect(onCapturedSpy).toHaveBeenCalled();
    });
  });

  it('displays error banner if API execution fails', async () => {
    vi.mocked(contractApi.executeSignature).mockRejectedValue(
      new Error('Invalid signature request state.')
    );

    render(
      <SignaturePad
        signatureRequestId="sig-req-err"
        signatoryName="Eve Adams"
      />
    );

    // Switch to type mode
    fireEvent.click(screen.getByRole('tab', { name: /Type Signature/i }));
    fireEvent.change(screen.getByPlaceholderText(/Type your full legal signature/i), {
      target: { value: 'Eve Adams' },
    });

    // Check legal checkbox and submit
    fireEvent.click(screen.getByLabelText(/Legal Authorization Acknowledgement/i));
    fireEvent.click(screen.getByRole('button', { name: /Execute Digital Signature/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Invalid signature request state.')).toBeInTheDocument();
    });
  });

  it('renders read-only executed view when status is EXECUTED', () => {
    render(
      <SignaturePad
        status="EXECUTED"
        contractTitle="NDA Agreement"
        signatoryName="Frank Castle"
        signatoryRole="Legal Counsel"
        executedAt="2026-10-06T08:30:00Z"
        existingSignatureDigest="data:text/plain;base64,TYPED_SIG_Frank_Castle"
        readOnly
      />
    );

    expect(screen.getByText('Digital Signature Executed')).toBeInTheDocument();
    expect(screen.getByText(/NDA Agreement/i)).toBeInTheDocument();
    expect(screen.getByText('EXECUTED')).toBeInTheDocument();
    expect(screen.getByText('Frank Castle')).toBeInTheDocument();
    expect(screen.getByText('Legal Counsel')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Execute Digital Signature/i })).not.toBeInTheDocument();
  });

  it('invokes onCancel callback when cancel button is clicked', () => {
    const onCancelSpy = vi.fn();

    render(
      <SignaturePad
        signatureRequestId="sig-req-123"
        onCancel={onCancelSpy}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(onCancelSpy).toHaveBeenCalledTimes(1);
  });
});
