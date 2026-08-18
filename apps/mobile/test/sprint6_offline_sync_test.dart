import 'dart:convert';
import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms_attendance/core/network/api_service.dart';
import 'package:hrms_attendance/core/network/authority_clients.dart';
import 'package:hrms_attendance/core/network/token_store.dart';
import 'package:hrms_attendance/core/session/mobile_identity_scope.dart';
import 'package:hrms_attendance/core/storage/mobile_queue_models.dart';
import 'package:hrms_attendance/core/storage/mobile_queue_repository.dart';
import 'package:hrms_attendance/core/storage/queue_secret_store.dart';
import 'package:hrms_attendance/features/sync/data/sync_api_repository.dart';
import 'package:hrms_attendance/features/tracking/data/tracking_api_repository.dart';
import 'package:isar_community/isar.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory directory;
  late Isar isar;
  late MobileQueueRepository queue;
  late FlutterSecureStorage storage;
  late QueueSecretStore secrets;

  setUpAll(() async {
    final configFile = File('.dart_tool/package_config.json').absolute;
    final config =
        jsonDecode(await configFile.readAsString()) as Map<String, dynamic>;
    final packages = config['packages'] as List<dynamic>;
    final entry = packages.cast<Map<String, dynamic>>().singleWhere(
      (package) => package['name'] == 'isar_community_flutter_libs',
    );
    final configuredRoot = Uri.parse(entry['rootUri'] as String);
    final root = configuredRoot.isAbsolute
        ? configuredRoot.replace(path: '${configuredRoot.path}/')
        : configFile.uri.resolve('${entry['rootUri'] as String}/');
    final library = root.resolve(
      Platform.isMacOS
          ? 'macos/libisar.dylib'
          : Platform.isLinux
          ? 'linux/libisar.so'
          : 'windows/libisar.dll',
    );
    await Isar.initializeIsarCore(
      libraries: {Abi.current(): library.toFilePath()},
    );
  });

  setUp(() async {
    FlutterSecureStorage.setMockInitialValues({});
    storage = const FlutterSecureStorage();
    secrets = QueueSecretStore(storage);
    directory = await Directory.systemTemp.createTemp('sprint6-isar-');
    isar = await Isar.open(
      [
        PendingAttendanceRecordSchema,
        PendingFieldPingBatchSchema,
        LocalFieldSessionSchema,
      ],
      directory: directory.path,
      name: 'sprint6_${DateTime.now().microsecondsSinceEpoch}',
    );
    queue = MobileQueueRepository(isar, testScope);
  });

  tearDown(() async {
    await isar.close(deleteFromDisk: true);
    if (await directory.exists()) await directory.delete(recursive: true);
  });

  test(
    'accepted replay is marked synced and removes its secure token',
    () async {
      final eventId = '019f7089-5b52-7065-b8b4-cc840bcfce46';
      final record = attendanceRecord(eventId);
      await queue.enqueueAttendance(record);
      await secrets.writeIntegrityToken(
        testScope.ownerKey,
        eventId,
        'secret-attestation',
      );
      final repository = SyncApiRepository(
        HrmsApiClient(
          api(storage, {
            'data': [
              {
                'clientEventUuid': eventId,
                'status': 'ACCEPTED',
                'code': 'SYNC_ACCEPTED',
              },
            ],
          }),
        ),
        queue,
        secrets,
      );

      await repository.replayPending();

      final stored = (await queue.attendanceRecords()).single;
      expect(stored.status, 'SYNCED');
      expect(stored.syncedAt, isNotNull);
      expect(stored.evidencePath, isNull);
      expect(
        await secrets.readIntegrityToken(testScope.ownerKey, eventId),
        isNull,
      );
    },
  );

  test(
    'permanent local rejection deletes retained evidence and token',
    () async {
      final eventId = '019f7089-5b52-7065-b8b4-cc840bcfce47';
      final evidence = File('${directory.path}/pending-evidence.jpg');
      await evidence.writeAsBytes([1, 2, 3], flush: true);
      final record = attendanceRecord(eventId)..evidencePath = evidence.path;
      await queue.enqueueAttendance(record);
      // Missing secure evidence is a permanent outcome before any HTTP call.
      final repository = SyncApiRepository(
        HrmsApiClient(api(storage, const {'data': []})),
        queue,
        secrets,
      );

      await repository.replayPending();

      final stored = (await queue.attendanceRecords()).single;
      expect(stored.status, 'REJECTED');
      expect(stored.errorCode, 'OFFLINE_INTEGRITY_MISSING');
      expect(stored.evidencePath, isNull);
      expect(await evidence.exists(), isFalse);
      expect(
        await secrets.readIntegrityToken(testScope.ownerKey, eventId),
        isNull,
      );
    },
  );

  test(
    'transport outage schedules retry and retains required evidence',
    () async {
      final eventId = '019f7089-5b52-7065-b8b4-cc840bcfce48';
      final record = attendanceRecord(eventId);
      await queue.enqueueAttendance(record);
      await secrets.writeIntegrityToken(
        testScope.ownerKey,
        eventId,
        'secret-attestation',
      );
      final repository = SyncApiRepository(
        HrmsApiClient(api(storage, null)),
        queue,
        secrets,
      );
      final before = DateTime.now();

      await repository.replayPending();

      final stored = (await queue.attendanceRecords()).single;
      expect(stored.status, 'RETRYABLE');
      expect(stored.attempts, 1);
      expect(stored.errorCode, 'SYNC_DEPENDENCY_UNAVAILABLE');
      expect(stored.nextAttemptAt.isAfter(before), isTrue);
      expect(
        await secrets.readIntegrityToken(testScope.ownerKey, eventId),
        'secret-attestation',
      );
    },
  );

  test('queue backoff is bounded', () {
    expect(queueBackoff(0), const Duration(seconds: 15));
    expect(queueBackoff(1), const Duration(seconds: 30));
    expect(queueBackoff(8), const Duration(seconds: 3600));
    expect(queueBackoff(50), const Duration(seconds: 3600));
  });

  test('queue reads cannot cross tenant or account scope', () async {
    final record = attendanceRecord('019f7089-5b52-7065-b8b4-cc840bcfce50');
    await queue.enqueueAttendance(record);
    final otherQueue = MobileQueueRepository(isar, otherScope);

    expect(await queue.attendanceRecords(), hasLength(1));
    expect(await otherQueue.attendanceRecords(), isEmpty);
    expect(() => otherQueue.saveAttendance(record), throwsA(isA<StateError>()));
  });

  test('legacy unscoped rows are quarantined and never replayed', () async {
    final now = DateTime.now().toUtc();
    final legacy = PendingAttendanceRecord()
      ..clientEventUuid = '019f7089-5b52-7065-b8b4-cc840bcfce51'
      ..scopedEventKey = 'legacy'
      ..tenantId = ''
      ..userId = ''
      ..membershipId = ''
      ..employeeId = ''
      ..deviceUuid = ''
      ..contractVersion = ''
      ..eventType = 'CHECKIN'
      ..payloadJson = '{}'
      ..createdAt = now
      ..nextAttemptAt = now;
    await isar.writeTxn(() => isar.pendingAttendanceRecords.put(legacy));

    await queue.quarantineLegacyRecords();

    final stored = await isar.pendingAttendanceRecords.get(legacy.id);
    expect(stored?.status, 'QUARANTINED');
    expect(stored?.errorCode, 'LEGACY_UNSCOPED_RECORD');
    expect(await queue.dueAttendance(), isEmpty);
  });

  test(
    'field ping flush reads outcomes from the response data envelope',
    () async {
      final batch = pingBatch('019f7089-5b52-7065-b8b4-cc840bcfce61');
      await queue.savePingBatch(batch);
      final repository = TrackingApiRepository(
        HrmsApiClient(
          api(storage, {
            'data': {
              'outcomes': [
                {
                  'clientPingUuid': '019f7089-5b52-7065-b8b4-cc840bcfce62',
                  'status': 'accepted',
                },
              ],
            },
          }),
        ),
        queue,
      );

      await repository.flushPending();

      expect(await queue.duePingBatches(), isEmpty);
    },
  );

  test('field ping flush preserves lower-case rejected outcomes', () async {
    final batch = pingBatch('019f7089-5b52-7065-b8b4-cc840bcfce63');
    await queue.savePingBatch(batch);
    final repository = TrackingApiRepository(
      HrmsApiClient(
        api(storage, {
          'data': {
            'outcomes': [
              {
                'clientPingUuid': '019f7089-5b52-7065-b8b4-cc840bcfce62',
                'status': 'rejected',
                'errorCode': 'FIELD_PING_INVALID',
              },
            ],
          },
        }),
      ),
      queue,
    );

    await repository.flushPending();

    final stored = await isar.pendingFieldPingBatchs.get(batch.id);
    expect(stored?.status, 'REJECTED');
    expect(stored?.errorCode, 'FIELD_PING_INVALID');
  });
}

