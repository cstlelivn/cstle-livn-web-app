import { describe, expect, it } from 'vitest';
import { mergeEntityById, removeEntityById } from './entityCache';

describe('shared entity cache operations', () => {
  it('merges a targeted update without replacing unrelated rows', () => {
    const rows = [
      { id: 'a', title: 'A', status: 'To Do' },
      { id: 'b', title: 'B', status: 'To Do' },
    ];
    expect(mergeEntityById(rows, { id: 'a', title: 'A', status: 'Completed' })).toEqual([
      { id: 'a', title: 'A', status: 'Completed' },
      rows[1],
    ]);
  });

  it('adds an inserted record exactly once', () => {
    const rows = [{ id: 'a', title: 'A' }];
    const inserted = { id: 'b', title: 'B' };
    expect(mergeEntityById(mergeEntityById(rows, inserted), inserted)).toEqual([rows[0], inserted]);
  });

  it('removes only the deleted or unauthorized record', () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    expect(removeEntityById(rows, 'a')).toEqual([{ id: 'b' }]);
  });

  it('supports optimistic rollback by merging the captured previous row', () => {
    const previous = { id: 'a', status: 'To Do', title: 'A' };
    const optimistic = mergeEntityById([previous], { ...previous, status: 'Completed' });
    expect(mergeEntityById(optimistic, previous)).toEqual([previous]);
  });
});
