'use client';

import React, { useCallback } from 'react';
import {
  Search,
  X,
  Filter,
  Tag as TagIcon,
  Folder as FolderIcon,
  RotateCcw,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  CategoryResponse,
  KnowledgeContentType,
  TagResponse,
  ALLOWED_CONTENT_TYPES,
} from '../../services/knowledge';

// ============================================================================
// Types & Interfaces [FR-1, FR-2, FR-7, FR-8, NFR-3]
// ============================================================================

export interface SearchFiltersProps {
  /**
   * Current search query string.
   */
  searchQuery?: string;

  /**
   * Callback invoked when the search input value changes.
   */
  onSearchChange?: (query: string) => void;

  /**
   * Currently selected category identifier (ID or name).
   */
  selectedCategory?: string | null;

  /**
   * Callback invoked when a category is selected or deselected.
   */
  onCategoryChange?: (categoryId: string | null) => void;

  /**
   * Currently selected content type filter ('FAQ', 'Playbook', 'BestPractice', 'TrainingVideo').
   */
  selectedContentType?: KnowledgeContentType | null;

  /**
   * Callback invoked when a content type filter is selected or deselected.
   */
  onContentTypeChange?: (contentType: KnowledgeContentType | null) => void;

  /**
   * Array of selected tag identifiers or tag names.
   */
  selectedTags?: string[];

  /**
   * Callback invoked when a tag chip is toggled on or off.
   */
  onTagToggle?: (tagId: string) => void;

  /**
   * Callback invoked when resetting all active search query and filter parameters.
   */
  onClearFilters?: () => void;

  /**
   * List of available category options for filtering.
   */
  categories?: CategoryResponse[];

  /**
   * List of available tag options for filtering.
   */
  tags?: TagResponse[];

  /**
   * List of allowed content types. Defaults to ALLOWED_CONTENT_TYPES.
   */
  contentTypes?: readonly string[];

  /**
   * Loading state flag (disables inputs when true).
   */
  isLoading?: boolean;

  /**
   * Optional custom CSS class name to append to container.
   */
  className?: string;

  /**
   * Placeholder text for search input field.
   */
  placeholder?: string;
}

// ============================================================================
// SearchFilters Component [FR-1, FR-2, FR-7, FR-8, NFR-3]
// ============================================================================

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchQuery = '',
  onSearchChange,
  selectedCategory = null,
  onCategoryChange,
  selectedContentType = null,
  onContentTypeChange,
  selectedTags = [],
  onTagToggle,
  onClearFilters,
  categories = [],
  tags = [],
  contentTypes = ALLOWED_CONTENT_TYPES,
  isLoading = false,
  className,
  placeholder = 'Search articles by title, topic, content, or tag...',
}) => {
  // Count active filters
  const activeFiltersCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (selectedContentType ? 1 : 0) +
    selectedTags.length;

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange?.(e.target.value);
    },
    [onSearchChange]
  );

  const handleClearSearchInput = useCallback(() => {
    onSearchChange?.('');
  }, [onSearchChange]);

  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      onCategoryChange?.(categoryId);
    },
    [onCategoryChange]
  );

  const handleContentTypeSelect = useCallback(
    (ct: KnowledgeContentType | null) => {
      if (selectedContentType === ct) {
        onContentTypeChange?.(null);
      } else {
        onContentTypeChange?.(ct);
      }
    },
    [selectedContentType, onContentTypeChange]
  );

  const handleTagClick = useCallback(
    (tagId: string) => {
      onTagToggle?.(tagId);
    },
    [onTagToggle]
  );

  return (
    <div
      className={cn(
        'w-full space-y-4 rounded-lg border border-[#d1c4b9] bg-[#fbf9f4] p-4 shadow-sm text-[#1b1c19]',
        className
      )}
      data-testid="search-filters-container"
    >
      {/* Search Bar Input [FR-2, FR-8] */}
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#715a3f]">
          <Search className="h-5 w-5" aria-hidden="true" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchInputChange}
          disabled={isLoading}
          placeholder={placeholder}
          aria-label="Search knowledge base articles"
          className="w-full rounded-md border border-[#80756b] bg-[#ffffff] py-2.5 pl-10 pr-10 text-sm text-[#1b1c19] placeholder-[#80756b] transition-colors focus:border-[#59452b] focus:outline-none focus:ring-2 focus:ring-[#735c41]/30 disabled:opacity-50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearchInput}
            disabled={isLoading}
            aria-label="Clear search input query"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#80756b] hover:text-[#1b1c19] focus:outline-none focus:ring-2 focus:ring-[#735c41]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Content Type Filter Tabs/Chips [FR-7] */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#715a3f]">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Type:
        </span>
        <button
          type="button"
          onClick={() => handleContentTypeSelect(null)}
          disabled={isLoading}
          aria-pressed={selectedContentType === null}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#735c41]',
            selectedContentType === null
              ? 'bg-[#59452b] text-[#ffffff] shadow-sm'
              : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#eae8e3]'
          )}
        >
          All Types
        </button>
        {contentTypes.map((ct) => {
          const isSelected = selectedContentType?.toLowerCase() === ct.toLowerCase();
          return (
            <button
              key={ct}
              type="button"
              onClick={() => handleContentTypeSelect(ct as KnowledgeContentType)}
              disabled={isLoading}
              aria-pressed={isSelected}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#735c41]',
                isSelected
                  ? 'bg-[#59452b] text-[#ffffff] shadow-sm'
                  : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#eae8e3]'
              )}
            >
              {isSelected && <Check className="h-3 w-3" aria-hidden="true" />}
              {ct === 'BestPractice' ? 'Best Practice' : ct === 'TrainingVideo' ? 'Training Video' : ct}
            </button>
          );
        })}
      </div>

      {/* Categories & Active Filters Bar [FR-1, FR-7] */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-[#d1c4b9]">
        {/* Category Selector */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#715a3f]">
              <FolderIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Category:
            </span>
            <select
              value={selectedCategory || ''}
              onChange={(e) => handleCategorySelect(e.target.value || null)}
              disabled={isLoading}
              aria-label="Filter articles by category"
              className="rounded-md border border-[#80756b] bg-[#ffffff] px-2.5 py-1 text-xs font-medium text-[#1b1c19] focus:border-[#59452b] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Filters Action */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs text-[#4e453d]">
              {activeFiltersCount} active {activeFiltersCount === 1 ? 'filter' : 'filters'}
            </span>
            <button
              type="button"
              onClick={onClearFilters}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#a43b2c] hover:bg-[#ffdad6] focus:outline-none focus:ring-1 focus:ring-[#a43b2c]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Tag Filter Chips Section [FR-2, FR-7] */}
      {tags.length > 0 && (
        <div className="pt-2 border-t border-[#d1c4b9]">
          <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#715a3f]">
            <TagIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Tags:
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id) || selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagClick(tag.id)}
                  disabled={isLoading}
                  aria-pressed={isSelected}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#735c41]',
                    isSelected
                      ? 'bg-[#735c41] text-[#ffffff] shadow-sm'
                      : 'bg-[#eae8e3] text-[#4e453d] hover:bg-[#dbdad5]'
                  )}
                >
                  #{tag.name}
                  {isSelected && <X className="h-3 w-3 ml-0.5" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