PendingAttendanceRecord attendanceRecord(String eventId) {
  final now = DateTime.now().toUtc();
  return PendingAttendanceRecord()
    ..clientEventUuid = eventId
    ..scopedEventKey = '${testScope.ownerKey}|$eventId'
    ..tenantId = testScope.tenantId
    ..userId = testScope.userId
    ..membershipId = testScope.membershipId
    ..employeeId = testScope.employeeId
    ..deviceUuid = testScope.deviceUuid
    ..contractVersion = testScope.contractVersion
    ..eventType = 'CHECKIN'
    ..createdAt = now
    ..nextAttemptAt = now
    ..payloadJson = jsonEncode({
      'clientEventUuid': eventId,
      'type': 'CHECKIN',
      'deviceUuid': '019f7089-5b52-7065-b8b4-cc840bcfce49',
      'integrityIssuedAt': now
          .subtract(const Duration(minutes: 1))
          .toIso8601String(),
      'integrityExpiresAt': now
          .add(const Duration(minutes: 5))
          .toIso8601String(),
      'clientTime': now.toIso8601String(),
      'clientClockOffsetSeconds': 0,
      'latitude': 23.588,
      'longitude': 58.382,
      'accuracyMeters': 8,
    });
}

PendingFieldPingBatch pingBatch(String batchId) {
  final now = DateTime.now().toUtc();
  return PendingFieldPingBatch()
    ..batchUuid = batchId
    ..scopedBatchKey = '${testScope.ownerKey}|$batchId'
    ..tenantId = testScope.tenantId
    ..userId = testScope.userId
    ..membershipId = testScope.membershipId
    ..employeeId = testScope.employeeId
    ..contractVersion = testScope.contractVersion
    ..sessionId = '019f7089-5b52-7065-b8b4-cc840bcfce60'
    ..deviceUuid = testScope.deviceUuid
    ..itemsJson = jsonEncode([
      {
        'clientPingUuid': '019f7089-5b52-7065-b8b4-cc840bcfce62',
        'sessionId': '019f7089-5b52-7065-b8b4-cc840bcfce60',
        'latitude': 23.588,
        'longitude': 58.382,
        'accuracyM': 8,
        'isMock': false,
        'capturedAt': now.toIso8601String(),
        'isOfflineSync': false,
      },
    ])
    ..createdAt = now
    ..nextAttemptAt = now;
}

