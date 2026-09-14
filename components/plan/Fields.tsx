import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { ui } from '@/lib/ui';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const id = useId();
  const control = isValidElement(children) ? cloneElement(children as ReactElement<{ 'aria-labelledby'?: string; 'aria-describedby'?: string }>, { 'aria-labelledby': id, 'aria-describedby': hint ? id + '-hint' : undefined }) : children;
  return <label className="block min-w-0"><span id={id} className="mb-1.5 block text-sm font-medium">{label}</span>{control}{hint ? <span id={id + '-hint'} className="mt-1.5 block text-xs text-muted">{hint}</span> : null}</label>;
}
export function Notes({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string }) {
  return <Field label={label} hint={hint}><textarea className={ui.input + ' h-auto min-h-24 py-2.5'} rows={3} maxLength={4000} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></Field>;
}