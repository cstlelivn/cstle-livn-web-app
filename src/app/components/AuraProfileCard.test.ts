import { describe, expect, it } from 'vitest';
import { nextLevelSteps } from './AuraProfileCard';
import type { AuraProfile } from '../src/features/auraScoring/api';

const profile = (overrides: Partial<AuraProfile> = {}): AuraProfile => ({
  scoredTaskCount: 5, avgOverall: 3.5, avgQuality: 4.4, avgTiming: 3.2,
  avgReliability: 2.8, onTimeRate: 60, qcPassRate: 80, reworkRate: 20,
  recentAvg: 3.6, priorAvg: 3.4, level: 'Skilled', tasksUntilConfident: 0,
  ...overrides,
});

describe('Aura next-level guidance', () => {
  it('explains the remaining confidence sample', () => {
    expect(nextLevelSteps(profile({ scoredTaskCount: 2, tasksUntilConfident: 3, level: 'New Member' }))).toContain('3 more reviewed tasks');
  });
  it('targets the weakest transparent metric', () => {
    expect(nextLevelSteps(profile())).toContain('complete required updates, checklists and evidence');
  });
  it('does not imply an automatic employment decision', () => {
    expect(nextLevelSteps(profile())).not.toMatch(/pay|promotion|discipline|termination/i);
  });
});
