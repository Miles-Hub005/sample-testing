import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes deterministically.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