const testScope = MobileIdentityScope(
  tenantId: '10000000-0000-4000-8000-000000000001',
  userId: '20000000-0000-4000-8000-000000000001',
  membershipId: '20000000-0000-4000-8000-000000000002',
  employeeId: '30000000-0000-4000-8000-000000000001',
  deviceUuid: '019f7089-5b52-7065-b8b4-cc840bcfce49',
  contractVersion: '1.1.0',
);

const otherScope = MobileIdentityScope(
  tenantId: '10000000-0000-4000-8000-000000000099',
  userId: '20000000-0000-4000-8000-000000000099',
  membershipId: '20000000-0000-4000-8000-000000000098',
  employeeId: '30000000-0000-4000-8000-000000000099',
  deviceUuid: '019f7089-5b52-7065-b8b4-cc840bcfce99',
  contractVersion: '1.1.0',
);

ApiService api(FlutterSecureStorage storage, Map<String, dynamic>? response) {
  final dio = Dio()..httpClientAdapter = _SyncAdapter(response);
  return ApiService(
    TokenStore(storage),
    dio: dio,
    initialHrmsProductToken: 'test-hrms-product-token',
  );
}

class _SyncAdapter implements HttpClientAdapter {
  const _SyncAdapter(this.response);

  final Map<String, dynamic>? response;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final payload = response;
    if (payload == null) {
      throw DioException.connectionError(
        requestOptions: options,
        reason: 'offline',
      );
    }
    return ResponseBody.fromString(
      jsonEncode(payload),
      201,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
