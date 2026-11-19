import { describe, expect, it } from 'vitest';
import { chooseLang, isLocalisable, localePath, preferredLang, splitLang } from './config';
import { formatEur, formatNumber, localiseFigure, regionName } from './format';

describe('the browser language', () => {
  it('takes German when the browser asks for it first', () => {
    expect(preferredLang('de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('de');
    expect(preferredLang('de')).toBe('de');
    expect(preferredLang('de-AT')).toBe('de');
  });

  it('takes English when English ranks first', () => {
    expect(preferredLang('en-US,en;q=0.9,de;q=0.8')).toBe('en');
    expect(preferredLang('en-GB')).toBe('en');
  });

  it('follows the q values, not the order they are written in', () => {
    expect(preferredLang('en;q=0.5,de;q=0.9')).toBe('de');
    expect(preferredLang('de;q=0.4,en;q=0.6')).toBe('en');
  });

  it('skips languages the site does not speak and uses the first one it does', () => {
    expect(preferredLang('fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7')).toBe('de');
    expect(preferredLang('fr-FR,nl;q=0.9')).toBe('en');
  });

  it('gives a crawler without Accept-Language, or one with nonsense, English', () => {
    expect(preferredLang(null)).toBe('en');
    expect(preferredLang('')).toBe('en');
    expect(preferredLang('*')).toBe('en');
    expect(preferredLang('de;q=0')).toBe('en');
  });

  it('lets the switch beat the browser, and ignores a cookie it did not write', () => {
    expect(chooseLang({ cookie: 'en', acceptLanguage: 'de-DE,de' })).toBe('en');
    expect(chooseLang({ cookie: 'de', acceptLanguage: 'en-US' })).toBe('de');
    expect(chooseLang({ cookie: 'fr', acceptLanguage: 'de-DE' })).toBe('de');
    expect(chooseLang({ cookie: undefined, acceptLanguage: undefined })).toBe('en');
  });
});

describe('page addresses', () => {
  it('keeps English on the bare path and puts German under /de', () => {
    expect(localePath('/', 'de')).toBe('/de');
    expect(localePath('/', 'en')).toBe('/');
    expect(localePath('/robots', 'de')).toBe('/de/robots');
    expect(localePath('/robots/unitree/g1', 'en')).toBe('/robots/unitree/g1');
  });

  it('keeps the query string and the section', () => {
    expect(localePath('/robots?type=humanoid#list', 'de')).toBe('/de/robots?type=humanoid#list');
    expect(localePath('/?q=drill', 'de')).toBe('/de?q=drill');
    expect(localePath('/use-cases#explore', 'en')).toBe('/use-cases#explore');
  });

  it('moves an address that already has a language to the asked one', () => {
    expect(localePath('/de/robots', 'en')).toBe('/robots');
    expect(localePath('/de', 'en')).toBe('/');
    expect(localePath('/de/robots', 'de')).toBe('/de/robots');
    expect(localePath('/en/advisor?signin=ok', 'de')).toBe('/de/advisor?signin=ok');
  });

  it('leaves route handlers, admin pages, files and other sites alone', () => {
    for (const href of ['/api/auth/signin/google?back=%2Fde', '/api/report?id=1', '/admin/chats', '/og.png', '/video/site-aerial.mp4', 'https://example.com/robots', '//cdn.example.com/x', '#specs', 'mailto:kontakt@sitebots.org']) {
      expect(localePath(href, 'de')).toBe(href);
    }
    expect(isLocalisable('/robots')).toBe(true);
    expect(isLocalisable('/sitemap.xml')).toBe(false);
  });

  it('does not take a path that only starts like a language for one', () => {
    expect(localePath('/design', 'de')).toBe('/de/design');
    expect(splitLang('/design')).toEqual({ lang: 'en', path: '/design', prefixed: false });
    expect(splitLang('/de')).toEqual({ lang: 'de', path: '/', prefixed: true });
    expect(splitLang('/de/robots/x')).toEqual({ lang: 'de', path: '/robots/x', prefixed: true });
    expect(splitLang('/en/robots')).toEqual({ lang: 'en', path: '/robots', prefixed: true });
  });
});

describe('numbers in each language', () => {
  it('groups and separates the way each language writes', () => {
    expect(formatNumber(206600, 'en')).toBe('206,600');
    expect(formatNumber(206600, 'de')).toBe('206.600');
    expect(formatNumber(2.58, 'de', 2)).toBe('2,58');
    expect(formatEur(23000, 'en')).toBe('€23,000');
    expect(formatEur(23000, 'de')).toBe('23.000 €');
    expect(formatEur(28.53, 'de', 2)).toBe('28,53 €');
  });

  it('rewrites figures stored the English way for German pages', () => {
    expect(localiseFigure('2.58', 'de')).toBe('2,58');
    expect(localiseFigure('200,000+', 'de')).toBe('200.000+');
    expect(localiseFigure('−30%', 'de')).toBe('−30 %');
    expect(localiseFigure('13,603', 'de')).toBe('13.603');
    expect(localiseFigure('2.58', 'en')).toBe('2.58');
  });

  it('names countries in the page language', () => {
    expect(regionName('DE', 'de')).toBe('Deutschland');
    expect(regionName('JP', 'en')).toBe('Japan');
    expect(regionName('SE', 'de')).toBe('Schweden');
  });
});
