/**
 * AQUAINTEL TYPES DEFINITIONS
 * 
 * Re-exports shared API contracts and provides backward-compatible aliases
 * for frontend components.
 */

export * from "./types/api-contracts";

import {
  UserProfile,
  DiseaseRiskAssessment,
} from "./types/api-contracts";

export type User = UserProfile;
export type DiseasePredictionItem = DiseaseRiskAssessment;
