import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from '@/proxy';
import { LANG_COOKIE } from './config';

// The proxy decides which language an address shows. The CDN caches pages by URL, so the rules here are
// what keeps a German visitor from being served a cached English page, and the other way round.

const request = (path: string, headers: Record<string, string> = {}) => new NextRequest(new URL(path, 'https://sitebots.org'), { headers });
const rewrittenTo = (response: Response) => response.headers.get('x-middleware-rewrite');

describe('language routing', () => {
  it('shows an English browser the English page at the bare address', () => {
    const response = proxy(request('/robots?type=humanoid', { 'accept-language': 'en-GB,en;q=0.9' }));
    expect(response.status).toBe(200);
    expect(rewrittenTo(response)).toBe('https://sitebots.org/en/robots?type=humanoid');
  });

  it('rewrites the start page to the English root', () => {
    expect(rewrittenTo(proxy(request('/')))).toBe('https://sitebots.org/en');
  });

  it('gives a crawler without Accept-Language the English page', () => {
    const response = proxy(request('/market/caterpillar-cat-command-remote-control'));
    expect(rewrittenTo(response)).toBe('https://sitebots.org/en/market/caterpillar-cat-command-remote-control');
  });

  it('sends a German browser on its first visit to the German page, once, uncached', () => {
    const response = proxy(request('/use-cases?stage=pilot', { 'accept-language': 'de-DE,de;q=0.9,en;q=0.8' }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://sitebots.org/de/use-cases?stage=pilot');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toContain('Accept-Language');
    expect(proxy(request('/', { 'accept-language': 'de' })).headers.get('location')).toBe('https://sitebots.org/de');
  });

  it('keeps a German browser on English after the switch chose English', () => {
    const response = proxy(request('/robots', { 'accept-language': 'de-DE', cookie: `${LANG_COOKIE}=en` }));
    expect(response.status).toBe(200);
    expect(rewrittenTo(response)).toBe('https://sitebots.org/en/robots');
  });

  it('sends someone who chose German to the German page of an English link', () => {
    const response = proxy(request('/advisor?q=drill', { 'accept-language': 'en-US', cookie: `${LANG_COOKIE}=de` }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://sitebots.org/de/advisor?q=drill');
  });

  it('never moves a /de link, whatever the browser or the cookie say', () => {
    const response = proxy(request('/de/robots', { 'accept-language': 'en-US', cookie: `${LANG_COOKIE}=en` }));
    expect(response.status).toBe(200);
    expect(rewrittenTo(response)).toBeNull();
    expect(response.headers.get('location')).toBeNull();
  });

  it('sends the internal /en address back to the one English URL', () => {
    const response = proxy(request('/en/robots/unitree/g1?variant=edu'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://sitebots.org/robots/unitree/g1?variant=edu');
    expect(proxy(request('/en')).headers.get('location')).toBe('https://sitebots.org/');
  });

  it('does not run on route handlers, admin pages or files', () => {
    // Next compiles the matcher with path-to-regexp; as a plain anchored regex it selects the same paths.
    const matcher = new RegExp('^' + config.matcher[0] + '$');
    for (const path of ['/robots', '/', '/de', '/de/use-cases', '/market/x', '/apiary']) expect(matcher.test(path), path).toBe(true);
    for (const path of ['/api/chat', '/api', '/admin', '/admin/chats', '/_next/static/x.js', '/robots.txt', '/sitemap.xml', '/og.png', '/video/site-aerial.mp4', '/flags/DE.svg']) expect(matcher.test(path), path).toBe(false);
  });
});
