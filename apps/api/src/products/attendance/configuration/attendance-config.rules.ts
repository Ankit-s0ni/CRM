import { UnprocessableEntityException } from '@nestjs/common';
import { BlockList, isIP } from 'node:net';

export type PolicyCandidate<T> = {
  scope: 'EMPLOYEE' | 'DEPARTMENT' | 'TENANT_DEFAULT';
  value: T;
};

export function haversineMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function assertCoordinates(
  latitude: number,
  longitude: number,
  radiusMeters: number,
) {
  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    radiusMeters < 25 ||
    radiusMeters > 10_000
  ) {
    throw new UnprocessableEntityException({
      code: 'GEOFENCE_INVALID',
      message: 'Latitude, longitude, or circular geofence radius is invalid',
    });
  }
}

export function normalizeNetworkEntries(entries: string[] = []) {
  return [...new Set(entries.map((entry) => entry.trim()).filter(Boolean))].map(
    (entry) => {
      if (!isIpOrCidr(entry)) {
        throw new UnprocessableEntityException({
          code: 'OFFICE_NETWORK_INVALID',
          message: `Invalid IP or CIDR entry: ${entry}`,
        });
      }
      return entry;
    },
  );
}

export function networkIncludesAddress(entry: string, observedAddress: string) {
  const normalizedObserved = normalizeIpAddress(observedAddress);
  const [network, prefix, extra] = entry.split('/');
  if (extra !== undefined || !isIP(normalizedObserved)) return false;

  const normalizedNetwork = normalizeIpAddress(network);
  const family = isIP(normalizedNetwork);
  if (!family || isIP(normalizedObserved) !== family) return false;

  try {
    const blockList = new BlockList();
    if (prefix === undefined) {
      blockList.addAddress(normalizedNetwork, family === 4 ? 'ipv4' : 'ipv6');
    } else {
      const prefixLength = Number(prefix);
      if (
        !/^\d+$/.test(prefix) ||
        prefixLength < 0 ||
        prefixLength > (family === 4 ? 32 : 128)
      ) {
        return false;
      }
      blockList.addSubnet(
        normalizedNetwork,
        prefixLength,
        family === 4 ? 'ipv4' : 'ipv6',
      );
    }
    return blockList.check(normalizedObserved, family === 4 ? 'ipv4' : 'ipv6');
  } catch {
    return false;
  }
}

export function assertPolicyRules(policy: {
  lateAfterMinutes: number;
  halfDayAfterMinutes: number;
  minimumWorkMinutes: number;
  overtimeAfterMinutes: number;
  maxOfflineSyncHours: number;
  maxFaceAttempts: number;
  breakRules?: unknown;
}) {
  if (
    policy.lateAfterMinutes > policy.halfDayAfterMinutes ||
    policy.minimumWorkMinutes > policy.overtimeAfterMinutes ||
    policy.maxOfflineSyncHours < 0 ||
    policy.maxOfflineSyncHours > 168 ||
    policy.maxFaceAttempts < 1 ||
    policy.maxFaceAttempts > 10 ||
    (policy.breakRules !== undefined &&
      (!policy.breakRules ||
        Array.isArray(policy.breakRules) ||
        typeof policy.breakRules !== 'object'))
  ) {
    throw new UnprocessableEntityException({
      code: 'POLICY_RULES_INVALID',
      message: 'Attendance policy thresholds or break rules are contradictory',
    });
  }
}

export function isOvernightShift(startTime: string, endTime: string) {
  assertTime(startTime);
  assertTime(endTime);
  if (startTime === endTime) {
    throw new UnprocessableEntityException({
      code: 'SHIFT_TIME_INVALID',
      message: 'Shift start and end times must differ',
    });
  }
  return endTime < startTime;
}

export function resolvePolicy<T>(candidates: PolicyCandidate<T>[]) {
  return (
    candidates.find(({ scope }) => scope === 'EMPLOYEE') ??
    candidates.find(({ scope }) => scope === 'DEPARTMENT') ??
    candidates.find(({ scope }) => scope === 'TENANT_DEFAULT') ??
    null
  );
}

export function resolveShift<T>(input: {
  roster?: T | null;
  employeeDefault?: T | null;
  flexible?: T | null;
}) {
  if (input.roster) return { source: 'ROSTER' as const, value: input.roster };
  if (input.employeeDefault)
    return {
      source: 'EMPLOYEE_DEFAULT' as const,
      value: input.employeeDefault,
    };
  if (input.flexible)
    return { source: 'FLEXIBLE' as const, value: input.flexible };
  return null;
}

function assertTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new UnprocessableEntityException({
      code: 'SHIFT_TIME_INVALID',
      message: 'Shift times must use 24-hour HH:mm format',
    });
  }
}

function isIpOrCidr(value: string) {
  const [address, prefix, extra] = value.split('/');
  const family = isIP(normalizeIpAddress(address));
  if (!family || extra !== undefined) return false;
  return (
    prefix === undefined ||
    (/^\d+$/.test(prefix) &&
      Number(prefix) >= 0 &&
      Number(prefix) <= (family === 4 ? 32 : 128))
  );
}

function normalizeIpAddress(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('::ffff:') && isIP(trimmed.slice(7)) === 4
    ? trimmed.slice(7)
    : trimmed;
}
