'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// ─── Context shape ────────────────────────────────────────────────────────────

interface BreadcrumbLabelsContextValue {
  labels: Record<string, string>;
  setLabel: (segment: string, label: string) => void;
  clearLabel: (segment: string) => void;
}

const BreadcrumbLabelsContext =
  createContext<BreadcrumbLabelsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BreadcrumbLabelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  const setLabel = useCallback((segment: string, label: string) => {
    setLabels((prev) => {
      // No-op if unchanged — prevents render loops when deps are stable.
      if (prev[segment] === label) return prev;
      return { ...prev, [segment]: label };
    });
  }, []);

  const clearLabel = useCallback((segment: string) => {
    setLabels((prev) => {
      if (!(segment in prev)) return prev;
      const next = { ...prev };
      delete next[segment];
      return next;
    });
  }, []);

  return (
    <BreadcrumbLabelsContext.Provider value={{ labels, setLabel, clearLabel }}>
      {children}
    </BreadcrumbLabelsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current segment→label map. If no provider is present, returns {}
 * so callers are safe to render anywhere without an explicit provider.
 */
export function useBreadcrumbLabels(): Record<string, string> {
  const ctx = useContext(BreadcrumbLabelsContext);
  return ctx?.labels ?? {};
}

// ─── Render-less registration helper ─────────────────────────────────────────

/**
 * Render this component (e.g. in a server page's JSX) to register a friendly
 * label for a URL segment such as a UUID. Cleans up on unmount.
 *
 * Example:
 *   <BreadcrumbLabel segment={sectionId} label={section.name} />
 */
export function BreadcrumbLabel({
  segment,
  label,
}: {
  segment: string;
  label: string;
}) {
  const ctx = useContext(BreadcrumbLabelsContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setLabel(segment, label);
    return () => {
      ctx.clearLabel(segment);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, label]);

  return null;
}
