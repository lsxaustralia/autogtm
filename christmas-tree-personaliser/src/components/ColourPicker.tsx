interface Option<T extends string> {
  id: T;
  label: string;
  swatch: string;
}

interface Props<T extends string> {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (id: T) => void;
  /** option that can't be picked right now */
  disabledId?: T;
  disabledHint?: string;
}

export function ColourPicker<T extends string>({ legend, name, options, value, onChange, disabledId, disabledHint }: Props<T>) {
  const selected = options.find((o) => o.id === value);
  return (
    <fieldset>
      <div className="mb-3 flex items-baseline justify-between">
        <legend className="field-label">{legend}</legend>
        <span className="text-[13px] text-ink-500">{selected?.label}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => {
          const active = o.id === value;
          const disabled = o.id === disabledId;
          return (
            <label
              key={o.id}
              className={`group relative grid h-11 w-11 place-items-center rounded-full transition ${
                active ? 'ring-2 ring-ink-900 ring-offset-2 ring-offset-white' : 'ring-1 ring-cream-300 hover:ring-ink-300'
              } ${disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}
              title={disabled && disabledHint ? `${o.label}: ${disabledHint}` : o.label}
            >
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={active}
                disabled={disabled}
                onChange={() => onChange(o.id)}
                className="peer sr-only"
                data-testid={`${name}-${o.id}`}
              />
              <span
                className="h-9 w-9 rounded-full shadow-[inset_0_-3px_6px_rgba(0,0,0,0.18),inset_0_2px_3px_rgba(255,255,255,0.35)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-pine-500"
                style={{ background: o.swatch }}
              />
              <span className="sr-only">{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
