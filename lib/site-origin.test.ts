import { describe, expect, it } from 'vitest';
import { siteOrigin } from './site-origin';
describe('public site origin', () => {
  it.each(['http://localhost:3000', 'http://127.0.0.1:3000', 'https://localhost', 'not a URL', 'javascript:alert(1)'])('never publishes %s in production metadata', value => {
    expect(siteOrigin(value, undefined, true)).toBe('https://sitebots.vercel.app');
  });
  it('uses a configured public domain and removes paths', () => expect(siteOrigin('https://robots.example/path/', 'fallback.vercel.app', true)).toBe('https://robots.example'));
  it('uses the Vercel production domain when SITE_URL is missing', () => expect(siteOrigin(undefined, 'project.vercel.app', true)).toBe('https://project.vercel.app'));
  it('keeps development on localhost', () => expect(siteOrigin()).toBe('http://localhost:3000'));
});
