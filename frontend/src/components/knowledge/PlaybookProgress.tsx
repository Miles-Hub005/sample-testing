'use client';

import React, { useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  CheckSquare,
  Square,
  HelpCircle,
  Award,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PlaybookStepResponse, StepProgressItem } from '../../services/knowledge';

// ============================================================================
// Types & Interfaces [FR-3, FR-4, NFR-3]
// ============================================================================

export interface StepItemData {
  id: string;
  step_number: number;
  title: string;
  content?: string;
  checkpoint_instructions?: string | null;
  is_completed?: boolean;
  completed_at?: string | null;
}

export interface PlaybookProgressProps {
  /**
   * Optional parent article / playbook identifier.
   */
  articleId?: string;

  /**
   * Playbook steps array (supports PlaybookStepResponse or StepProgressItem or StepItemData).
   */
  steps?: PlaybookStepResponse[] | StepProgressItem[] | StepItemData[];

  /**
   * Array of step IDs that have been completed.
   */
  completedStepIds?: string[];

  /**
   * Overall progress percentage override (0-100). If omitted, calculated automatically from completed steps.
   */
  progressPercentage?: number;

  /**
   * Callback invoked when user toggles a step's completion checkbox/button.
   */
  onToggleStep?: (stepId: string, currentStatus: boolean) => Promise<void> | void;

  /**
   * Currently updating step ID to display loading indicator.
   */
  isUpdatingStepId?: string | null;

  /**
   * Flag to show or hide checkpoint instructions verification box (default: true).
   */
  showCheckpointInstructions?: boolean;

  /**
   * Custom CSS class name.
   */
  className?: string;

  /**
   * Optional title header for the progress section.
   */
  title?: string;
}

// ============================================================================
// PlaybookProgress Component [FR-3, FR-4, NFR-3]
// ============================================================================

