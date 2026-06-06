// apps/qw-oracle/scripts/load-chat/thread-key.test.ts
import { describe, it, expect } from 'bun:test';
import { threadKey, batchScopeClause, RECONSTRUCTION_VERSION } from './thread-key.ts';

describe('threadKey', () => {
  it('produces colon-delimited key in stable field order', () => {
    const key = threadKey({
      channel: '#helpdesk',
      reconstructionVersion: 'fence-sonnet-v1',
      chunkId: 'helpdesk-001',
      threadIndex: 0,
    });
    expect(key).toBe('#helpdesk:fence-sonnet-v1:helpdesk-001:0');
  });

  it('embeds RECONSTRUCTION_VERSION correctly', () => {
    const key = threadKey({
      channel: '#qw',
      reconstructionVersion: RECONSTRUCTION_VERSION,
      chunkId: 'qw-007',
      threadIndex: 3,
    });
    expect(key).toBe(`#qw:${RECONSTRUCTION_VERSION}:qw-007:3`);
  });
});

describe('batchScopeClause', () => {
  it('is callable and returns a non-null value', () => {
    // We cannot instantiate a real Sql object without a live DB, so we pass a
    // tagged-template stub that records calls. This checks the function
    // signature is invocable; the postgres-js fragment structure is verified at
    // integration time by the actual loader.
    const fragments: string[] = [];
    const stubDb = Object.assign(
      (strings: TemplateStringsArray, ..._vals: unknown[]) => {
        fragments.push(strings.join('?'));
        return Symbol('fragment');
      },
      {},
    ) as unknown as Parameters<typeof batchScopeClause>[0];

    const result = batchScopeClause(stubDb, {
      channel: '#helpdesk',
      reconstructionVersion: RECONSTRUCTION_VERSION,
      rangeStart: '2024-01-01T00:00:00Z',
      rangeEnd:   '2025-01-01T00:00:00Z',
    });

    expect(result).toBeTruthy();
    expect(fragments.length).toBe(1);
  });
});
