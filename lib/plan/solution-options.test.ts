import { expect, it } from 'vitest';
import { OptionSchema, emptyCosts, formFactorFor, newProject, WorkspaceSchema } from './model';

const projectId = '00000000-0000-4000-8000-000000000001';
it('maps only unambiguous selected solution classes to a catalogue filter', () => {
  const project = newProject(projectId);
  expect(formFactorFor({ ...project, solutionClasses: ['amr_carts'] })).toBe('amr_agv');
  expect(formFactorFor({ ...project, solutionClasses: ['dedicated_machine'] })).toBe('dedicated_robot');
  expect(formFactorFor({ ...project, solutionClasses: ['fixed_cobot_cell'] })).toBe('any');
  expect(formFactorFor({ ...project, solutionClasses: ['humanoid', 'fixed_cobot_cell'] })).toBe('any');
  expect(formFactorFor({ ...project, solutionClasses: ['amr_carts', 'humanoid'] })).toBe('any');
  expect(formFactorFor({ ...project, focus: 'humanoid', solutionClasses: ['amr_carts'] })).toBe('humanoid');
});

it('round-trips reviewed solution identity and local detail link without granting robot fit', () => {
  const option = OptionSchema.parse({ id: 'reviewed-option', name: 'Configured cell', kind: 'custom', solutionReviewId: 'test-cell', href: '/solutions/test-cell', costs: emptyCosts() });
  const project = { ...newProject(projectId), options: [option] };
  const roundTrip = WorkspaceSchema.parse(JSON.parse(JSON.stringify({ version: 2, activeId: projectId, projects: [project] })));
  expect(roundTrip.projects[0].options[0]).toMatchObject({ solutionReviewId: 'test-cell', href: '/solutions/test-cell', kind: 'custom' });
  for (const patch of [{ href: 'https://example.com/solutions/test-cell' }, { href: '/solutions/../robots' }, { solutionReviewId: '../escape' }]) expect(OptionSchema.safeParse({ ...option, ...patch }).success).toBe(false);
  expect(OptionSchema.safeParse({ ...option, href: '/robots/unitree/g1?variant=edu' }).success).toBe(true);
});
