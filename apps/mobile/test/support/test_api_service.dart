import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hrms_attendance/core/network/api_service.dart';
import 'package:hrms_attendance/core/network/token_store.dart';

ApiService createTestApiService() {
  final dio = Dio()..httpClientAdapter = const _ImmediateAdapter();
  return ApiService(TokenStore(const FlutterSecureStorage()), dio: dio);
}

class _ImmediateAdapter implements HttpClientAdapter {
  const _ImmediateAdapter();

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => ResponseBody.fromString(
    jsonEncode(_payload(options.path)),
    200,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );

  @override
  void close({bool force = false}) {}
}

Object _payload(String path) {
  if (path == '/employees/me') {
    return {
      'data': {
        'fullName': 'Priya Sharma',
        'employeeCode': 'EMP-1024',
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
        'attendanceDate': 'Monday, 23 October 2023',
        'timezone': 'Muscat Corporate Office, Oman',
        'openAction': 'CHECKIN',
        'shift': {'name': 'Day Shift 9:00-18:00'},
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
    return [
      {
        'title': 'Punch reminder',
        'message': 'Your shift begins in 15 minutes.',
        'createdAt': '2026-07-17T04:45:00.000Z',
        'read': false,
      },
    ];
  }
  if (path == '/regularizations/me') {
    return [
      {
        'id': 'regularization-1',
        'requestDate': '2026-07-16',
        'status': 'PENDING',
        'reason': 'Missed check-out',
      },
    ];
  }
  return <String, dynamic>{};
}

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
