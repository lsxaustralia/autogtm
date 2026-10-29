import { useCallback, useRef, useState } from 'react';
import { Viewer } from './components/Viewer';
import { ColourPicker } from './components/ColourPicker';
import { DesignReadyModal } from './components/DesignReadyModal';
import type { ViewerHandle } from './three/Scene';
import type { NameLayout } from './three/ChristmasTree';
import {
  DEFAULT_LETTER_COLOUR,
  DEFAULT_NAMES,
  DEFAULT_TREE_COLOUR,
  LETTER_COLOURS,
  MAX_NAME_LENGTH,
  PRODUCT_PRICE,
  TREE_COLOURS,
  type LetterColourId,
  type TreeColourId,
} from './config/options';

declare global {
  interface Window {
    /** Exposes what the 3D scene actually rendered, for automated tests. */
    __treeDebug?: { names: NameLayout[] };
  }
}

const POSITIONS = ['Top banner', 'Middle banner', 'Bottom banner'];

export default function App() {
  const [names, setNames] = useState<[string, string, string]>([...DEFAULT_NAMES]);
  const [treeColour, setTreeColour] = useState<TreeColourId>(DEFAULT_TREE_COLOUR);
  const [letterColour, setLetterColour] = useState<LetterColourId>(DEFAULT_LETTER_COLOUR);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const viewer = useRef<ViewerHandle>(null);

  const setName = (i: number, value: string) =>
    setNames((prev) => {
      const next = [...prev] as [string, string, string];
      next[i] = value.slice(0, MAX_NAME_LENGTH);
      return next;
    });

  const resetPersonalisation = () => {
    setNames([...DEFAULT_NAMES]);
    setTreeColour(DEFAULT_TREE_COLOUR);
    setLetterColour(DEFAULT_LETTER_COLOUR);
  };

  const onNameLayout = useCallback((i: number, layout: NameLayout) => {
    const dbg = (window.__treeDebug ??= { names: [] });
    dbg.names[i] = layout;
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-cream-200/80 bg-cream-50/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-8">
          <a href="#" className="flex items-center gap-2.5" aria-label="Fir & Filament home">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
              <path d="M16 3l2.2 4.4H13.8z" fill="#c79a3c" />
              <path d="M16 7.5L7 26h18z" fill="#1a5640" />
              <rect x="14" y="26" width="4" height="3.5" rx="0.8" fill="#7a5230" />
            </svg>
            <span className="font-display text-lg font-semibold tracking-tight">Fir &amp; Filament</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-ink-700 md:flex">
            <span>Christmas</span>
            <span>Personalised gifts</span>
            <span>Our studio</span>
          </nav>
          <span className="rounded-full bg-brass-100 px-3 py-1 text-xs font-medium text-[#7a5a17]">Prototype</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-6 px-4 py-5 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,65fr)_minmax(360px,35fr)] lg:gap-10">
        <section className="h-[64svh] min-h-[380px] lg:sticky lg:top-6 lg:h-[calc(100vh-7.5rem)] lg:min-h-[560px]">
          <Viewer
            ref={viewer}
            names={names}
            treeColour={treeColour}
            letterColour={letterColour}
            onNameLayout={onNameLayout}
            onResetView={() => viewer.current?.resetView()}
            onZoom={(f) => viewer.current?.zoom(f)}
            onSpin={() => viewer.current?.spin()}
          />
        </section>

        <section className="lg:py-2" aria-labelledby="product-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine-700">Made to order · 3D printed</p>
          <h1 id="product-title" className="mt-3 font-display text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-[2.5rem]">
            Personalised Family Christmas Tree
          </h1>
          <p className="mt-3 text-[17px] text-ink-700">Create a Christmas decoration that's uniquely yours.</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-2xl font-semibold">{PRODUCT_PRICE}</span>
            <span className="flex items-center gap-1 text-sm text-ink-500">
              <span className="text-brass-500" aria-hidden>★★★★★</span> Loved by families
            </span>
          </div>

          <div className="mt-7 rounded-[24px] border border-cream-200 bg-white p-5 shadow-soft sm:p-6">
            <h2 className="font-display text-lg font-semibold">Personalise your tree</h2>
            <p className="mt-1 text-sm text-ink-500">Changes appear on the 3D preview as you type.</p>

            <div className="mt-5 space-y-4">
              {names.map((name, i) => (
                <div key={i}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <label htmlFor={`name-${i + 1}`} className="field-label">
                      Name {i + 1} <span className="font-normal text-ink-300">· {POSITIONS[i]}</span>
                    </label>
                    <span className={`text-xs tabular-nums ${name.length >= MAX_NAME_LENGTH ? 'text-berry-600' : 'text-ink-300'}`}>
                      {name.length}/{MAX_NAME_LENGTH}
                    </span>
                  </div>
                  <input
                    id={`name-${i + 1}`}
                    data-testid={`name-${i + 1}`}
                    type="text"
                    value={name}
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Enter a name"
                    onChange={(e) => setName(i, e.target.value)}
                    className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-[16px] text-ink-900 placeholder:text-ink-300 transition focus:border-pine-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pine-100"
                  />
                </div>
              ))}
            </div>

            <div className="mt-7 space-y-6 border-t border-cream-200 pt-6">
              <ColourPicker legend="Tree colour" name="tree-colour" options={TREE_COLOURS} value={treeColour} onChange={setTreeColour} />
              <ColourPicker legend="Lettering colour" name="letter-colour" options={LETTER_COLOURS} value={letterColour} onChange={setLetterColour} />
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-ink-500">Drag to rotate • Scroll to zoom</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className="pill-btn py-3" onClick={() => viewer.current?.resetView()}>
              Reset View
            </button>
            <button type="button" className="pill-btn py-3" onClick={resetPersonalisation} data-testid="reset-personalisation">
              Reset Personalisation
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSummaryOpen(true)}
            data-testid="design-ready"
            className="group mt-4 flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-pine-500 to-pine-700 py-4 text-[15px] font-semibold text-white shadow-lift transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100 active:scale-[0.99]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#e8c46a" aria-hidden className="transition group-hover:rotate-12">
              <path d="M12 2.5l2.7 6.2 6.8.6-5.2 4.5 1.6 6.6L12 16.9l-5.9 3.5 1.6-6.6-5.2-4.5 6.8-.6z" />
            </svg>
            Your Design Is Ready
          </button>

          <ul className="mt-8 grid grid-cols-3 gap-3 text-center text-xs text-ink-500">
            <li className="rounded-2xl bg-cream-50 px-2 py-3 ring-1 ring-cream-200">
              <span className="block text-sm font-semibold text-ink-900">18 cm</span>tall, freestanding
            </li>
            <li className="rounded-2xl bg-cream-50 px-2 py-3 ring-1 ring-cream-200">
              <span className="block text-sm font-semibold text-ink-900">Matte PLA</span>plant-based plastic
            </li>
            <li className="rounded-2xl bg-cream-50 px-2 py-3 ring-1 ring-cream-200">
              <span className="block text-sm font-semibold text-ink-900">Up to 12</span>letters per name
            </li>
          </ul>

          <p className="mt-6 text-sm leading-relaxed text-ink-500">
            Each tree is printed layer by layer in our studio, with three family names raised on ribbon banners and a
            silk-gold star on top. A keepsake to bring out every December.
          </p>
        </section>
      </main>

      <DesignReadyModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        names={names}
        treeColour={treeColour}
        letterColour={letterColour}
        price={PRODUCT_PRICE}
      />
    </div>
  );
}
