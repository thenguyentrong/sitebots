import { describe, expect, it } from 'vitest';
import { loadGraph } from './index';
import { graphView } from './view';

describe('graphView', () => {
  const graph = loadGraph();
  const view = graphView(graph);

  it('keeps every node and link', () => {
    expect(view.nodes).toHaveLength(graph.nodes.length);
    expect(view.edges).toHaveLength(graph.edges.length);
  });

  it('points links at real nodes', () => {
    expect(view.edges.every((edge) => view.nodes[edge.s] && view.nodes[edge.t])).toBe(true);
    const first = graph.edges[0];
    expect(view.nodes[view.edges[0].s].id).toBe(first.source);
    expect(view.nodes[view.edges[0].t].id).toBe(first.target);
  });

  it('finds a robot by its name in any case', () => {
    expect(view.nodes.find((node) => node.id === 'robot:unitree-b2')?.search).toContain('unitree');
  });
});
