import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(root, 'artifacts/release/sprint8-ga-evidence.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const allowIncomplete = process.argv.includes('--allow-incomplete');
const requiredGates = [
  'builds',
  'migrations',
  'billingJourney',
  'securityScans',
  'externalPenetrationTest',
  'managedBackupPitr',
  'retentionPartitions',
  'productionLikeLoad',
  'providerOutageDunning',
  'monitoringAlertReceipt',
  'privacyStoreApproval',
  'deploymentRollback',
];
const allowedStatuses = new Set(['PASS', 'PENDING', 'FAIL']);
const errors = [];
const pending = [];

for (const name of requiredGates) {
  const gate = manifest.gates?.[name];
  if (!gate) {
    errors.push(`Missing required gate: ${name}`);
    continue;
  }
  if (!allowedStatuses.has(gate.status)) {
    errors.push(`${name}: invalid status ${JSON.stringify(gate.status)}`);
  }
  if (!gate.owner?.trim()) errors.push(`${name}: owner is required`);
  if (!gate.summary?.trim()) errors.push(`${name}: summary is required`);
  if (gate.status === 'PASS') {
    if (!gate.completedAt || Number.isNaN(Date.parse(gate.completedAt))) {
      errors.push(`${name}: PASS requires a valid completedAt timestamp`);
    }
    if (!Array.isArray(gate.evidence) || gate.evidence.length === 0) {
      errors.push(`${name}: PASS requires at least one immutable evidence reference`);
    }
  } else {
    pending.push(`${name}=${gate.status}`);
  }
}

if (!manifest.release?.version || !manifest.release?.gitSha || !manifest.release?.environment) {
  pending.push('release identity is not frozen');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else if (pending.length && !allowIncomplete) {
  console.error(`GA evidence is incomplete:\n${pending.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(
    pending.length
      ? `GA evidence schema is valid; release remains blocked by ${pending.length} item(s).`
      : 'All Sprint 8 GA evidence gates passed.',
  );
}
