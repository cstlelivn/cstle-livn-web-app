export type QualificationBand = 'Hot' | 'Warm' | 'Nurture' | 'Reject';

export interface ProjectFitAnswers {
  city?: string;
  budgetRange?: 'Under $35,000' | '$35,000–$49,999' | '$50,000–$74,999' | '$75,000+';
  timeline?: '0–3 months' | '3–6 months' | '6–12 months' | 'Researching';
  ownsProperty?: boolean;
  financingReady?: boolean;
  consultationRequested?: boolean;
  disqualifiers?: string[];
}
export interface ScoreResult {
  score: number;
  band: QualificationBand;
  reasons: string[];
}

const SERVICE_AREA = new Set(['regina', 'white city', 'emerald park', 'pilot butte', 'balgonie']);

export function scoreReginaBasementProjectFit(answers: ProjectFitAnswers): ScoreResult {
  const reasons: string[] = [];
  if (answers.disqualifiers?.length) {
    return { score: 0, band: 'Reject', reasons: answers.disqualifiers };
  }
  const city = answers.city?.trim().toLowerCase();
  if (city && !SERVICE_AREA.has(city)) {
    return { score: 0, band: 'Reject', reasons: ['Outside the current Regina service area'] };
  }

  let score = 0;
  if (city && SERVICE_AREA.has(city)) { score += 10; reasons.push('Inside service area'); }
  const budgetPoints = { 'Under $35,000': 0, '$35,000–$49,999': 15, '$50,000–$74,999': 25, '$75,000+': 30 } as const;
  score += answers.budgetRange ? budgetPoints[answers.budgetRange] : 0;
  if (answers.budgetRange === 'Under $35,000') reasons.push('Budget below current target');
  else if (answers.budgetRange) reasons.push(`Budget fit: ${answers.budgetRange}`);
  const timelinePoints = { '0–3 months': 25, '3–6 months': 18, '6–12 months': 10, Researching: 3 } as const;
  score += answers.timeline ? timelinePoints[answers.timeline] : 0;
  if (answers.timeline) reasons.push(`Timeline: ${answers.timeline}`);
  if (answers.ownsProperty) { score += 15; reasons.push('Property secured'); }
  if (answers.financingReady) { score += 10; reasons.push('Funding readiness confirmed'); }
  if (answers.consultationRequested) { score += 10; reasons.push('Consultation requested'); }
  score = Math.min(100, Math.max(0, score));
  const band: QualificationBand = score >= 75 ? 'Hot' : score >= 50 ? 'Warm' : score >= 25 ? 'Nurture' : 'Reject';
  return { score, band, reasons };
}
