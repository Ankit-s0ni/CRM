import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/tenant/tenant_config.dart';

void main() {
  test('compares semantic app versions without lexicographic errors', () {
    expect(isVersionBelowMinimum('1.9.9', '1.10.0'), isTrue);
    expect(isVersionBelowMinimum('1.10.0+42', '1.10.0'), isFalse);
    expect(isVersionBelowMinimum('2.0.0', '1.99.99'), isFalse);
  });

  test('separates mandatory and recommended upgrades', () {
    const policy = MobileReleasePolicy(
      currentVersion: '1.4.0',
      minimumVersion: '1.4.0',
      recommendedVersion: '1.6.0',
    );

    expect(policy.updateRequired, isFalse);
    expect(policy.updateRecommended, isTrue);
  });
}
