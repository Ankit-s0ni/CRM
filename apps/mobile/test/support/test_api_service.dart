import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hrms_attendance/core/network/api_service.dart';
import 'package:hrms_attendance/core/network/token_store.dart';

ApiService createTestApiService({Map<String, dynamic>? runtime}) {
  final dio = Dio()..httpClientAdapter = _ImmediateAdapter(runtime);
  return ApiService(
    TokenStore(const FlutterSecureStorage()),
    dio: dio,
    refreshDio: dio,
  );
}

class _ImmediateAdapter implements HttpClientAdapter {
  const _ImmediateAdapter(this.runtime);

  final Map<String, dynamic>? runtime;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => ResponseBody.fromString(
    jsonEncode(_payload(options.path, runtime)),
    200,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );

  @override
  void close({bool force = false}) {}
}

Object _payload(String path, Map<String, dynamic>? runtime) {
  if (path == '/auth/refresh') {
    return {
      'accessToken': 'restored-access-token',
      'refreshToken': 'rotated-refresh-token',
    };
  }
  if (path == '/mobile/runtime-config') {
    return {'data': runtime ?? testRuntimeConfig()};
  }
  if (path == '/employees/me') {
    return {
      'data': {
        'fullName': 'Priya Sharma',
        'employeeCode': 'EMP-1024',
        'workType': 'OFFICE',
        'department': {'name': 'HR Operations'},
        'designation': {'name': 'Senior Associate'},
        'manager': {'fullName': 'Mariam Al Balushi'},
        'officeAssignments': [
          {
            'office': {'officeName': 'Muscat Corporate Office'},
          },
        ],
      },
    };
  }
  if (path == '/attendance/me/today') {
    return {
      'data': {
        'attendanceDate': '2026-07-19',
        'timezone': 'Asia/Muscat',
        'openAction': 'CHECKOUT',
        'shift': {
          'name': 'Day Shift',
          'startTime': '09:00',
          'endTime': '18:00',
        },
        'policy': {
          'name': 'Muscat Office Policy',
          'locationMode': 'OFFICE_GEOFENCE',
          'selfieMode': 'DISABLED',
          'requireRegisteredDevice': true,
        },
        'workplace': {'name': 'Muscat Corporate Office', 'radiusMeters': 150},
        'workOverview': {
          'workMinutes': 1890,
          'targetMinutes': 2400,
          'lateMinutes': 12,
          'overtimeMinutes': 45,
        },
        'nextHoliday': {'name': 'Renaissance Day', 'date': '2026-07-23'},
        'timeline': [
          {'eventType': 'CHECKIN', 'eventTime': '2026-07-19T05:10:00.000Z'},
        ],
      },
    };
  }
  if (path == '/attendance/me/history') {
    return {
      'data': [
        _history('2026-07-01', 'PRESENT', 480),
        _history('2026-07-02', 'LATE', 450),
        _history('2026-07-03', 'PRESENT', 505, overtime: 25),
        _history('2026-07-06', 'ABSENT', 0),
        _history('2026-07-07', 'ON_LEAVE', 0),
      ],
    };
  }
  if (path.startsWith('/attendance/me/day')) {
    return {
      'data': {
        'id': '40000000-0000-4000-8000-000000000001',
        'status': 'PRESENT',
        'isLocked': false,
        'totals': {'workMinutes': 480, 'breakMinutes': 45},
        'timeline': [
          {
            'eventType': 'CHECKIN',
            'eventTime': '2026-07-17T05:00:00.000Z',
            'source': 'MOBILE',
          },
          {
            'eventType': 'CHECKOUT',
            'eventTime': '2026-07-17T13:45:00.000Z',
            'source': 'MOBILE',
          },
        ],
      },
    };
  }
  if (path == '/devices/me') {
    return {
      'data': [
        {
          'deviceUuid': '7a9c-device-42f1',
          'deviceModel': 'Pixel 7',
          'status': 'ACTIVE',
          'platform': 'ANDROID',
          'osVersion': '15',
        },
      ],
    };
  }
  if (path == '/biometric-consents/me') return {'data': null};
  if (path == '/face-enrollments/me/status') {
    return {
      'data': {
        'consentActive': true,
        'enrolled': false,
        'version': null,
        'enrolledAt': null,
        'eligibleForFaceVerification': false,
      },
    };
  }
  if (path == '/notifications') {
    return {
      'data': [
        {
          'id': '70000000-0000-4000-8000-000000000001',
          'eventKey': 'attendance.shift_reminder',
          'title': 'Punch reminder',
          'body': 'Your shift begins in 15 minutes.',
          'createdAt': '2026-07-17T04:45:00.000Z',
          'isRead': false,
        },
      ],
    };
  }
  if (path == '/regularizations/me') {
    return {
      'data': [
        {
          'id': '50000000-0000-4000-8000-000000000001',
          'status': 'PENDING',
          'reason': 'Missed check-out',
          'createdAt': '2026-07-16T13:00:00.000Z',
          'attendanceLog': {'attendanceDate': '2026-07-16'},
        },
      ],
    };
  }
  if (path == '/leave-policies') return {'data': <Object>[]};
  if (path == '/leave-balances/me') return {'data': <Object>[]};
  if (path == '/leave-requests') return {'data': <Object>[]};
  return <String, dynamic>{};
}

