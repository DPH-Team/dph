'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface PriceCentsInputProps {
  /** The react-hook-form field name that holds the raw cents integer. */
  name?: string;
  id?: string;
  'aria-describedby'?: string;
}

/**
 * PriceCentsInput — dollar-entry input that serializes to integer cents.
 *
 * Staff enters a dollar amount ("12.50"). The component stores the display
 * string locally and emits a hidden `<input name="priceCents">` with the
 * rounded integer cents value so the server action reads the correct integer.
 *
 * Uses useFormContext to pull the initial value (in cents) from react-hook-form
 * defaultValues. The field name defaults to "priceCents".
 *
 * On blur, normalizes to 2 decimal places; empty string becomes "0.00".
 */
export function PriceCentsInput({
  name = 'priceCents',
  id,
  'aria-describedby': ariaDescribedBy,
}: PriceCentsInputProps) {
  const { watch } = useFormContext();
  const rawCents: number = watch(name) ?? 0;

  // Initialise display from the form's default cents value.
  const [displayed, setDisplayed] = useState<string>(() => {
    const dollars = rawCents / 100;
    return dollars.toFixed(2);
  });

  const centsValue = Math.round(parseFloat(displayed || '0') * 100) || 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow digits, one dot, and up to 2 decimal places during typing.
    const val = e.target.value;
    if (/^[0-9]*\.?[0-9]{0,2}$/.test(val) || val === '') {
      setDisplayed(val);
    }
  }

  function handleBlur() {
    const parsed = parseFloat(displayed);
    if (isNaN(parsed) || displayed === '') {
      setDisplayed('0.00');
    } else {
      setDisplayed(parsed.toFixed(2));
    }
  }

  return (
    <div className="relative flex items-center">
      {/* Dollar prefix */}
      <span
        className="absolute left-3 text-sm text-muted-foreground select-none pointer-events-none"
        aria-hidden="true"
      >
        $
      </span>
      {/* Visible dollar input */}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        value={displayed}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'flex h-10 w-full rounded-lg border border-border bg-[oklch(0.175_0.002_286)] pl-7 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
        placeholder="0.00"
      />
      {/* Hidden input with integer cents for the server action */}
      <input
        type="hidden"
        name={name}
        value={String(centsValue)}
      />
    </div>
  );
}
