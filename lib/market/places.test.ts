import { describe, expect, it } from 'vitest';
import { COUNTRY_NAMES, loadPlaces, loadProjectMap, placeLabel, siteProjects } from './places';

// The project map places every pilot and daily use on a site job; new evidence needs its place.
describe('project map', () => {
  const places = loadPlaces();
  const map = loadProjectMap();

  it('knows where every proven site project is, or that its source names no place', () => {
    const missing = [...new Set(siteProjects().map((item) => item.where))].filter((where) => !(where in places));
    expect(missing, 'add these to data/market/places.json').toEqual([]);
  });

  it('accounts for every project once per place it names', () => {
    const placed = map.pins.reduce((sum, pin) => sum + pin.projects.length, 0) + map.unpinned.reduce((sum, row) => sum + row.projects.length, 0) + map.unnamed.length;
    const expected = siteProjects().reduce((sum, item) => sum + Math.max(1, places[item.where].length), 0);
    expect(placed).toBe(expected);
  });

  it('gives a short place for captions', () => {
    expect(placeLabel('Metzner Recycling with Volvo CE, demolition for the Siemens Technology Campus, Erlangen, Germany')).toBe('Erlangen, Germany');
    expect(placeLabel('Maler Damm GmbH, Germany')).toBe('Germany');
    expect(placeLabel('Malermeister Sachs (master painter)')).toBe('');
    expect(placeLabel(null)).toBe('');
  });

  it('draws every pin inside the Europe map and names every country', () => {
    const [x, y, w, h] = map.europe.viewBox;
    for (const pin of map.pins) {
      expect(pin.x, pin.town).toBeGreaterThanOrEqual(x);
      expect(pin.x, pin.town).toBeLessThanOrEqual(x + w);
      expect(pin.y, pin.town).toBeGreaterThanOrEqual(y);
      expect(pin.y, pin.town).toBeLessThanOrEqual(y + h);
    }
    for (const list of Object.values(places)) for (const place of list) expect(COUNTRY_NAMES[place.country], place.country).toBeTruthy();
  });
});
