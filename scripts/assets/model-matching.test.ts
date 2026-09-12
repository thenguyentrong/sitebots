import { describe, expect, it } from 'vitest';
import { scorePath, tokens } from './model-matching';
describe('model identity in image discovery',()=>{
 it('matches punctuation and compact numbering',()=>{expect(tokens('TRON-1')).toEqual(tokens('TRON1'));expect(scorePath('https://maker.test/products/tron1',tokens('TRON-1'),'https://maker.test')).toBeGreaterThan(0)});
 it('does not cross robot generations',()=>{expect(scorePath('https://maker.test/products/tron2',tokens('TRON-1'),'https://maker.test')).toBe(0);expect(scorePath('https://maker.test/apollo/apollo-2',tokens('Apollo'),'https://maker.test')).toBe(0)});
 it('keeps single-letter variant suffixes',()=>{expect(scorePath('https://maker.test/R1',tokens('R1-D'),'https://maker.test')).toBe(0)});
});
