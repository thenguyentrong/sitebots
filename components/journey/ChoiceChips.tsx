'use client';

import { useId, type ReactNode } from 'react';
import { Icon } from './Icon';

export type Choice<T extends string> = { value: T; label: string; hint?: string; icon?: string };

/** One question: label and hint on the left, the answer on the right, a line underneath. */
export function Row({ label, hint, labelId, htmlFor, top = false, children }: { label: string; hint?: string; labelId?: string; htmlFor?: string; top?: boolean; children: ReactNode }) {
  return <div className={'jp-row' + (top ? ' is-top' : '')}>
    <div className="jp-row-label">
      {htmlFor ? <label id={labelId} htmlFor={htmlFor} className="jp-label">{label}</label> : <span id={labelId} className="jp-label">{label}</span>}
      {hint ? <span className="jp-hint">{hint}</span> : null}
    </div>
    <div className="jp-row-control">{children}</div>
  </div>;
}

/**
 * A question answered with one chip. `null` is "not sure" and gets a chip of
 * its own, so an unanswered question stays visible instead of hiding behind
 * a dropdown's first option. Clicking the active chip again clears it.
 */
export function ChoiceChips<T extends string>({ label, hint, value, choices, onChange, notSure = true, notSureLabel = 'Not sure', children }: {
  label: string; hint?: string; value: T | null; choices: Choice<T>[]; onChange: (value: T | null) => void; notSure?: boolean; notSureLabel?: string; children?: ReactNode;
}) {
  const id = useId();
  return <Row label={label} hint={hint} labelId={id}>
    <div className="chips" role="group" aria-labelledby={id}>
      {notSure ? <button type="button" className="is-unsure" aria-pressed={value === null} onClick={() => onChange(null)}>{notSureLabel}</button> : null}
      {choices.map((choice) => <button key={choice.value} type="button" aria-pressed={value === choice.value} title={choice.hint} onClick={() => onChange(value === choice.value && notSure ? null : choice.value)}>
        {choice.icon ? <Icon name={choice.icon} size={16} /> : null}{choice.label}
      </button>)}
    </div>
    {children}
  </Row>;
}

/** Several chips at once (goals, data limits). Checkboxes underneath, so keyboard and screen readers get real checkboxes. */
export function ChipChecks<T extends string>({ label, hint, values, choices, onToggle, max }: {
  label: string; hint?: string; values: T[]; choices: Choice<T>[]; onToggle: (value: T) => void; max?: number;
}) {
  const id = useId();
  return <Row label={label} hint={hint} labelId={id}>
    <div className="chips" role="group" aria-labelledby={id}>
      {choices.map((choice) => {
        const checked = values.includes(choice.value);
        return <label key={choice.value} title={choice.hint}>
          <input type="checkbox" checked={checked} disabled={Boolean(max) && !checked && values.length >= (max ?? 0)} onChange={() => onToggle(choice.value)} />
          {choice.icon ? <Icon name={choice.icon} size={16} /> : null}{choice.label}
        </label>;
      })}
    </div>
  </Row>;
}
