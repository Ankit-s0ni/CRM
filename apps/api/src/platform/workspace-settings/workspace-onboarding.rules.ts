export const ONBOARDING_VERSION = 2;
export const FINAL_ONBOARDING_STEP = 6;

export type OnboardingStepKey =
  | 'company'
  | 'organization'
  | 'office'
  | 'workingDays'
  | 'attendancePolicy'
  | 'hrInvite';

export type OnboardingReadiness = Record<OnboardingStepKey, boolean>;

export const REQUIRED_ONBOARDING_STEPS: ReadonlyArray<OnboardingStepKey> = [
  'company',
  'organization',
  'office',
  'workingDays',
  'attendancePolicy',
];

const STEP_ORDER: ReadonlyArray<OnboardingStepKey> = [
  ...REQUIRED_ONBOARDING_STEPS,
  'hrInvite',
];

export function normalizePersistedOnboardingStep(
  persistedStep: number | null | undefined,
  persistedVersion: number | null | undefined,
) {
  if ((persistedVersion ?? 1) >= ONBOARDING_VERSION) {
    return Math.min(Math.max(persistedStep ?? 1, 1), FINAL_ONBOARDING_STEP);
  }

  // Version 1: company, working days, attendance policy, invite HR.
  const step = Math.min(Math.max(persistedStep ?? 1, 1), 4);
  return [1, 1, 4, 5, 6][step] ?? 1;
}

export function resolveCurrentOnboardingStep(
  persistedStep: number | null | undefined,
  persistedVersion: number | null | undefined,
  readiness: OnboardingReadiness,
) {
  const normalized = normalizePersistedOnboardingStep(
    persistedStep,
    persistedVersion,
  );
  const firstIncomplete = REQUIRED_ONBOARDING_STEPS.findIndex(
    (key) => !readiness[key],
  );
  return firstIncomplete < 0
    ? normalized
    : Math.min(normalized, firstIncomplete + 1);
}

export function missingRequiredOnboardingSteps(readiness: OnboardingReadiness) {
  return REQUIRED_ONBOARDING_STEPS.filter((key) => !readiness[key]);
}

export function completedOnboardingSteps(readiness: OnboardingReadiness) {
  return STEP_ORDER.filter((key) => readiness[key]);
}
