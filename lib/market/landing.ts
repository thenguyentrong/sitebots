import { defaultJobId, loadJobDetail, loadJobMap, type JobDetail, type JobMapPoint } from './jobs';

// Server-side only. What the landing and the use-case page hand to the explorer.
export function explorerData(selected: string): { jobs: JobMapPoint[]; initialDetail: JobDetail | null; sold: { robots: number; machines: number } } {
  const { points, robots } = loadJobMap();
  const id = points.some((point) => point.id === selected) ? selected : defaultJobId(points);
  const orderable = robots.filter((robot) => robot.germany.status === 'buy_now' || robot.germany.status === 'quote');
  const machines = orderable.filter((robot) => robot.robotType === 'specialised').length;
  return { jobs: points, initialDetail: id ? loadJobDetail(id) : null, sold: { robots: orderable.length - machines, machines } };
}
