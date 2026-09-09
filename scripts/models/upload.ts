import { head, put } from '@vercel/blob';
import type { ModelSource } from '@/lib/models/schemas';
import { modelSlug } from './fetch';

/**
 * GLBs live on Vercel Blob, never in /public: a dozen robots at a few MB each
 * would blow the deployment size cap and the 15,000-file limit. Content-hashed
 * names, cached for a year, immutable.
 */
export async function uploadModel(src: ModelSource, glb: Uint8Array, hash: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is not set; use --local for development');
  const pathname = `models/${modelSlug(src)}/${hash}.glb`;
  try {
    const existing = await head(pathname);
    if (existing) return existing.url;
  } catch {
    // not there yet
  }
  const res = await put(pathname, Buffer.from(glb), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'model/gltf-binary',
    cacheControlMaxAge: 31536000,
  });
  return res.url;
}
