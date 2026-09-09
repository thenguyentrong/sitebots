import { z } from 'zod';

/**
 * Contracts shared by the conversion scripts, the viewer and the tests.
 * Everything that ends up in data/models/*.json validates against these.
 */

/** Licences whose meshes we may rehost. Anything else never enters sources.json. */
export const ALLOWED_LICENSES = ['BSD-3-Clause', 'BSD-2-Clause', 'MIT', 'Apache-2.0'] as const;

export const ModelSource = z.object({
  /** "manufacturer/model" as used by the site. */
  robotKey: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/),
  /** Variants of that model this model applies to. */
  variants: z.array(z.string()).default(['base']),
  sourceId: z.string(),
  repo: z.string().regex(/^[^/]+\/[^/]+$/),
  sha: z.string().regex(/^[0-9a-f]{40}$/),
  /** Folder inside the repo that holds the description. */
  path: z.string(),
  /** URDF or xacro file, relative to `path`. */
  urdf: z.string(),
  format: z.enum(['urdf', 'xacro', 'mjcf']).default('urdf'),
  /** package name → repo path, for package:// mesh URIs and $(find). */
  packages: z.record(z.string(), z.string()).default({}),
  xacroArgs: z.record(z.string(), z.string()).default({}),
  /** Repo-relative folder that relative mesh paths are written against, when it is not the URDF's own folder (MuJoCo-style meshdir). */
  meshBase: z.string().optional(),
  license: z.enum(ALLOWED_LICENSES),
  licenseFile: z.string().default('LICENSE'),
  licenseUrl: z.url().optional(),
  copyright: z.string().optional(),
  /** Published standing height, for the scale guard. */
  heightM: z.number().positive(),
  /** Allowed relative deviation of the zero-pose model height from heightM. Quadruped URDFs stand on straight legs at zero, so they need more. */
  heightTolerance: z.number().min(0).max(1).default(0.15),
  /** Links to drop from the visual model (decorative, sensor housings, collision-only). */
  excludeLinks: z.array(z.string()).default([]),
  /** Triangle budget for the whole robot after decimation. */
  targetTriangles: z.number().int().positive().default(40000),
  /** Per-link colour overrides, link name → hex. */
  colors: z.record(z.string(), z.string()).default({}),
  /** URDF material name → hex, for repos that only say "dark" and "white". */
  materialColors: z.record(z.string(), z.string()).default({}),
});
export type ModelSource = z.infer<typeof ModelSource>;

export const SourcesFile = z.object({ robots: z.array(ModelSource) });

export const JointDef = z.object({
  name: z.string(),
  type: z.enum(['revolute', 'continuous', 'prismatic', 'fixed', 'floating', 'planar']),
  parent: z.string(),
  child: z.string(),
  /** glTF node name of the child link (URDF names sanitised the way three does). */
  childNode: z.string(),
  axis: z.tuple([z.number(), z.number(), z.number()]),
  lower: z.number().nullable(),
  upper: z.number().nullable(),
  origin: z.object({ xyz: z.tuple([z.number(), z.number(), z.number()]), rpy: z.tuple([z.number(), z.number(), z.number()]) }),
  mimic: z.object({ joint: z.string(), multiplier: z.number(), offset: z.number() }).nullable(),
});
export type JointDef = z.infer<typeof JointDef>;

export const JointsFile = z.object({
  robotKey: z.string(),
  upAxis: z.literal('Z'),
  rootNode: z.string(),
  heightM: z.number(),
  modelHeightM: z.number(),
  links: z.array(z.object({ name: z.string(), node: z.string() })),
  joints: z.array(JointDef),
});
export type JointsFile = z.infer<typeof JointsFile>;

export const Credits = z.object({
  robotKey: z.string(),
  source: z.object({ sourceId: z.string(), repo: z.string(), url: z.string(), sha: z.string(), path: z.string(), urdf: z.string() }),
  license: z.object({ spdx: z.string(), file: z.string(), copyright: z.string() }),
  modifications: z.array(z.string()),
  stats: z.object({ triangles: z.object({ before: z.number(), after: z.number() }), bytes: z.number(), links: z.number(), joints: z.number() }),
  generatedAt: z.string(),
});
export type Credits = z.infer<typeof Credits>;

export const ModelEntry = z.object({
  glbUrl: z.string(),
  hash: z.string(),
  bytes: z.number(),
  triangles: z.number(),
  heightM: z.number(),
  variants: z.array(z.string()),
  joints: JointsFile,
  credits: Credits,
});
export type ModelEntry = z.infer<typeof ModelEntry>;

export const IndexFile = z.object({
  generatedAt: z.string(),
  robots: z.record(z.string(), ModelEntry),
});
export type IndexFile = z.infer<typeof IndexFile>;

/** Poses: generic per form factor by semantic joint, overridden per robot by real joint name. */
export const PosesFile = z.object({
  _humanoid: z.record(z.string(), z.record(z.string(), z.number())).default({}),
  _quadruped: z.record(z.string(), z.record(z.string(), z.number())).default({}),
  robots: z
    .record(
      z.string(),
      z.object({
        family: z.enum(['humanoid', 'quadruped']).optional(),
        /** semantic name → real joint name, where the automatic derivation is wrong. */
        semantic: z.record(z.string(), z.string()).default({}),
        /** Joint values every preset builds on — e.g. shoulder roll for a model whose zero pose is a T-pose. */
        rest: z.record(z.string(), z.number()).default({}),
        /** Set by hand after looking at the render; solve-rest --write leaves it alone. */
        restLocked: z.boolean().optional(),
        presets: z.record(z.string(), z.record(z.string(), z.number())).default({}),
      }),
    )
    .default({}),
});
export type PosesFile = z.infer<typeof PosesFile>;
