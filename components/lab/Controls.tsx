'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * The heading of the group a control sits in.
 *
 * The control column reads perfectly with the layout in front of you and turns
 * to mush without it: a screen reader on the transform lab hears "slider x,
 * slider y, slider z, slider x, slider y, slider z, slider x, slider y, slider
 * z" and four buttons all called "Reset". The headings that disambiguate them —
 * Translate, Rotate, Scale — were presentational. This carries them into the
 * accessible names, so no lab has to repeat itself at sixteen call sites.
 */
const GroupContext = createContext<string | null>(null);

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
  const group = useContext(GroupContext);
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
        aria-label={group ? `${group} ${label}` : label}
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

/**
 * A radiogroup has to behave like one.
 *
 * This announced itself as `role="radiogroup"` while implementing none of the
 * pattern: every option was its own tab stop and the arrow keys did nothing, so
 * a screen-reader user told "radio group, 1 of 2" reached for the arrows and
 * got silence. Roving tabindex makes the group one stop; the arrows move and
 * choose, as they do in a native radio group.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  const group = useContext(GroupContext);
  const name = label ?? group ?? undefined;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const move = useCallback(
    (from: number, delta: number) => {
      const next = (from + delta + options.length) % options.length;
      onChange(options[next].value);
      buttons.current[next]?.focus();
    },
    [onChange, options],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const keys: Record<string, () => void> = {
        ArrowRight: () => move(index, 1),
        ArrowDown: () => move(index, 1),
        ArrowLeft: () => move(index, -1),
        ArrowUp: () => move(index, -1),
        Home: () => move(0, 0),
        End: () => move(options.length - 1, 0),
      };
      const handler = keys[event.key];
      if (!handler) return;
      event.preventDefault();
      handler();
    },
    [move, options.length],
  );

  return (
    <div>
      {label ? <div className="eyebrow mb-2">{label}</div> : null}
      <div
        role="radiogroup"
        aria-label={name}
        className="flex gap-1 rounded-lg border border-line bg-ink-800 p-1"
      >
        {options.map((option, index) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              tabIndex={active ? 0 : -1}
              onKeyDown={(event) => onKeyDown(event, index)}
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
  explains,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  /**
   * The id of a `ProseHeading` in this lab's essay that argues what this group
   * does. Leave it off a group no paragraph argues: a link to the nearest
   * heading teaches the reader that these links are guesses, which costs more
   * than the missing link does.
   */
  explains?: string;
}) {
  const headingId = useId();
  return (
    <GroupContext.Provider value={title}>
      <section role="group" aria-labelledby={headingId} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line pb-2">
          {/* The link is a sibling of the h3 rather than a child of it, because
              `aria-labelledby` names the group from that h3 — inside it, every
              slider in the group would be announced as "Normals under scale
              #normals x".

              Visible without hovering, unlike the `#` on a ProseHeading. That
              glyph appears on hover only, so a keyboard reader never learned
              the headings were links at all (todo/2026-09-08.md); repeating
              that in a sidebar, where the link is the only sign the essay
              explains any of this, would repeat the same loss. The global
              :focus-visible ring in globals.css covers the keyboard case. */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2">
            <h3 id={headingId} className="eyebrow">
              {title}
            </h3>
            {explains ? (
              <a
                href={`#${explains}`}
                aria-label={`Read the part of the essay that explains ${title}`}
                className="font-mono text-2xs tracking-wider text-fg-faint no-underline transition-colors hover:text-accent"
              >
                #{explains}
              </a>
            ) : null}
          </div>
          {action}
        </div>
        <div className="space-y-3">{children}</div>
      </section>
    </GroupContext.Provider>
  );
}

export interface Preset<T> {
  label: string;
  /** One sentence on what to look at once it is applied. */
  note: string;
  values: Partial<T>;
  /**
   * Set only on a preset whose render is deliberately incorrect — the
   * z-fighting, the lost highlight, the shader that will not compile. Absent
   * is the silent default, because most presets show something working.
   *
   * The note under the buttons arrives after the click and reads as
   * description; a reader one preset into a lab, looking at a shimmering seam,
   * has no way to tell the lesson from a broken page, and todo/2026-09-08.md
   * records a reader being invited to draw exactly that conclusion in the
   * texture lab. This says so on the button, before the click.
   */
  shows?: 'the failure';
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
  // Derived at render from the preset definitions, so nothing about the marker
  // is stored anywhere.
  const current = presets.find((preset) => preset.label === applied);

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
            {/* Amber because the reader has already met it as this site's "this
                one is awkward, look at it" colour on the WebGPU badge and the
                technologyReason bullet in LabPage. A dot carries nothing to a
                screen reader, so the warning is also said in words — otherwise
                the marker exists for sighted readers only. */}
            {preset.shows ? (
              <>
                <span className="mr-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber align-middle" />
                <span className="sr-only">Wrong on purpose: </span>
              </>
            ) : null}
            {preset.label}
          </button>
        ))}
      </div>
      {current ? (
        <p className="text-2xs leading-relaxed text-fg-faint">
          {current.shows ? (
            <>
              <span className="text-amber">
                Wrong on purpose. What you are about to see is the failure this lab
                is about, not a fault in the page.
              </span>{' '}
            </>
          ) : null}
          {current.note}
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
  // Four buttons all announced as "Reset" is four identical choices.
  const group = useContext(GroupContext);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={group ? `Reset ${group}` : undefined}
      className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
    >
      Reset
    </button>
  );
}
