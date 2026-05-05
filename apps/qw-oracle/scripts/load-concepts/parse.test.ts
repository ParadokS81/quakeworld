// apps/qw-oracle/scripts/load-concepts/parse.test.ts
//
// Pure-function tests; no DB. Bun test runner.
import { describe, expect, test } from 'bun:test';
import { partitionRefs, extractBodyConceptLinks, parseConceptFile } from './parse.ts';

describe('partitionRefs', () => {
  test('cvar / command / macro 3-part refs go to entities', () => {
    const { entities, external } = partitionRefs([
      'ezquake:cvar:cl_bob',
      'ezquake:command:+fire',
      'ezquake:macro:dingus',
    ]);
    expect(entities).toEqual(['ezquake:cvar:cl_bob', 'ezquake:command:+fire', 'ezquake:macro:dingus']);
    expect(external).toEqual([]);
  });

  test('commit / pr / extension refs go to external', () => {
    const { entities, external } = partitionRefs([
      'ezquake:commit:7c328aa4',
      'ezquake:pr:1234',
      'ezquake:extension:fbsp',
    ]);
    expect(entities).toEqual([]);
    expect(external).toEqual(['ezquake:commit:7c328aa4', 'ezquake:pr:1234', 'ezquake:extension:fbsp']);
  });

  test('keyname / hud_element / ruleset / qw-namespace refs are entities (broader set than MCP user-surface)', () => {
    const { entities, external } = partitionRefs([
      'ezquake:keyname:F1',
      'ezquake:hud_element:fps',
      'ezquake:ruleset:smackdown',
      'qw:map:dm6',
    ]);
    expect(entities).toEqual(['ezquake:keyname:F1', 'ezquake:hud_element:fps', 'ezquake:ruleset:smackdown', 'qw:map:dm6']);
    expect(external).toEqual([]);
  });

  test('malformed refs (1-part, 2-part, empty segments) go to external', () => {
    const { entities, external } = partitionRefs([
      'just-a-name',
      'ezquake:cvar',
      ':cvar:foo',
      'ezquake::foo',
      'ezquake:cvar:',
    ]);
    expect(entities).toEqual([]);
    expect(external.length).toBe(5);
  });

  test('non-array input returns empty result', () => {
    expect(partitionRefs(undefined)).toEqual({ entities: [], external: [] });
    expect(partitionRefs('ezquake:cvar:cl_bob')).toEqual({ entities: [], external: [] });
    expect(partitionRefs(null)).toEqual({ entities: [], external: [] });
  });

  test('non-string array members are dropped', () => {
    const { entities, external } = partitionRefs([42, null, 'ezquake:cvar:cl_bob', undefined]);
    expect(entities).toEqual(['ezquake:cvar:cl_bob']);
    expect(external).toEqual([]);
  });
});

describe('extractBodyConceptLinks', () => {
  test('matches [text](concept-notes/<slug>.md) pattern', () => {
    const body = 'See [weapon scripts](concept-notes/weapon-scripts.md) for the full story.';
    expect(extractBodyConceptLinks(body)).toEqual(['weapon-scripts']);
  });

  test('matches sibling [text](<slug>.md) pattern', () => {
    const body = 'See [weapon scripts](weapon-scripts.md) for context.';
    expect(extractBodyConceptLinks(body)).toEqual(['weapon-scripts']);
  });

  test('deduplicates repeated links', () => {
    const body = '[a](x.md) and again [b](x.md) and finally [c](concept-notes/x.md).';
    expect(extractBodyConceptLinks(body)).toEqual(['x']);
  });

  test('ignores non-md links', () => {
    const body = '[outside](https://example.com) and [code](path/to/file.ts) and [readme](../README.md).';
    expect(extractBodyConceptLinks(body)).toEqual([]);
  });

  test('matches multiple distinct slugs', () => {
    const body = 'Read [a](concept-notes/alpha.md) and [b](beta.md).';
    expect(extractBodyConceptLinks(body).sort()).toEqual(['alpha', 'beta']);
  });

  test('matches [text](curated/concept-notes/<slug>.md) pattern', () => {
    const body = 'See [weapon scripts](curated/concept-notes/weapon-scripts.md) for the full story.';
    const links = extractBodyConceptLinks(body);
    expect(links).toEqual(['weapon-scripts']);
  });
});

describe('parseConceptFile', () => {
  test('returns null when frontmatter has no slug', async () => {
    const text = '---\ntitle: README\n---\n\n# Header\nbody';
    expect(await parseConceptFile(text)).toBeNull();
  });

  test('returns null when frontmatter has empty slug', async () => {
    const text = '---\ntitle: T\nslug: ""\n---\n\nbody';
    expect(await parseConceptFile(text)).toBeNull();
  });

  test('returns null when there is no frontmatter at all', async () => {
    expect(await parseConceptFile('# just a body')).toBeNull();
  });

  test('parses a complete note: slug, title, body, chunks, partitioned refs', async () => {
    const text = [
      '---',
      'slug: weapon-scripts',
      'title: Weapon scripts',
      'summary: Three methods.',
      'shape: domain-walkthrough',
      'related_entities:',
      '  - ezquake:cvar:cl_weaponpreselect',
      '  - ezquake:command:+fire',
      '  - ezquake:commit:7c328aa4',
      'related_concepts:',
      '  - lightning-gun-customization',
      '---',
      '',
      '# Weapon scripts',
      '',
      '## Summary',
      'short.',
      '',
      '## Methods',
      'three of them.',
    ].join('\n');

    const parsed = await parseConceptFile(text);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(parsed.slug).toBe('weapon-scripts');
    expect(parsed.title).toBe('Weapon scripts');
    expect(parsed.summary).toBe('Three methods.');
    expect(parsed.shape).toBe('domain-walkthrough');
    expect(parsed.relatedEntities).toEqual(['ezquake:cvar:cl_weaponpreselect', 'ezquake:command:+fire']);
    expect(parsed.externalRefs).toEqual(['ezquake:commit:7c328aa4']);
    expect(parsed.relatedConcepts).toEqual(['lightning-gun-customization']);
    expect(parsed.chunks.length).toBeGreaterThanOrEqual(2);  // lead-in + 2 sections (or 3 chunks total)
    expect(parsed.frontmatter.slug).toBe('weapon-scripts');
  });
});
