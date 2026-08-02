import {
  missingRequiredOnboardingSteps,
  normalizePersistedOnboardingStep,
  resolveCurrentOnboardingStep,
  type OnboardingReadiness,
} from './workspace-onboarding.rules';

const ready: OnboardingReadiness = {
  company: true,
  organization: true,
  office: true,
  workingDays: true,
  attendancePolicy: true,
  hrInvite: true,
};

describe('workspace onboarding rules', () => {
  it.each([
    [1, 1],
    [2, 4],
    [3, 5],
    [4, 6],
  ])('maps legacy step %s to onboarding v2 step %s', (legacy, expected) => {
    expect(normalizePersistedOnboardingStep(legacy, 1)).toBe(expected);
  });

  it('keeps version 2 progress unchanged', () => {
    expect(normalizePersistedOnboardingStep(3, 2)).toBe(3);
    expect(normalizePersistedOnboardingStep(5, 2)).toBe(5);
    expect(normalizePersistedOnboardingStep(6, 2)).toBe(6);
  });

  it('bounds version 2 progress to the six-step contract', () => {
    expect(normalizePersistedOnboardingStep(0, 2)).toBe(1);
    expect(normalizePersistedOnboardingStep(7, 2)).toBe(6);
  });

  it('routes legacy progress to the earliest newly required step', () => {
    expect(
      resolveCurrentOnboardingStep(4, 1, {
        ...ready,
        organization: false,
        office: false,
      }),
    ).toBe(2);
    expect(
      resolveCurrentOnboardingStep(4, 1, { ...ready, office: false }),
    ).toBe(3);
  });

  it('returns missing required steps in wizard order', () => {
    expect(
      missingRequiredOnboardingSteps({
        ...ready,
        organization: false,
        attendancePolicy: false,
      }),
    ).toEqual(['organization', 'attendancePolicy']);
  });
});
