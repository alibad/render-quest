'use client';

import { useState, type ReactNode } from 'react';

type AxisTone = 'x' | 'y' | 'z' | 'neutral';

const TONE_CLASS: Record<AxisTone, string> = {
  x: 'text-axis-x',
  y: 'text-axis-y',
  z: 'text-axis-z',
  neutral: 'text-fg-muted',
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Decimal places in the readout. */
  precision?: number;
  tone?: AxisTone;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  unit = '',
  precision = 2,
  tone = 'neutral',
  onChange,
}: SliderProps) {
  return (
    <label className="block select-none">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-mono text-2xs uppercase tracking-wider ${TONE_CLASS[tone]}`}>
          {label}
        </span>
        <span className="tabular font-mono text-xs text-fg">
          {value.toFixed(precision)}
          {unit ? <span className="text-fg-faint">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
    </label>
  );
}

interface SegmentedProps<T extends string> {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div>
      {label ? <div className="eyebrow mb-2">{label}</div> : null}
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-1 rounded-lg border border-line bg-ink-800 p-1"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`flex-1 rounded-md px-3 py-1.5 font-mono text-2xs uppercase tracking-wider transition-colors ${
                active
                  ? 'bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgba(92,200,255,0.35)]'
                  : 'text-fg-faint hover:bg-ink-600 hover:text-fg-muted'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1 text-left"
    >
      <span className="font-mono text-2xs uppercase tracking-wider text-fg-muted">
        {label}
      </span>
      <span
        className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent/70' : 'bg-ink-500'
        }`}
      >
        <span
          className={`absolute top-[3px] h-3 w-3 rounded-full bg-fg transition-all ${
            checked ? 'left-[17px]' : 'left-[3px]'
          }`}
        />
      </span>
    </button>
  );
}

export function ControlGroup({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
        <h3 className="eyebrow">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export interface Preset<T> {
  label: string;
  /** One sentence on what to look at once it is applied. */
  note: string;
  values: Partial<T>;
}

/**
 * Named starting points.
 *
 * Every lab opens with nine to sixteen controls and no indication of which one
 * is worth moving. A preset is a saved state with a name — the cheap version of
 * a guided tour, needing no tour framework, and the note says what to look at
 * once it lands.
 */
export function Presets<T>({
  presets,
  onApply,
}: {
  presets: Preset<T>[];
  onApply: (values: Partial<T>) => void;
}) {
  const [applied, setApplied] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              onApply(preset.values);
              setApplied(preset.label);
            }}
            className={`rounded-md border px-2.5 py-1.5 text-left text-2xs transition-colors ${
              applied === preset.label
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {applied ? (
        <p className="text-2xs leading-relaxed text-fg-faint">
          {presets.find((preset) => preset.label === applied)?.note}
        </p>
      ) : (
        <p className="text-2xs leading-relaxed text-fg-faint">
          Not sure where to start? Any of these sets the controls to something worth
          looking at.
        </p>
      )}
    </div>
  );
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
    >
      Reset
    </button>
  );
}
