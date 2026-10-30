import { useEffect, useRef } from 'react';
import { getLetterColour, getTreeColour, type LetterColourId, type TreeColourId } from '../config/options';

interface Props {
  open: boolean;
  onClose: () => void;
  names: [string, string, string];
  treeColour: TreeColourId;
  letterColour: LetterColourId;
  price: string;
}

export function DesignReadyModal({ open, onClose, names, treeColour, letterColour, price }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const tree = getTreeColour(treeColour);
  const letters = getLetterColour(letterColour);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="design-ready-title">
      <div className="animate-fade-in absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-fade-up relative w-full max-w-md rounded-t-[28px] bg-cream-50 p-7 shadow-lift sm:rounded-[28px]" data-testid="design-summary">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-pine-100 text-pine-700">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h2 id="design-ready-title" className="text-center font-display text-2xl font-semibold">
          Your design is ready
        </h2>
        <p className="mt-1 text-center text-sm text-ink-500">Here's a summary of your personalised tree.</p>

        <dl className="mt-6 divide-y divide-cream-200 rounded-2xl border border-cream-200 bg-white px-5">
          {names.map((n, i) => (
            <div key={i} className="flex items-center justify-between py-3 text-sm">
              <dt className="text-ink-500">Name {i + 1}</dt>
              <dd className="font-medium">{n.trim() || <span className="italic text-ink-300">Left blank</span>}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between py-3 text-sm">
            <dt className="text-ink-500">Colour 1 (tree)</dt>
            <dd className="flex items-center gap-2 font-medium">
              <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: tree.swatch }} />
              {tree.label}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3 text-sm">
            <dt className="text-ink-500">Colour 2 (names)</dt>
            <dd className="flex items-center gap-2 font-medium">
              <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: letters.swatch }} />
              {letters.label}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3 text-sm">
            <dt className="text-ink-500">Price</dt>
            <dd className="font-semibold">{price}</dd>
          </div>
        </dl>

        <p className="mt-4 text-center text-xs text-ink-500">
          This is a demonstration — no order has been placed and no payment was taken.
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-ink-900 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine-500 focus-visible:ring-offset-2"
        >
          Keep personalising
        </button>
      </div>
    </div>
  );
}
