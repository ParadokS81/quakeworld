// apps/qw-oracle/scripts/load-community/shared/iso-country.test.ts
import { describe, expect, test } from 'bun:test';
import { nationalityToIso, isoToNationality, countryToNationality } from './iso-country.ts';

describe('nationalityToIso', () => {
  test('Finnish -> fi', () => {
    expect(nationalityToIso('Finnish')).toBe('fi');
  });

  test('finnish -> fi (case-insensitive)', () => {
    expect(nationalityToIso('finnish')).toBe('fi');
  });

  test('Finland -> null (country name, not demonym)', () => {
    expect(nationalityToIso('Finland')).toBeNull();
  });

  test('Swedish -> se', () => {
    expect(nationalityToIso('Swedish')).toBe('se');
  });

  test('Danish -> dk', () => {
    expect(nationalityToIso('Danish')).toBe('dk');
  });

  test('Dutch -> nl', () => {
    expect(nationalityToIso('Dutch')).toBe('nl');
  });

  test('unknown nationality -> null', () => {
    expect(nationalityToIso('Atlantean')).toBeNull();
  });

  test('British -> gb', () => {
    expect(nationalityToIso('British')).toBe('gb');
  });

  test('Scottish -> gb (maps to United Kingdom code)', () => {
    expect(nationalityToIso('Scottish')).toBe('gb');
  });
});

describe('isoToNationality', () => {
  test('fi -> finnish', () => {
    expect(isoToNationality('fi')).toBe('finnish');
  });

  test('se -> swedish', () => {
    expect(isoToNationality('se')).toBe('swedish');
  });

  test('unknown iso -> null', () => {
    expect(isoToNationality('xx')).toBeNull();
  });
});

describe('countryToNationality', () => {
  test('Finland -> finnish', () => {
    expect(countryToNationality('Finland')).toBe('finnish');
  });

  test('USA -> american', () => {
    expect(countryToNationality('USA')).toBe('american');
  });

  test('Atlantis -> null', () => {
    expect(countryToNationality('Atlantis')).toBeNull();
  });

  test('finland (lowercase) -> finnish', () => {
    expect(countryToNationality('finland')).toBe('finnish');
  });

  test('Czechia -> czech', () => {
    expect(countryToNationality('Czechia')).toBe('czech');
  });

  test('Czech Republic -> czech', () => {
    expect(countryToNationality('Czech Republic')).toBe('czech');
  });
});
