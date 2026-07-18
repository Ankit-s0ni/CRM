import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];

const files = {
  androidGradle: read('apps/mobile/android/app/build.gradle.kts'),
  androidManifest: read('apps/mobile/android/app/src/main/AndroidManifest.xml'),
  androidActivity: read(
    'apps/mobile/android/app/src/main/kotlin/com/deltcrm/employee/MainActivity.kt',
  ),
  iosProject: read('apps/mobile/ios/Runner.xcodeproj/project.pbxproj'),
  iosInfo: read('apps/mobile/ios/Runner/Info.plist'),
  webManifest: read('apps/mobile/web/manifest.json'),
  webIndex: read('apps/mobile/web/index.html'),
  map: read(
    'apps/mobile/lib/features/tracking/presentation/widgets/tracking_map_card.dart',
  ),
};

requireText(files.androidGradle, 'namespace = "com.deltcrm.employee"', 'Android namespace');
requireText(files.androidGradle, 'applicationId = "com.deltcrm.employee"', 'Android application ID');
requireText(files.androidGradle, 'storeRelease && !releaseSigningConfigured', 'Android store signing fail-closed guard');
requireText(files.androidManifest, 'android:label="DeltCRM"', 'Android app label');
requireText(files.androidActivity, 'package com.deltcrm.employee', 'Android activity package');
requireText(files.iosProject, 'PRODUCT_BUNDLE_IDENTIFIER = com.deltcrm.employee;', 'iOS bundle ID');
requireText(files.iosInfo, '<string>DeltCRM</string>', 'iOS display name');
requireText(files.iosInfo, 'NSLocationAlwaysAndWhenInUseUsageDescription', 'iOS background-location disclosure');
requireText(files.iosInfo, 'NSCameraUsageDescription', 'iOS camera disclosure');
requireText(files.webManifest, '"name": "DeltCRM Employee"', 'Flutter web app name');
requireText(files.webIndex, '<title>DeltCRM Employee</title>', 'Flutter web title');
requireText(files.map, "userAgentPackageName: 'com.deltcrm.employee'", 'OpenStreetMap user agent');

if (existsSync(resolve(root, 'apps/mobile/android/app/src/main/kotlin/com/yourcompany'))) {
  failures.push('Placeholder Android package directory com/yourcompany still exists');
}

for (const [name, contents] of Object.entries(files)) {
  if (/com\.yourcompany|Indigo(?:HR|CRM)|hrms_attendance/.test(contents)) {
    failures.push(`${name} still contains placeholder or legacy product identity`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Mobile release identity and native permission disclosures passed.');
}

function read(path) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) {
    failures.push(`Missing release file: ${path}`);
    return '';
  }
  return readFileSync(absolute, 'utf8');
}

function requireText(contents, expected, label) {
  if (!contents.includes(expected)) failures.push(`${label} is missing or incorrect`);
}
