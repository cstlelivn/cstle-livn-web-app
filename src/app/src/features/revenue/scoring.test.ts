import { describe, expect, it } from 'vitest';
import { scoreReginaBasementProjectFit } from './scoring';

describe('Regina basement Project Fit scoring', () => {
  it('classifies a ready, local, funded project as Hot', () => {
    expect(scoreReginaBasementProjectFit({ city: 'Regina', budgetRange: '$75,000+', timeline: '0–3 months', ownsProperty: true, financingReady: true, consultationRequested: true }).band).toBe('Hot');
  });
  it('keeps an early-stage local prospect in Nurture', () => {
    expect(scoreReginaBasementProjectFit({ city: 'Regina', budgetRange: '$35,000–$49,999', timeline: 'Researching' }).band).toBe('Nurture');
  });
  it('rejects prospects outside the active service area', () => {
    const result = scoreReginaBasementProjectFit({ city: 'Saskatoon', budgetRange: '$75,000+', timeline: '0–3 months' });
    expect(result).toMatchObject({ score: 0, band: 'Reject' });
  });
  it('honours explicit disqualifiers before positive signals', () => {
    expect(scoreReginaBasementProjectFit({ city: 'Regina', budgetRange: '$75,000+', timeline: '0–3 months', disqualifiers: ['No property owner authorization'] }).band).toBe('Reject');
  });
});
