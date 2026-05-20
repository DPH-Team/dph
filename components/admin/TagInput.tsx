'use client';

import React, { useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TagInputProps {
  /** Name of the hidden input that carries the JSON-encoded tags array. */
  name: string;
  defaultValue?: string[];
  /** Suggestions for the datalist autocomplete. */
  suggestions?: string[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TagInput({ name, defaultValue = [], suggestions = [] }: TagInputProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [inputValue, setInputValue] = useState('');

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    if (tags.includes(value)) {
      setInputValue('');
      return;
    }
    setTags((prev) => [...prev, value]);
    setInputValue('');
  };

  const removeTag = (idx: number) => {
    setTags((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove the last tag on backspace when input is empty
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // If the user types a comma, commit the tag immediately
    if (v.endsWith(',')) {
      addTag(v.slice(0, -1));
    } else {
      setInputValue(v);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden input carries JSON-encoded tags for form submission */}
      <input type="hidden" name={name} value={JSON.stringify(tags)} />

      {/* Datalist for autocomplete */}
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions
            .filter((s) => !tags.includes(s))
            .map((s) => (
              <option key={s} value={s} />
            ))}
        </datalist>
      )}

      {/* Chip container + text input */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 min-h-10',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing tag chips */}
        {tags.map((tag, idx) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className="rounded-sm hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          list={suggestions.length > 0 ? listId : undefined}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? 'Add tags…' : ''}
          className={cn(
            'min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
          )}
          aria-label="Add tag"
        />
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Press Enter or comma to add a tag. Backspace removes the last tag.
      </p>
    </div>
  );
}
