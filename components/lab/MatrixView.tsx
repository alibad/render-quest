'use client';

import { toRows, type Mat4 } from '@/lib/math/mat4';

/**
 * Column tints. In a column-major transform the first three columns are the
 * transformed basis vectors and the fourth is the translation — so tinting by
 * column is not decoration, it is the structure of the matrix.
 */
const COLUMN_CLASS = [
  'text-axis-x',
  'text-axis-y',
  'text-axis-z',
  'text-amber',
];

function format(value: number, precision: number): string {
  // Collapse -0 so the readout never flickers between "0.00" and "-0.00".
  const v = Object.is(value, -0) ? 0 : value;
  return v.toFixed(precision);
}

interface MatrixViewProps {
  matrix: Mat4;
  label?: string;
  caption?: string;
  precision?: number;
  /** Dim entries that still match the identity, to spotlight what changed. */
  highlightChanges?: boolean;
  className?: string;
}

/**
 * A 4x4 matrix in whiteboard (row) notation, fed straight from the
 * column-major array the GPU receives.
 */
export function MatrixView({
  matrix,
  label,
  caption,
  precision = 2,
  highlightChanges = true,
  className = '',
}: MatrixViewProps) {
  const rows = toRows(matrix);

  return (
    <figure className={className}>
      {label ? (
        <figcaption className="eyebrow mb-2">{label}</figcaption>
      ) : null}
      <div className="inline-flex items-stretch gap-1.5">
        <Bracket side="left" />
        <table className="tabular border-separate border-spacing-x-1 border-spacing-y-0.5 font-mono text-xs">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((value, colIndex) => {
                  const isIdentity = value === (rowIndex === colIndex ? 1 : 0);
                  const dim = highlightChanges && isIdentity;
                  return (
                    <td
                      key={colIndex}
                      className={`px-1 py-0.5 text-right tracking-tight transition-colors ${
                        dim ? 'text-fg-faint/60' : COLUMN_CLASS[colIndex]
                      }`}
                    >
                      {format(value, precision)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <Bracket side="right" />
      </div>
      {caption ? (
        <p className="mt-2 text-2xs leading-relaxed text-fg-faint">{caption}</p>
      ) : null}
    </figure>
  );
}

function Bracket({ side }: { side: 'left' | 'right' }) {
  return (
    <span
      aria-hidden
      className={`w-1.5 shrink-0 border-y border-line-strong ${
        side === 'left' ? 'border-l rounded-l-sm' : 'border-r rounded-r-sm'
      }`}
    />
  );
}

/**
 * Renders a product like `M = T · R · S`, so the reading order of a matrix
 * chain is visible next to the result it produces.
 */
export function MatrixProduct({
  factors,
  result,
  precision = 2,
}: {
  factors: { label: string; matrix: Mat4 }[];
  result: { label: string; matrix: Mat4 };
  precision?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        {factors.map((factor, index) => (
          <div key={factor.label} className="flex items-center gap-3">
            {index > 0 ? (
              <span aria-hidden className="font-mono text-sm text-fg-faint">
                ·
              </span>
            ) : null}
            <MatrixView
              matrix={factor.matrix}
              label={factor.label}
              precision={precision}
              className="min-w-[9.5rem]"
            />
          </div>
        ))}
      </div>
      <div className="border-t border-line pt-4">
        <MatrixView
          matrix={result.matrix}
          label={result.label}
          precision={precision}
          highlightChanges={false}
          className="min-w-[9.5rem]"
        />
      </div>
    </div>
  );
}
