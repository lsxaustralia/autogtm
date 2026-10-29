import { forwardRef, lazy, Suspense } from 'react';
import type { ViewerHandle } from '../three/Scene';
import type { NameLayout } from '../three/ChristmasTree';
import type { LetterColourId, TreeColourId } from '../config/options';

const Scene = lazy(() => import('../three/Scene').then((m) => ({ default: m.Scene })));

interface Props {
  names: [string, string, string];
  treeColour: TreeColourId;
  letterColour: LetterColourId;
  onNameLayout?: (index: number, layout: NameLayout) => void;
  onResetView: () => void;
  onZoom: (factor: number) => void;
  onSpin: () => void;
}

function Loader() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-cream-200 to-cream-300">
      <div className="flex flex-col items-center gap-3 text-ink-500">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-ink-300 border-t-pine-700" />
        <p className="text-sm">Preparing your 3D preview…</p>
      </div>
    </div>
  );
}

export const Viewer = forwardRef<ViewerHandle, Props>(function Viewer(
  { onResetView, onZoom, onSpin, ...sceneProps },
  ref,
) {
  return (
    <div
      className="viewer-surface relative h-full w-full overflow-hidden rounded-[28px] bg-cream-200 shadow-lift ring-1 ring-black/5"
      aria-label="Interactive 3D preview of your personalised Christmas tree"
      role="region"
    >
      <Suspense fallback={<Loader />}>
        <Scene ref={ref} {...sceneProps} />
      </Suspense>

      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-[12px] font-medium text-ink-700 shadow-soft backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pine-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-pine-500" />
        </span>
        Live 3D preview
      </div>

      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <button type="button" className="icon-btn" onClick={() => onZoom(0.8)} aria-label="Zoom in" title="Zoom in">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button type="button" className="icon-btn" onClick={() => onZoom(1.25)} aria-label="Zoom out" title="Zoom out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2 px-4">
        <button type="button" className="pill-btn" onClick={onSpin} data-testid="spin-360">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
          360° view
        </button>
        <button type="button" className="pill-btn" onClick={onResetView} data-testid="reset-view">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M3 12h3M18 12h3M12 3v3M12 18v3" />
          </svg>
          Reset View
        </button>
      </div>
    </div>
  );
});
