/**
 * CRM lead "Service Type" options -- the company's real service structure,
 * not a loose bag of individual trade tasks. Order and grouping confirmed
 * explicitly by the business owner (August 2026): Commercial Renovation,
 * Residential Renovation, then Residential's own sub-services (Secondary
 * Suite Development, Kitchen Renovation, Bathroom Renovation, Basement
 * Development), then Finishing, then a catch-all Other. Shared by the Add
 * Lead form and the lead-edit Service Type field so the two can't drift
 * into two different lists again.
 */
export const SERVICE_TYPES = [
  "Commercial Renovation",
  "Residential Renovation",
  "Secondary Suite Development",
  "Kitchen Renovation",
  "Bathroom Renovation",
  "Basement Development",
  "Finishing",
  "Other",
];
