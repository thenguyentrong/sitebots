'use client';
import { useEffect, useId, useState, type ReactNode } from 'react';
import './RobotLandscape.css';
export function MakerOverview({ landscape, locations }: { landscape: ReactNode; locations: ReactNode }) {
  const [view, setView] = useState('robots');
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const id = useId();
  return <div className="mb-7">
    <div className="maker-overview-tabs" role="group" aria-label="Manufacturer overview"><button disabled={!ready} aria-pressed={view === 'robots'} aria-controls={id + '-robots'} onClick={() => setView('robots')}>Robot clusters</button><button disabled={!ready} aria-pressed={view === 'locations'} aria-controls={id + '-locations'} onClick={() => setView('locations')}>Manufacturer locations</button></div>
    <div id={id + '-robots'} hidden={view !== 'robots'}>{landscape}</div><div id={id + '-locations'} hidden={view !== 'locations'}>{locations}</div>
  </div>;
}