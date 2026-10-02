import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuyingPanel } from '@/components/robot/BuyingPanel';
import { expect, it } from 'vitest';
import { germanyBuyingRoutes, manufacturerSalesContact } from './purchasing';
import type { PriceCurrent } from './spec/types';
const price = (over: Partial<PriceCurrent>): PriceCurrent => ({robot_id:'robot',region:'DE',config:'base',amount:100,currency:'EUR',tier:2,direct:true,includes_vat:true,source_id:'quadruped.de',source_url:'https://www.quadruped.de/Unitree-G1_1',observed_at:'2026-09-13T00:00:00Z',stale:false,...over});

it('uses direct German/EU listings and never turns estimates into buying routes', () => {
 const routes = germanyBuyingRoutes('unitree','g1','base',[
  price({}), price({config:'edu'}), price({tier:3,source_url:'https://estimate.test/robot'}),
  price({direct:false,source_url:'https://copied.test/robot'}), price({region:'GLOBAL',source_url:'https://global.test/robot'}),
 ]);
 expect(routes).toHaveLength(1);
 expect(routes[0].configurations).toEqual(['base','edu']);
 expect(routes[0].contact?.email).toBe('info@quadruped.de');
});
it('keeps the indexed TRON 2 seller distinct from live prices and unrelated variants', () => {
 const routes = germanyBuyingRoutes('limx-dynamics','tron-2','base',[]);
 expect(routes).toHaveLength(1);
 expect(routes[0]).toMatchObject({region:'DE',indexed:true,eligibility:'Businesses, institutions and government agencies only.'});
 expect(germanyBuyingRoutes('limx-dynamics','tron-2','other-kit',[])).toEqual([]);
 expect(germanyBuyingRoutes('limx-dynamics','luna','base',[])).toEqual([]);
});

it('retains a form-only manufacturer inquiry without creating seller stock or empty contact links', () => {
  expect(manufacturerSalesContact('anybotics')).toMatchObject({
    contactUrl: 'https://www.anybotics.com/contact-sales/',
    email: '', phone: '', reviewedAt: '2026-10-01', verification: 'direct',
  });
  expect(germanyBuyingRoutes('anybotics', 'anymal', 'base', [])).toEqual([]);
  const html = renderToStaticMarkup(createElement(BuyingPanel, {
    manufacturer: 'anybotics', model: 'anymal', variant: 'base', prices: [],
  }));
  expect(html).toContain('https://www.anybotics.com/contact-sales/');
  expect(html).toContain('No Germany-specific seller listing has been checked');
  expect(html).not.toContain('href="mailto:');
  expect(html).not.toContain('href="tel:');
});

it('renders a reviewed phone-only business contact without an empty email link', () => {
  const prices = [price({ source_url: 'https://www.fanuc.eu/de-de/contacting-fanuc' })];
  const html = renderToStaticMarkup(createElement(BuyingPanel, {
    manufacturer: 'unreviewed-test-maker', model: 'test-model', variant: 'base', prices,
  }));
  expect(html).toContain('tel:+49715812820');
  expect(html).toContain('FANUC Deutschland GmbH');
  expect(html).not.toContain('href="mailto:');
  expect(html).not.toContain('href="tel:"');
});