Map<String, dynamic> testRuntimeConfig({
  String tenantId = '10000000-0000-4000-8000-000000000001',
  String tenantName = 'Acme Logistics',
  bool attendance = true,
  bool fieldTracking = false,
  bool regularization = true,
  bool leave = false,
  String locationMode = 'OFFICE_GEOFENCE',
  String selfieMode = 'DISABLED',
  bool deviceRequired = false,
}) => {
  'configVersion': 7,
  'product': {'name': 'DeltCRM', 'logoUrl': null},
  'release': {
    'minimumVersion': '1.0.0',
    'recommendedVersion': '1.0.0',
    'androidUpdateUrl':
        'https://play.google.com/store/apps/details?id=com.deltcrm.employee',
    'iosUpdateUrl': 'https://apps.apple.com/app/deltcrm/id000000000',
  },
  'tenant': {
    'id': tenantId,
    'name': tenantName,
    'logoUrl': null,
    'timezone': 'Asia/Dubai',
    'locale': 'en-AE',
  },
  'employee': {
    'id': '30000000-0000-4000-8000-000000000001',
    'displayName': 'Aisha Employee',
    'workType': fieldTracking ? 'FIELD' : 'OFFICE',
    'status': 'ACTIVE',
  },
  'modules': {
    'attendance': {'enabled': attendance},
    'fieldTracking': {'enabled': fieldTracking},
    'regularization': {'enabled': regularization},
  },
  'attendance': {
    'canPunch': attendance,
    'locationMode': locationMode,
    'selfieMode': selfieMode,
    'registeredDeviceRequired': deviceRequired,
    'integrityRequired': attendance,
    'maxOfflineSyncHours': 48,
    'leave': {
      'enabled': attendance,
      'policyCount': attendance && leave ? 1 : 0,
      'canRequest': attendance && leave,
    },
  },
  'fieldTracking': {
    'enabled': fieldTracking,
    'intervalMinutes': fieldTracking ? 15 : null,
  },
  'onboarding': {
    'deviceRegistrationRequired': deviceRequired,
    'deviceRegistrationComplete': !deviceRequired,
    'locationPermissionRequired': locationMode != 'NONE' || fieldTracking,
    'biometricConsentRequired': selfieMode == 'REQUIRED',
    'biometricConsentComplete': selfieMode != 'REQUIRED',
    'faceEnrollmentRequired': selfieMode == 'REQUIRED',
    'faceEnrollmentComplete': selfieMode != 'REQUIRED',
  },
};

Map<String, dynamic> _history(
  String date,
  String status,
  int workMinutes, {
  int overtime = 0,
}) => {
  'attendanceDate': date,
  'attendanceStatus': status,
  'totalWorkMinutes': workMinutes,
  'overtimeMinutes': overtime,
};