export const PlaybookProgress: React.FC<PlaybookProgressProps> = ({
  articleId,
  steps = [],
  completedStepIds = [],
  progressPercentage,
  onToggleStep,
  isUpdatingStepId = null,
  showCheckpointInstructions = true,
  className,
  title = 'Playbook Progress & Step Guidance',
}) => {
  // Normalize step data to unified structure
  const normalizedSteps: StepItemData[] = steps.map((s) => {
    const stepId =
      'id' in s && typeof (s as any).id === 'string' && (s as any).id
        ? (s as any).id
        : 'step_id' in s && typeof (s as any).step_id === 'string'
        ? (s as any).step_id
        : '';
    const isCompleted =
      'is_completed' in s && typeof s.is_completed === 'boolean'
        ? s.is_completed
        : completedStepIds.includes(stepId);

    return {
      id: stepId,
      step_number: s.step_number,
      title: s.title,
      content: 'content' in s ? (s as any).content : undefined,
      checkpoint_instructions:
        'checkpoint_instructions' in s ? (s as any).checkpoint_instructions : undefined,
      is_completed: isCompleted,
      completed_at: 'completed_at' in s ? (s as any).completed_at : undefined,
    };
  });

  const totalSteps = normalizedSteps.length;
  const completedStepsCount = normalizedSteps.filter((s) => s.is_completed).length;

  const calculatedPercentage =
    typeof progressPercentage === 'number'
      ? Math.min(100, Math.max(0, Math.round(progressPercentage)))
      : totalSteps > 0
      ? Math.round((completedStepsCount / totalSteps) * 100)
      : 0;

  const isAllCompleted = totalSteps > 0 && completedStepsCount === totalSteps;

  const handleStepToggle = useCallback(
    async (stepId: string, currentCompletedStatus: boolean) => {
      if (onToggleStep && stepId) {
        await onToggleStep(stepId, currentCompletedStatus);
      }
    },
    [onToggleStep]
  );

  return (
    <div
      className={cn(
        'w-full rounded-lg border border-[#d1c4b9] bg-[#fbf9f4] p-5 shadow-sm text-[#1b1c19] space-y-6',
        className
      )}
      data-testid="playbook-progress-container"
    >
      {/* Header & Overall Visual Progress Bar [FR-3] */}
      <div className="space-y-3 pb-4 border-b border-[#d1c4b9]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#59452b]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[#1b1c19]">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                isAllCompleted
                  ? 'bg-[#f0eee9] text-[#59452b] border border-[#735c41]'
                  : completedStepsCount > 0
                  ? 'bg-[#735c41] text-[#ffffff]'
                  : 'bg-[#eae8e3] text-[#4e453d]'
              )}
            >
              {isAllCompleted ? (
                <>
                  <Award className="h-3.5 w-3.5" />
                  Playbook Completed
                </>
              ) : (
                <>
                  {completedStepsCount} of {totalSteps} steps completed
                </>
              )}
            </span>
          </div>
        </div>

        {/* Progress Bar Component */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-[#715a3f]">
            <span>Completion Status</span>
            <span>{calculatedPercentage}%</span>
          </div>
          <div
            className="relative h-3 w-full overflow-hidden rounded-full bg-[#e4e2dd]"
            role="progressbar"
            aria-valuenow={calculatedPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Playbook step progress percentage"
          >
            <div
              className={cn(
                'h-full transition-all duration-300 ease-in-out',
                isAllCompleted ? 'bg-[#59452b]' : 'bg-[#735c41]'
              )}
              style={{ width: `${calculatedPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step List View [FR-3, FR-4] */}
      {totalSteps === 0 ? (
        <div className="py-6 text-center text-sm text-[#80756b]">
          No steps defined for this playbook guide yet.
        </div>
      ) : (
        <div className="space-y-4" data-testid="playbook-steps-list">
          {normalizedSteps.map((step, index) => {
            const isUpdating = isUpdatingStepId === step.id;
            const isCompleted = !!step.is_completed;

            return (
              <div
                key={step.id || `step-${index}`}
                className={cn(
                  'rounded-md border p-4 transition-all',
                  isCompleted
                    ? 'border-[#80756b]/40 bg-[#f5f3ee]'
                    : 'border-[#d1c4b9] bg-[#ffffff]'
                )}
                data-testid={`playbook-step-card-${step.step_number}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Step Number Badge */}
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        isCompleted
                          ? 'bg-[#59452b] text-[#ffffff]'
                          : 'bg-[#e4e2dd] text-[#1b1c19]'
                      )}
                    >
                      {step.step_number}
                    </span>

                    <div className="space-y-1">
                      <h4
                        className={cn(
                          'text-sm font-semibold text-[#1b1c19]',
                          isCompleted && 'line-through text-[#4e453d]'
                        )}
                      >
                        {step.title}
                      </h4>

                      {/* Step Execution Instruction Content */}
                      {step.content && (
                        <div className="text-xs text-[#4e453d] leading-relaxed whitespace-pre-wrap">
                          {step.content}
                        </div>
                      )}

                      {/* Checkpoint / Verification Instructions [FR-3] */}
                      {showCheckpointInstructions && step.checkpoint_instructions && (
                        <div className="mt-2 rounded border border-[#d1c4b9] bg-[#f0eee9] p-2.5 text-xs text-[#4e453d]">
                          <div className="flex items-center gap-1 font-semibold text-[#715a3f] mb-1">
                            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Checkpoint Verification:
                          </div>
                          <div>{step.checkpoint_instructions}</div>
                        </div>
                      )}

                      {/* Completion Timestamp */}
                      {isCompleted && step.completed_at && (
                        <div className="text-[11px] text-[#80756b] italic pt-1">
                          Completed: {new Date(step.completed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Toggle Checkbox Button [FR-4] */}
                  <button
                    type="button"
                    onClick={() => handleStepToggle(step.id, isCompleted)}
                    disabled={isUpdating}
                    aria-label={`Mark step ${step.step_number} as ${
                      isCompleted ? 'incomplete' : 'completed'
                    }`}
                    className={cn(
                      'inline-flex items-center gap-1.5 shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]',
                      isCompleted
                        ? 'bg-[#59452b] text-[#ffffff] hover:bg-[#735c41]'
                        : 'bg-[#f0eee9] text-[#1b1c19] border border-[#80756b] hover:bg-[#eae8e3]'
                    )}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#715a3f]" />
                    ) : isCompleted ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-[#ffffff]" />
                        Completed
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4 text-[#80756b]" />
                        Mark Complete
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlaybookProgress;
