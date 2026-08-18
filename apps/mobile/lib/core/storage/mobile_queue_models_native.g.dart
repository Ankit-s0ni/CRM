// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mobile_queue_models_native.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetPendingAttendanceRecordCollection on Isar {
  IsarCollection<PendingAttendanceRecord> get pendingAttendanceRecords =>
      this.collection();
}

const PendingAttendanceRecordSchema = CollectionSchema(
  name: r'PendingAttendanceRecord',
  id: -478346506189324155,
  properties: {
    r'attempts': PropertySchema(id: 0, name: r'attempts', type: IsarType.long),
    r'clientEventUuid': PropertySchema(
      id: 1,
      name: r'clientEventUuid',
      type: IsarType.string,
    ),
    r'contractVersion': PropertySchema(
      id: 2,
      name: r'contractVersion',
      type: IsarType.string,
    ),
    r'createdAt': PropertySchema(
      id: 3,
      name: r'createdAt',
      type: IsarType.dateTime,
    ),
    r'deviceUuid': PropertySchema(
      id: 4,
      name: r'deviceUuid',
      type: IsarType.string,
    ),
    r'employeeId': PropertySchema(
      id: 5,
      name: r'employeeId',
      type: IsarType.string,
    ),
    r'errorCode': PropertySchema(
      id: 6,
      name: r'errorCode',
      type: IsarType.string,
    ),
    r'eventType': PropertySchema(
      id: 7,
      name: r'eventType',
      type: IsarType.string,
    ),
    r'evidencePath': PropertySchema(
      id: 8,
      name: r'evidencePath',
      type: IsarType.string,
    ),
    r'membershipId': PropertySchema(
      id: 9,
      name: r'membershipId',
      type: IsarType.string,
    ),
    r'nextAttemptAt': PropertySchema(
      id: 10,
      name: r'nextAttemptAt',
      type: IsarType.dateTime,
    ),
    r'payloadJson': PropertySchema(
      id: 11,
      name: r'payloadJson',
      type: IsarType.string,
    ),
    r'regularizationSuggested': PropertySchema(
      id: 12,
      name: r'regularizationSuggested',
      type: IsarType.bool,
    ),
    r'scopedEventKey': PropertySchema(
      id: 13,
      name: r'scopedEventKey',
      type: IsarType.string,
    ),
    r'status': PropertySchema(id: 14, name: r'status', type: IsarType.string),
    r'syncedAt': PropertySchema(
      id: 15,
      name: r'syncedAt',
      type: IsarType.dateTime,
    ),
    r'tenantId': PropertySchema(
      id: 16,
      name: r'tenantId',
      type: IsarType.string,
    ),
    r'userId': PropertySchema(id: 17, name: r'userId', type: IsarType.string),
  },

  estimateSize: _pendingAttendanceRecordEstimateSize,
  serialize: _pendingAttendanceRecordSerialize,
  deserialize: _pendingAttendanceRecordDeserialize,
  deserializeProp: _pendingAttendanceRecordDeserializeProp,
  idName: r'id',
  indexes: {
    r'clientEventUuid': IndexSchema(
      id: -7420496049294097080,
      name: r'clientEventUuid',
      unique: false,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'clientEventUuid',
          type: IndexType.hash,
          caseSensitive: true,
        ),
      ],
    ),
    r'scopedEventKey': IndexSchema(
      id: 6248883252180158081,
      name: r'scopedEventKey',
      unique: true,
      replace: true,
      properties: [
        IndexPropertySchema(
          name: r'scopedEventKey',
          type: IndexType.hash,
          caseSensitive: true,
        ),
      ],
    ),
  },
  links: {},
  embeddedSchemas: {},

  getId: _pendingAttendanceRecordGetId,
  getLinks: _pendingAttendanceRecordGetLinks,
  attach: _pendingAttendanceRecordAttach,
  version: '3.3.2',
);

int _pendingAttendanceRecordEstimateSize(
  PendingAttendanceRecord object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.clientEventUuid.length * 3;
  bytesCount += 3 + object.contractVersion.length * 3;
  bytesCount += 3 + object.deviceUuid.length * 3;
  bytesCount += 3 + object.employeeId.length * 3;
  {
    final value = object.errorCode;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  bytesCount += 3 + object.eventType.length * 3;
  {
    final value = object.evidencePath;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  bytesCount += 3 + object.membershipId.length * 3;
  bytesCount += 3 + object.payloadJson.length * 3;
  bytesCount += 3 + object.scopedEventKey.length * 3;
  bytesCount += 3 + object.status.length * 3;
  bytesCount += 3 + object.tenantId.length * 3;
  bytesCount += 3 + object.userId.length * 3;
  return bytesCount;
}

void _pendingAttendanceRecordSerialize(
  PendingAttendanceRecord object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeLong(offsets[0], object.attempts);
  writer.writeString(offsets[1], object.clientEventUuid);
  writer.writeString(offsets[2], object.contractVersion);
  writer.writeDateTime(offsets[3], object.createdAt);
  writer.writeString(offsets[4], object.deviceUuid);
  writer.writeString(offsets[5], object.employeeId);
  writer.writeString(offsets[6], object.errorCode);
  writer.writeString(offsets[7], object.eventType);
  writer.writeString(offsets[8], object.evidencePath);
  writer.writeString(offsets[9], object.membershipId);
  writer.writeDateTime(offsets[10], object.nextAttemptAt);
  writer.writeString(offsets[11], object.payloadJson);
  writer.writeBool(offsets[12], object.regularizationSuggested);
  writer.writeString(offsets[13], object.scopedEventKey);
  writer.writeString(offsets[14], object.status);
  writer.writeDateTime(offsets[15], object.syncedAt);
  writer.writeString(offsets[16], object.tenantId);
  writer.writeString(offsets[17], object.userId);
}

PendingAttendanceRecord _pendingAttendanceRecordDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = PendingAttendanceRecord();
  object.attempts = reader.readLong(offsets[0]);
  object.clientEventUuid = reader.readString(offsets[1]);
  object.contractVersion = reader.readString(offsets[2]);
  object.createdAt = reader.readDateTime(offsets[3]);
  object.deviceUuid = reader.readString(offsets[4]);
  object.employeeId = reader.readString(offsets[5]);
  object.errorCode = reader.readStringOrNull(offsets[6]);
  object.eventType = reader.readString(offsets[7]);
  object.evidencePath = reader.readStringOrNull(offsets[8]);
  object.id = id;
  object.membershipId = reader.readString(offsets[9]);
  object.nextAttemptAt = reader.readDateTime(offsets[10]);
  object.payloadJson = reader.readString(offsets[11]);
  object.regularizationSuggested = reader.readBool(offsets[12]);
  object.scopedEventKey = reader.readString(offsets[13]);
  object.status = reader.readString(offsets[14]);
  object.syncedAt = reader.readDateTimeOrNull(offsets[15]);
  object.tenantId = reader.readString(offsets[16]);
  object.userId = reader.readString(offsets[17]);
  return object;
}

P _pendingAttendanceRecordDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readLong(offset)) as P;
    case 1:
      return (reader.readString(offset)) as P;
    case 2:
      return (reader.readString(offset)) as P;
    case 3:
      return (reader.readDateTime(offset)) as P;
    case 4:
      return (reader.readString(offset)) as P;
    case 5:
      return (reader.readString(offset)) as P;
    case 6:
      return (reader.readStringOrNull(offset)) as P;
    case 7:
      return (reader.readString(offset)) as P;
    case 8:
      return (reader.readStringOrNull(offset)) as P;
    case 9:
      return (reader.readString(offset)) as P;
    case 10:
      return (reader.readDateTime(offset)) as P;
    case 11:
      return (reader.readString(offset)) as P;
    case 12:
      return (reader.readBool(offset)) as P;
    case 13:
      return (reader.readString(offset)) as P;
    case 14:
      return (reader.readString(offset)) as P;
    case 15:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 16:
      return (reader.readString(offset)) as P;
    case 17:
      return (reader.readString(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _pendingAttendanceRecordGetId(PendingAttendanceRecord object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _pendingAttendanceRecordGetLinks(
  PendingAttendanceRecord object,
) {
  return [];
}

void _pendingAttendanceRecordAttach(
  IsarCollection<dynamic> col,
  Id id,
  PendingAttendanceRecord object,
) {
  object.id = id;
}

extension PendingAttendanceRecordByIndex
    on IsarCollection<PendingAttendanceRecord> {
  Future<PendingAttendanceRecord?> getByScopedEventKey(String scopedEventKey) {
    return getByIndex(r'scopedEventKey', [scopedEventKey]);
  }

  PendingAttendanceRecord? getByScopedEventKeySync(String scopedEventKey) {
    return getByIndexSync(r'scopedEventKey', [scopedEventKey]);
  }

  Future<bool> deleteByScopedEventKey(String scopedEventKey) {
    return deleteByIndex(r'scopedEventKey', [scopedEventKey]);
  }

  bool deleteByScopedEventKeySync(String scopedEventKey) {
    return deleteByIndexSync(r'scopedEventKey', [scopedEventKey]);
  }

  Future<List<PendingAttendanceRecord?>> getAllByScopedEventKey(
    List<String> scopedEventKeyValues,
  ) {
    final values = scopedEventKeyValues.map((e) => [e]).toList();
    return getAllByIndex(r'scopedEventKey', values);
  }

  List<PendingAttendanceRecord?> getAllByScopedEventKeySync(
    List<String> scopedEventKeyValues,
  ) {
    final values = scopedEventKeyValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'scopedEventKey', values);
  }

  Future<int> deleteAllByScopedEventKey(List<String> scopedEventKeyValues) {
    final values = scopedEventKeyValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'scopedEventKey', values);
  }

  int deleteAllByScopedEventKeySync(List<String> scopedEventKeyValues) {
    final values = scopedEventKeyValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'scopedEventKey', values);
  }

  Future<Id> putByScopedEventKey(PendingAttendanceRecord object) {
    return putByIndex(r'scopedEventKey', object);
  }

  Id putByScopedEventKeySync(
    PendingAttendanceRecord object, {
    bool saveLinks = true,
  }) {
    return putByIndexSync(r'scopedEventKey', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByScopedEventKey(
    List<PendingAttendanceRecord> objects,
  ) {
    return putAllByIndex(r'scopedEventKey', objects);
  }

  List<Id> putAllByScopedEventKeySync(
    List<PendingAttendanceRecord> objects, {
    bool saveLinks = true,
  }) {
    return putAllByIndexSync(r'scopedEventKey', objects, saveLinks: saveLinks);
  }
}

extension PendingAttendanceRecordQueryWhereSort
    on QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QWhere> {
  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterWhere>
  anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension PendingAttendanceRecordQueryWhere
    on
        QueryBuilder<
          PendingAttendanceRecord,
          PendingAttendanceRecord,
          QWhereClause
        > {
  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterWhereClause
  >
  idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(lower: id, upper: id));
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterWhereClause
  >
  idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterWhereClause
  >
  idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterWhereClause
  >
  idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterWhereClause
  >
  idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.between(
          lower: lowerId,
          includeLower: includeLower,
          upper: upperId,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterWhereClause
  >
  clientEventUuidEqualTo(String clientEventUuid) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IndexWhereClause.equalTo(
          indexName: r'clientEventUuid',
          value: [clientEventUuid],
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterWhereClause
  >
  clientEventUuidNotEqualTo(String clientEventUuid) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'clientEventUuid',
                lower: [],
                upper: [clientEventUuid],
                includeUpper: false,
              ),
            )
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'clientEventUuid',
                lower: [clientEventUuid],
                includeLower: false,
                upper: [],
              ),
            );
      } else {
        return query
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'clientEventUuid',
                lower: [clientEventUuid],
                includeLower: false,
                upper: [],
              ),
            )
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'clientEventUuid',
                lower: [],
                upper: [clientEventUuid],
                includeUpper: false,
              ),
            );
      }
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterWhereClause
  >
  scopedEventKeyEqualTo(String scopedEventKey) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IndexWhereClause.equalTo(
          indexName: r'scopedEventKey',
          value: [scopedEventKey],
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterWhereClause
  >
  scopedEventKeyNotEqualTo(String scopedEventKey) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'scopedEventKey',
                lower: [],
                upper: [scopedEventKey],
                includeUpper: false,
              ),
            )
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'scopedEventKey',
                lower: [scopedEventKey],
                includeLower: false,
                upper: [],
              ),
            );
      } else {
        return query
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'scopedEventKey',
                lower: [scopedEventKey],
                includeLower: false,
                upper: [],
              ),
            )
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'scopedEventKey',
                lower: [],
                upper: [scopedEventKey],
                includeUpper: false,
              ),
            );
      }
    });
  }
}

extension PendingAttendanceRecordQueryFilter
    on
        QueryBuilder<
          PendingAttendanceRecord,
          PendingAttendanceRecord,
          QFilterCondition
        > {
  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  attemptsEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'attempts', value: value),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  attemptsGreaterThan(int value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'attempts',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  attemptsLessThan(int value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'attempts',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  attemptsBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'attempts',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  clientEventUuidEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'clientEventUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  clientEventUuidGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'clientEventUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  clientEventUuidLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'clientEventUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  clientEventUuidBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'clientEventUuid',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  clientEventUuidStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'clientEventUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  clientEventUuidEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'clientEventUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  clientEventUuidContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'clientEventUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  clientEventUuidMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'clientEventUuid',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  clientEventUuidIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'clientEventUuid', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  clientEventUuidIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'clientEventUuid', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  contractVersionEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  contractVersionGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  contractVersionLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  contractVersionBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'contractVersion',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  contractVersionStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  contractVersionEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  contractVersionContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  contractVersionMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'contractVersion',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  contractVersionIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'contractVersion', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  contractVersionIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'contractVersion', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  createdAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'createdAt', value: value),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  createdAtGreaterThan(DateTime value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'createdAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  createdAtLessThan(DateTime value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'createdAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  createdAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'createdAt',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  deviceUuidEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  deviceUuidGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  deviceUuidLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  deviceUuidBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'deviceUuid',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  deviceUuidStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  deviceUuidEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  deviceUuidContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  deviceUuidMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'deviceUuid',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  deviceUuidIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'deviceUuid', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  deviceUuidIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'deviceUuid', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  employeeIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  employeeIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  employeeIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  employeeIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'employeeId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  employeeIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  employeeIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  employeeIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  employeeIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'employeeId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  employeeIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'employeeId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  employeeIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'employeeId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNull(property: r'errorCode'),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNotNull(property: r'errorCode'),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeEqualTo(String? value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'errorCode',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'errorCode',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'errorCode', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  errorCodeIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'errorCode', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  eventTypeEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'eventType',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  eventTypeGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'eventType',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  eventTypeLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'eventType',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  eventTypeBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'eventType',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  eventTypeStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'eventType',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  eventTypeEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'eventType',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  eventTypeContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'eventType',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  eventTypeMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'eventType',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  eventTypeIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'eventType', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  eventTypeIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'eventType', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNull(property: r'evidencePath'),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNotNull(property: r'evidencePath'),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathEqualTo(String? value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'evidencePath',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'evidencePath',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'evidencePath',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'evidencePath',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'evidencePath',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'evidencePath',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'evidencePath',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'evidencePath',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'evidencePath', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  evidencePathIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'evidencePath', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'id', value: value),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  idGreaterThan(Id value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'id',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  idLessThan(Id value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'id',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'id',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  membershipIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  membershipIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  membershipIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  membershipIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'membershipId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  membershipIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  membershipIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  membershipIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  membershipIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'membershipId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  membershipIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'membershipId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  membershipIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'membershipId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  nextAttemptAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'nextAttemptAt', value: value),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  nextAttemptAtGreaterThan(DateTime value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'nextAttemptAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  nextAttemptAtLessThan(DateTime value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'nextAttemptAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  nextAttemptAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'nextAttemptAt',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  payloadJsonEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'payloadJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  payloadJsonGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'payloadJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  payloadJsonLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'payloadJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  payloadJsonBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'payloadJson',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  payloadJsonStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'payloadJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  payloadJsonEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'payloadJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  payloadJsonContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'payloadJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  payloadJsonMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'payloadJson',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  payloadJsonIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'payloadJson', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  payloadJsonIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'payloadJson', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  regularizationSuggestedEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'regularizationSuggested',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  scopedEventKeyEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'scopedEventKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  scopedEventKeyGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'scopedEventKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  scopedEventKeyLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'scopedEventKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  scopedEventKeyBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'scopedEventKey',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  scopedEventKeyStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'scopedEventKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  scopedEventKeyEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'scopedEventKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  scopedEventKeyContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'scopedEventKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  scopedEventKeyMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'scopedEventKey',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  scopedEventKeyIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'scopedEventKey', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  scopedEventKeyIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'scopedEventKey', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  statusEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  statusGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  statusLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  statusBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'status',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  statusStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  statusEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  statusContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  statusMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'status',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  statusIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'status', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  statusIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'status', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  syncedAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNull(property: r'syncedAt'),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  syncedAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNotNull(property: r'syncedAt'),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  syncedAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'syncedAt', value: value),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  syncedAtGreaterThan(DateTime? value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'syncedAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  syncedAtLessThan(DateTime? value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'syncedAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  syncedAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'syncedAt',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  tenantIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  tenantIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  tenantIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  tenantIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'tenantId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  tenantIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  tenantIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  tenantIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  tenantIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'tenantId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  tenantIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'tenantId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  tenantIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'tenantId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  userIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  userIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  userIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  userIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'userId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  userIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  userIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  userIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  userIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'userId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  userIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'userId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingAttendanceRecord,
    PendingAttendanceRecord,
    QAfterFilterCondition
  >
  userIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'userId', value: ''),
      );
    });
  }
}

extension PendingAttendanceRecordQueryObject
    on
        QueryBuilder<
          PendingAttendanceRecord,
          PendingAttendanceRecord,
          QFilterCondition
        > {}

extension PendingAttendanceRecordQueryLinks
    on
        QueryBuilder<
          PendingAttendanceRecord,
          PendingAttendanceRecord,
          QFilterCondition
        > {}

extension PendingAttendanceRecordQuerySortBy
    on QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QSortBy> {
  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByAttempts() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'attempts', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByAttemptsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'attempts', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByClientEventUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'clientEventUuid', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByClientEventUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'clientEventUuid', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByContractVersion() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByContractVersionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByDeviceUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByDeviceUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByEmployeeId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByEmployeeIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByErrorCode() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'errorCode', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByErrorCodeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'errorCode', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByEventType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'eventType', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByEventTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'eventType', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByEvidencePath() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'evidencePath', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByEvidencePathDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'evidencePath', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByMembershipId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByMembershipIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByNextAttemptAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nextAttemptAt', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByNextAttemptAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nextAttemptAt', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByPayloadJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'payloadJson', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByPayloadJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'payloadJson', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByRegularizationSuggested() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'regularizationSuggested', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByRegularizationSuggestedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'regularizationSuggested', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByScopedEventKey() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scopedEventKey', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByScopedEventKeyDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scopedEventKey', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByStatus() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByStatusDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortBySyncedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortBySyncedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByTenantId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByTenantIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  sortByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }
}

extension PendingAttendanceRecordQuerySortThenBy
    on
        QueryBuilder<
          PendingAttendanceRecord,
          PendingAttendanceRecord,
          QSortThenBy
        > {
  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByAttempts() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'attempts', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByAttemptsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'attempts', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByClientEventUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'clientEventUuid', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByClientEventUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'clientEventUuid', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByContractVersion() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByContractVersionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByDeviceUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByDeviceUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByEmployeeId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByEmployeeIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByErrorCode() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'errorCode', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByErrorCodeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'errorCode', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByEventType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'eventType', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByEventTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'eventType', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByEvidencePath() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'evidencePath', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByEvidencePathDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'evidencePath', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByMembershipId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByMembershipIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByNextAttemptAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nextAttemptAt', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByNextAttemptAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nextAttemptAt', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByPayloadJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'payloadJson', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByPayloadJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'payloadJson', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByRegularizationSuggested() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'regularizationSuggested', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByRegularizationSuggestedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'regularizationSuggested', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByScopedEventKey() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scopedEventKey', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByScopedEventKeyDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scopedEventKey', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByStatus() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByStatusDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenBySyncedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenBySyncedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByTenantId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByTenantIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.desc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QAfterSortBy>
  thenByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }
}

extension PendingAttendanceRecordQueryWhereDistinct
    on
        QueryBuilder<
          PendingAttendanceRecord,
          PendingAttendanceRecord,
          QDistinct
        > {
  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByAttempts() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'attempts');
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByClientEventUuid({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(
        r'clientEventUuid',
        caseSensitive: caseSensitive,
      );
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByContractVersion({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(
        r'contractVersion',
        caseSensitive: caseSensitive,
      );
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'createdAt');
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByDeviceUuid({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'deviceUuid', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByEmployeeId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'employeeId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByErrorCode({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'errorCode', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByEventType({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'eventType', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByEvidencePath({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'evidencePath', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByMembershipId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'membershipId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByNextAttemptAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'nextAttemptAt');
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByPayloadJson({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'payloadJson', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByRegularizationSuggested() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'regularizationSuggested');
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByScopedEventKey({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(
        r'scopedEventKey',
        caseSensitive: caseSensitive,
      );
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByStatus({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'status', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctBySyncedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'syncedAt');
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByTenantId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'tenantId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingAttendanceRecord, PendingAttendanceRecord, QDistinct>
  distinctByUserId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'userId', caseSensitive: caseSensitive);
    });
  }
}

extension PendingAttendanceRecordQueryProperty
    on
        QueryBuilder<
          PendingAttendanceRecord,
          PendingAttendanceRecord,
          QQueryProperty
        > {
  QueryBuilder<PendingAttendanceRecord, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<PendingAttendanceRecord, int, QQueryOperations>
  attemptsProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'attempts');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  clientEventUuidProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'clientEventUuid');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  contractVersionProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'contractVersion');
    });
  }

  QueryBuilder<PendingAttendanceRecord, DateTime, QQueryOperations>
  createdAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'createdAt');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  deviceUuidProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'deviceUuid');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  employeeIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'employeeId');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String?, QQueryOperations>
  errorCodeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'errorCode');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  eventTypeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'eventType');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String?, QQueryOperations>
  evidencePathProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'evidencePath');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  membershipIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'membershipId');
    });
  }

  QueryBuilder<PendingAttendanceRecord, DateTime, QQueryOperations>
  nextAttemptAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'nextAttemptAt');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  payloadJsonProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'payloadJson');
    });
  }

  QueryBuilder<PendingAttendanceRecord, bool, QQueryOperations>
  regularizationSuggestedProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'regularizationSuggested');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  scopedEventKeyProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'scopedEventKey');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  statusProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'status');
    });
  }

  QueryBuilder<PendingAttendanceRecord, DateTime?, QQueryOperations>
  syncedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'syncedAt');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  tenantIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'tenantId');
    });
  }

  QueryBuilder<PendingAttendanceRecord, String, QQueryOperations>
  userIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'userId');
    });
  }
}

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetPendingFieldPingBatchCollection on Isar {
  IsarCollection<PendingFieldPingBatch> get pendingFieldPingBatchs =>
      this.collection();
}

const PendingFieldPingBatchSchema = CollectionSchema(
  name: r'PendingFieldPingBatch',
  id: 9118850024932947822,
  properties: {
    r'attempts': PropertySchema(id: 0, name: r'attempts', type: IsarType.long),
    r'batchUuid': PropertySchema(
      id: 1,
      name: r'batchUuid',
      type: IsarType.string,
    ),
    r'contractVersion': PropertySchema(
      id: 2,
      name: r'contractVersion',
      type: IsarType.string,
    ),
    r'createdAt': PropertySchema(
      id: 3,
      name: r'createdAt',
      type: IsarType.dateTime,
    ),
    r'deviceUuid': PropertySchema(
      id: 4,
      name: r'deviceUuid',
      type: IsarType.string,
    ),
    r'employeeId': PropertySchema(
      id: 5,
      name: r'employeeId',
      type: IsarType.string,
    ),
    r'errorCode': PropertySchema(
      id: 6,
      name: r'errorCode',
      type: IsarType.string,
    ),
    r'itemsJson': PropertySchema(
      id: 7,
      name: r'itemsJson',
      type: IsarType.string,
    ),
    r'membershipId': PropertySchema(
      id: 8,
      name: r'membershipId',
      type: IsarType.string,
    ),
    r'nextAttemptAt': PropertySchema(
      id: 9,
      name: r'nextAttemptAt',
      type: IsarType.dateTime,
    ),
    r'scopedBatchKey': PropertySchema(
      id: 10,
      name: r'scopedBatchKey',
      type: IsarType.string,
    ),
    r'sessionId': PropertySchema(
      id: 11,
      name: r'sessionId',
      type: IsarType.string,
    ),
    r'status': PropertySchema(id: 12, name: r'status', type: IsarType.string),
    r'syncedAt': PropertySchema(
      id: 13,
      name: r'syncedAt',
      type: IsarType.dateTime,
    ),
    r'tenantId': PropertySchema(
      id: 14,
      name: r'tenantId',
      type: IsarType.string,
    ),
    r'userId': PropertySchema(id: 15, name: r'userId', type: IsarType.string),
  },

  estimateSize: _pendingFieldPingBatchEstimateSize,
  serialize: _pendingFieldPingBatchSerialize,
  deserialize: _pendingFieldPingBatchDeserialize,
  deserializeProp: _pendingFieldPingBatchDeserializeProp,
  idName: r'id',
  indexes: {
    r'batchUuid': IndexSchema(
      id: 9188384585060296701,
      name: r'batchUuid',
      unique: false,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'batchUuid',
          type: IndexType.hash,
          caseSensitive: true,
        ),
      ],
    ),
    r'scopedBatchKey': IndexSchema(
      id: 4953812725085450950,
      name: r'scopedBatchKey',
      unique: true,
      replace: true,
      properties: [
        IndexPropertySchema(
          name: r'scopedBatchKey',
          type: IndexType.hash,
          caseSensitive: true,
        ),
      ],
    ),
  },
  links: {},
  embeddedSchemas: {},

  getId: _pendingFieldPingBatchGetId,
  getLinks: _pendingFieldPingBatchGetLinks,
  attach: _pendingFieldPingBatchAttach,
  version: '3.3.2',
);

int _pendingFieldPingBatchEstimateSize(
  PendingFieldPingBatch object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.batchUuid.length * 3;
  bytesCount += 3 + object.contractVersion.length * 3;
  bytesCount += 3 + object.deviceUuid.length * 3;
  bytesCount += 3 + object.employeeId.length * 3;
  {
    final value = object.errorCode;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  bytesCount += 3 + object.itemsJson.length * 3;
  bytesCount += 3 + object.membershipId.length * 3;
  bytesCount += 3 + object.scopedBatchKey.length * 3;
  bytesCount += 3 + object.sessionId.length * 3;
  bytesCount += 3 + object.status.length * 3;
  bytesCount += 3 + object.tenantId.length * 3;
  bytesCount += 3 + object.userId.length * 3;
  return bytesCount;
}

void _pendingFieldPingBatchSerialize(
  PendingFieldPingBatch object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeLong(offsets[0], object.attempts);
  writer.writeString(offsets[1], object.batchUuid);
  writer.writeString(offsets[2], object.contractVersion);
  writer.writeDateTime(offsets[3], object.createdAt);
  writer.writeString(offsets[4], object.deviceUuid);
  writer.writeString(offsets[5], object.employeeId);
  writer.writeString(offsets[6], object.errorCode);
  writer.writeString(offsets[7], object.itemsJson);
  writer.writeString(offsets[8], object.membershipId);
  writer.writeDateTime(offsets[9], object.nextAttemptAt);
  writer.writeString(offsets[10], object.scopedBatchKey);
  writer.writeString(offsets[11], object.sessionId);
  writer.writeString(offsets[12], object.status);
  writer.writeDateTime(offsets[13], object.syncedAt);
  writer.writeString(offsets[14], object.tenantId);
  writer.writeString(offsets[15], object.userId);
}

PendingFieldPingBatch _pendingFieldPingBatchDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = PendingFieldPingBatch();
  object.attempts = reader.readLong(offsets[0]);
  object.batchUuid = reader.readString(offsets[1]);
  object.contractVersion = reader.readString(offsets[2]);
  object.createdAt = reader.readDateTime(offsets[3]);
  object.deviceUuid = reader.readString(offsets[4]);
  object.employeeId = reader.readString(offsets[5]);
  object.errorCode = reader.readStringOrNull(offsets[6]);
  object.id = id;
  object.itemsJson = reader.readString(offsets[7]);
  object.membershipId = reader.readString(offsets[8]);
  object.nextAttemptAt = reader.readDateTime(offsets[9]);
  object.scopedBatchKey = reader.readString(offsets[10]);
  object.sessionId = reader.readString(offsets[11]);
  object.status = reader.readString(offsets[12]);
  object.syncedAt = reader.readDateTimeOrNull(offsets[13]);
  object.tenantId = reader.readString(offsets[14]);
  object.userId = reader.readString(offsets[15]);
  return object;
}

P _pendingFieldPingBatchDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readLong(offset)) as P;
    case 1:
      return (reader.readString(offset)) as P;
    case 2:
      return (reader.readString(offset)) as P;
    case 3:
      return (reader.readDateTime(offset)) as P;
    case 4:
      return (reader.readString(offset)) as P;
    case 5:
      return (reader.readString(offset)) as P;
    case 6:
      return (reader.readStringOrNull(offset)) as P;
    case 7:
      return (reader.readString(offset)) as P;
    case 8:
      return (reader.readString(offset)) as P;
    case 9:
      return (reader.readDateTime(offset)) as P;
    case 10:
      return (reader.readString(offset)) as P;
    case 11:
      return (reader.readString(offset)) as P;
    case 12:
      return (reader.readString(offset)) as P;
    case 13:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 14:
      return (reader.readString(offset)) as P;
    case 15:
      return (reader.readString(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _pendingFieldPingBatchGetId(PendingFieldPingBatch object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _pendingFieldPingBatchGetLinks(
  PendingFieldPingBatch object,
) {
  return [];
}

void _pendingFieldPingBatchAttach(
  IsarCollection<dynamic> col,
  Id id,
  PendingFieldPingBatch object,
) {
  object.id = id;
}

extension PendingFieldPingBatchByIndex
    on IsarCollection<PendingFieldPingBatch> {
  Future<PendingFieldPingBatch?> getByScopedBatchKey(String scopedBatchKey) {
    return getByIndex(r'scopedBatchKey', [scopedBatchKey]);
  }

  PendingFieldPingBatch? getByScopedBatchKeySync(String scopedBatchKey) {
    return getByIndexSync(r'scopedBatchKey', [scopedBatchKey]);
  }

  Future<bool> deleteByScopedBatchKey(String scopedBatchKey) {
    return deleteByIndex(r'scopedBatchKey', [scopedBatchKey]);
  }

  bool deleteByScopedBatchKeySync(String scopedBatchKey) {
    return deleteByIndexSync(r'scopedBatchKey', [scopedBatchKey]);
  }

  Future<List<PendingFieldPingBatch?>> getAllByScopedBatchKey(
    List<String> scopedBatchKeyValues,
  ) {
    final values = scopedBatchKeyValues.map((e) => [e]).toList();
    return getAllByIndex(r'scopedBatchKey', values);
  }

  List<PendingFieldPingBatch?> getAllByScopedBatchKeySync(
    List<String> scopedBatchKeyValues,
  ) {
    final values = scopedBatchKeyValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'scopedBatchKey', values);
  }

  Future<int> deleteAllByScopedBatchKey(List<String> scopedBatchKeyValues) {
    final values = scopedBatchKeyValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'scopedBatchKey', values);
  }

  int deleteAllByScopedBatchKeySync(List<String> scopedBatchKeyValues) {
    final values = scopedBatchKeyValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'scopedBatchKey', values);
  }

  Future<Id> putByScopedBatchKey(PendingFieldPingBatch object) {
    return putByIndex(r'scopedBatchKey', object);
  }

  Id putByScopedBatchKeySync(
    PendingFieldPingBatch object, {
    bool saveLinks = true,
  }) {
    return putByIndexSync(r'scopedBatchKey', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByScopedBatchKey(List<PendingFieldPingBatch> objects) {
    return putAllByIndex(r'scopedBatchKey', objects);
  }

  List<Id> putAllByScopedBatchKeySync(
    List<PendingFieldPingBatch> objects, {
    bool saveLinks = true,
  }) {
    return putAllByIndexSync(r'scopedBatchKey', objects, saveLinks: saveLinks);
  }
}

extension PendingFieldPingBatchQueryWhereSort
    on QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QWhere> {
  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterWhere>
  anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension PendingFieldPingBatchQueryWhere
    on
        QueryBuilder<
          PendingFieldPingBatch,
          PendingFieldPingBatch,
          QWhereClause
        > {
  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterWhereClause>
  idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(lower: id, upper: id));
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterWhereClause>
  idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterWhereClause>
  idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterWhereClause>
  idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterWhereClause>
  idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.between(
          lower: lowerId,
          includeLower: includeLower,
          upper: upperId,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterWhereClause>
  batchUuidEqualTo(String batchUuid) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IndexWhereClause.equalTo(indexName: r'batchUuid', value: [batchUuid]),
      );
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterWhereClause>
  batchUuidNotEqualTo(String batchUuid) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'batchUuid',
                lower: [],
                upper: [batchUuid],
                includeUpper: false,
              ),
            )
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'batchUuid',
                lower: [batchUuid],
                includeLower: false,
                upper: [],
              ),
            );
      } else {
        return query
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'batchUuid',
                lower: [batchUuid],
                includeLower: false,
                upper: [],
              ),
            )
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'batchUuid',
                lower: [],
                upper: [batchUuid],
                includeUpper: false,
              ),
            );
      }
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterWhereClause>
  scopedBatchKeyEqualTo(String scopedBatchKey) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IndexWhereClause.equalTo(
          indexName: r'scopedBatchKey',
          value: [scopedBatchKey],
        ),
      );
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterWhereClause>
  scopedBatchKeyNotEqualTo(String scopedBatchKey) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'scopedBatchKey',
                lower: [],
                upper: [scopedBatchKey],
                includeUpper: false,
              ),
            )
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'scopedBatchKey',
                lower: [scopedBatchKey],
                includeLower: false,
                upper: [],
              ),
            );
      } else {
        return query
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'scopedBatchKey',
                lower: [scopedBatchKey],
                includeLower: false,
                upper: [],
              ),
            )
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'scopedBatchKey',
                lower: [],
                upper: [scopedBatchKey],
                includeUpper: false,
              ),
            );
      }
    });
  }
}

extension PendingFieldPingBatchQueryFilter
    on
        QueryBuilder<
          PendingFieldPingBatch,
          PendingFieldPingBatch,
          QFilterCondition
        > {
  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  attemptsEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'attempts', value: value),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  attemptsGreaterThan(int value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'attempts',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  attemptsLessThan(int value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'attempts',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  attemptsBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'attempts',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  batchUuidEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'batchUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  batchUuidGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'batchUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  batchUuidLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'batchUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  batchUuidBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'batchUuid',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  batchUuidStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'batchUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  batchUuidEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'batchUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  batchUuidContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'batchUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  batchUuidMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'batchUuid',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  batchUuidIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'batchUuid', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  batchUuidIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'batchUuid', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  contractVersionEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  contractVersionGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  contractVersionLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  contractVersionBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'contractVersion',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  contractVersionStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  contractVersionEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  contractVersionContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  contractVersionMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'contractVersion',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  contractVersionIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'contractVersion', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  contractVersionIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'contractVersion', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  createdAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'createdAt', value: value),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  createdAtGreaterThan(DateTime value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'createdAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  createdAtLessThan(DateTime value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'createdAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  createdAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'createdAt',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  deviceUuidEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  deviceUuidGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  deviceUuidLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  deviceUuidBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'deviceUuid',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  deviceUuidStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  deviceUuidEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  deviceUuidContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  deviceUuidMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'deviceUuid',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  deviceUuidIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'deviceUuid', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  deviceUuidIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'deviceUuid', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  employeeIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  employeeIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  employeeIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  employeeIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'employeeId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  employeeIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  employeeIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  employeeIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  employeeIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'employeeId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  employeeIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'employeeId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  employeeIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'employeeId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNull(property: r'errorCode'),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNotNull(property: r'errorCode'),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeEqualTo(String? value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'errorCode',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'errorCode',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'errorCode',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'errorCode', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  errorCodeIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'errorCode', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'id', value: value),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  idGreaterThan(Id value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'id',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  idLessThan(Id value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'id',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'id',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  itemsJsonEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'itemsJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  itemsJsonGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'itemsJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  itemsJsonLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'itemsJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  itemsJsonBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'itemsJson',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  itemsJsonStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'itemsJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  itemsJsonEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'itemsJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  itemsJsonContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'itemsJson',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  itemsJsonMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'itemsJson',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  itemsJsonIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'itemsJson', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  itemsJsonIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'itemsJson', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  membershipIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  membershipIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  membershipIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  membershipIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'membershipId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  membershipIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  membershipIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  membershipIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  membershipIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'membershipId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  membershipIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'membershipId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  membershipIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'membershipId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  nextAttemptAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'nextAttemptAt', value: value),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  nextAttemptAtGreaterThan(DateTime value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'nextAttemptAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  nextAttemptAtLessThan(DateTime value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'nextAttemptAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  nextAttemptAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'nextAttemptAt',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  scopedBatchKeyEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'scopedBatchKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  scopedBatchKeyGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'scopedBatchKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  scopedBatchKeyLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'scopedBatchKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  scopedBatchKeyBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'scopedBatchKey',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  scopedBatchKeyStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'scopedBatchKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  scopedBatchKeyEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'scopedBatchKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  scopedBatchKeyContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'scopedBatchKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  scopedBatchKeyMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'scopedBatchKey',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  scopedBatchKeyIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'scopedBatchKey', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  scopedBatchKeyIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'scopedBatchKey', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  sessionIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'sessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  sessionIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'sessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  sessionIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'sessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  sessionIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'sessionId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  sessionIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'sessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  sessionIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'sessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  sessionIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'sessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  sessionIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'sessionId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  sessionIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'sessionId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  sessionIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'sessionId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  statusEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  statusGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  statusLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  statusBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'status',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  statusStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  statusEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  statusContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'status',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  statusMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'status',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  statusIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'status', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  statusIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'status', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  syncedAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNull(property: r'syncedAt'),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  syncedAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNotNull(property: r'syncedAt'),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  syncedAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'syncedAt', value: value),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  syncedAtGreaterThan(DateTime? value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'syncedAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  syncedAtLessThan(DateTime? value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'syncedAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  syncedAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'syncedAt',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  tenantIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  tenantIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  tenantIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  tenantIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'tenantId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  tenantIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  tenantIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  tenantIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  tenantIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'tenantId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  tenantIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'tenantId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  tenantIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'tenantId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  userIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  userIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  userIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  userIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'userId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  userIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  userIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  userIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  userIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'userId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  userIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'userId', value: ''),
      );
    });
  }

  QueryBuilder<
    PendingFieldPingBatch,
    PendingFieldPingBatch,
    QAfterFilterCondition
  >
  userIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'userId', value: ''),
      );
    });
  }
}

extension PendingFieldPingBatchQueryObject
    on
        QueryBuilder<
          PendingFieldPingBatch,
          PendingFieldPingBatch,
          QFilterCondition
        > {}

extension PendingFieldPingBatchQueryLinks
    on
        QueryBuilder<
          PendingFieldPingBatch,
          PendingFieldPingBatch,
          QFilterCondition
        > {}

extension PendingFieldPingBatchQuerySortBy
    on QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QSortBy> {
  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByAttempts() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'attempts', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByAttemptsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'attempts', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByBatchUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'batchUuid', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByBatchUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'batchUuid', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByContractVersion() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByContractVersionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByDeviceUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByDeviceUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByEmployeeId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByEmployeeIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByErrorCode() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'errorCode', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByErrorCodeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'errorCode', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByItemsJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'itemsJson', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByItemsJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'itemsJson', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByMembershipId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByMembershipIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByNextAttemptAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nextAttemptAt', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByNextAttemptAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nextAttemptAt', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByScopedBatchKey() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scopedBatchKey', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByScopedBatchKeyDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scopedBatchKey', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortBySessionId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sessionId', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortBySessionIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sessionId', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByStatus() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByStatusDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortBySyncedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortBySyncedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByTenantId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByTenantIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  sortByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }
}

extension PendingFieldPingBatchQuerySortThenBy
    on QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QSortThenBy> {
  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByAttempts() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'attempts', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByAttemptsDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'attempts', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByBatchUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'batchUuid', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByBatchUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'batchUuid', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByContractVersion() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByContractVersionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByDeviceUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByDeviceUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByEmployeeId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByEmployeeIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByErrorCode() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'errorCode', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByErrorCodeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'errorCode', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByItemsJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'itemsJson', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByItemsJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'itemsJson', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByMembershipId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByMembershipIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByNextAttemptAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nextAttemptAt', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByNextAttemptAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nextAttemptAt', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByScopedBatchKey() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scopedBatchKey', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByScopedBatchKeyDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'scopedBatchKey', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenBySessionId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sessionId', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenBySessionIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'sessionId', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByStatus() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByStatusDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'status', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenBySyncedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenBySyncedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByTenantId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByTenantIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.desc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QAfterSortBy>
  thenByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }
}

extension PendingFieldPingBatchQueryWhereDistinct
    on QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct> {
  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByAttempts() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'attempts');
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByBatchUuid({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'batchUuid', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByContractVersion({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(
        r'contractVersion',
        caseSensitive: caseSensitive,
      );
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'createdAt');
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByDeviceUuid({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'deviceUuid', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByEmployeeId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'employeeId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByErrorCode({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'errorCode', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByItemsJson({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'itemsJson', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByMembershipId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'membershipId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByNextAttemptAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'nextAttemptAt');
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByScopedBatchKey({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(
        r'scopedBatchKey',
        caseSensitive: caseSensitive,
      );
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctBySessionId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'sessionId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByStatus({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'status', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctBySyncedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'syncedAt');
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByTenantId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'tenantId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<PendingFieldPingBatch, PendingFieldPingBatch, QDistinct>
  distinctByUserId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'userId', caseSensitive: caseSensitive);
    });
  }
}

extension PendingFieldPingBatchQueryProperty
    on
        QueryBuilder<
          PendingFieldPingBatch,
          PendingFieldPingBatch,
          QQueryProperty
        > {
  QueryBuilder<PendingFieldPingBatch, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<PendingFieldPingBatch, int, QQueryOperations>
  attemptsProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'attempts');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  batchUuidProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'batchUuid');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  contractVersionProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'contractVersion');
    });
  }

  QueryBuilder<PendingFieldPingBatch, DateTime, QQueryOperations>
  createdAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'createdAt');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  deviceUuidProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'deviceUuid');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  employeeIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'employeeId');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String?, QQueryOperations>
  errorCodeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'errorCode');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  itemsJsonProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'itemsJson');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  membershipIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'membershipId');
    });
  }

  QueryBuilder<PendingFieldPingBatch, DateTime, QQueryOperations>
  nextAttemptAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'nextAttemptAt');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  scopedBatchKeyProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'scopedBatchKey');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  sessionIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'sessionId');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  statusProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'status');
    });
  }

  QueryBuilder<PendingFieldPingBatch, DateTime?, QQueryOperations>
  syncedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'syncedAt');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  tenantIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'tenantId');
    });
  }

  QueryBuilder<PendingFieldPingBatch, String, QQueryOperations>
  userIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'userId');
    });
  }
}

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetLocalFieldSessionCollection on Isar {
  IsarCollection<LocalFieldSession> get localFieldSessions => this.collection();
}

const LocalFieldSessionSchema = CollectionSchema(
  name: r'LocalFieldSession',
  id: -4517793599489607464,
  properties: {
    r'active': PropertySchema(id: 0, name: r'active', type: IsarType.bool),
    r'capturedPingCount': PropertySchema(
      id: 1,
      name: r'capturedPingCount',
      type: IsarType.long,
    ),
    r'clientStartUuid': PropertySchema(
      id: 2,
      name: r'clientStartUuid',
      type: IsarType.string,
    ),
    r'contractVersion': PropertySchema(
      id: 3,
      name: r'contractVersion',
      type: IsarType.string,
    ),
    r'deviceUuid': PropertySchema(
      id: 4,
      name: r'deviceUuid',
      type: IsarType.string,
    ),
    r'employeeId': PropertySchema(
      id: 5,
      name: r'employeeId',
      type: IsarType.string,
    ),
    r'lastPingAt': PropertySchema(
      id: 6,
      name: r'lastPingAt',
      type: IsarType.dateTime,
    ),
    r'membershipId': PropertySchema(
      id: 7,
      name: r'membershipId',
      type: IsarType.string,
    ),
    r'ownerKey': PropertySchema(
      id: 8,
      name: r'ownerKey',
      type: IsarType.string,
    ),
    r'serverSessionId': PropertySchema(
      id: 9,
      name: r'serverSessionId',
      type: IsarType.string,
    ),
    r'startedAt': PropertySchema(
      id: 10,
      name: r'startedAt',
      type: IsarType.dateTime,
    ),
    r'tenantId': PropertySchema(
      id: 11,
      name: r'tenantId',
      type: IsarType.string,
    ),
    r'userId': PropertySchema(id: 12, name: r'userId', type: IsarType.string),
  },

  estimateSize: _localFieldSessionEstimateSize,
  serialize: _localFieldSessionSerialize,
  deserialize: _localFieldSessionDeserialize,
  deserializeProp: _localFieldSessionDeserializeProp,
  idName: r'id',
  indexes: {
    r'ownerKey': IndexSchema(
      id: -688544438286220026,
      name: r'ownerKey',
      unique: true,
      replace: true,
      properties: [
        IndexPropertySchema(
          name: r'ownerKey',
          type: IndexType.hash,
          caseSensitive: true,
        ),
      ],
    ),
  },
  links: {},
  embeddedSchemas: {},

  getId: _localFieldSessionGetId,
  getLinks: _localFieldSessionGetLinks,
  attach: _localFieldSessionAttach,
  version: '3.3.2',
);

int _localFieldSessionEstimateSize(
  LocalFieldSession object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.clientStartUuid.length * 3;
  bytesCount += 3 + object.contractVersion.length * 3;
  bytesCount += 3 + object.deviceUuid.length * 3;
  bytesCount += 3 + object.employeeId.length * 3;
  bytesCount += 3 + object.membershipId.length * 3;
  bytesCount += 3 + object.ownerKey.length * 3;
  bytesCount += 3 + object.serverSessionId.length * 3;
  bytesCount += 3 + object.tenantId.length * 3;
  bytesCount += 3 + object.userId.length * 3;
  return bytesCount;
}

void _localFieldSessionSerialize(
  LocalFieldSession object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeBool(offsets[0], object.active);
  writer.writeLong(offsets[1], object.capturedPingCount);
  writer.writeString(offsets[2], object.clientStartUuid);
  writer.writeString(offsets[3], object.contractVersion);
  writer.writeString(offsets[4], object.deviceUuid);
  writer.writeString(offsets[5], object.employeeId);
  writer.writeDateTime(offsets[6], object.lastPingAt);
  writer.writeString(offsets[7], object.membershipId);
  writer.writeString(offsets[8], object.ownerKey);
  writer.writeString(offsets[9], object.serverSessionId);
  writer.writeDateTime(offsets[10], object.startedAt);
  writer.writeString(offsets[11], object.tenantId);
  writer.writeString(offsets[12], object.userId);
}

LocalFieldSession _localFieldSessionDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = LocalFieldSession();
  object.active = reader.readBool(offsets[0]);
  object.capturedPingCount = reader.readLong(offsets[1]);
  object.clientStartUuid = reader.readString(offsets[2]);
  object.contractVersion = reader.readString(offsets[3]);
  object.deviceUuid = reader.readString(offsets[4]);
  object.employeeId = reader.readString(offsets[5]);
  object.id = id;
  object.lastPingAt = reader.readDateTimeOrNull(offsets[6]);
  object.membershipId = reader.readString(offsets[7]);
  object.ownerKey = reader.readString(offsets[8]);
  object.serverSessionId = reader.readString(offsets[9]);
  object.startedAt = reader.readDateTime(offsets[10]);
  object.tenantId = reader.readString(offsets[11]);
  object.userId = reader.readString(offsets[12]);
  return object;
}

P _localFieldSessionDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readBool(offset)) as P;
    case 1:
      return (reader.readLong(offset)) as P;
    case 2:
      return (reader.readString(offset)) as P;
    case 3:
      return (reader.readString(offset)) as P;
    case 4:
      return (reader.readString(offset)) as P;
    case 5:
      return (reader.readString(offset)) as P;
    case 6:
      return (reader.readDateTimeOrNull(offset)) as P;
    case 7:
      return (reader.readString(offset)) as P;
    case 8:
      return (reader.readString(offset)) as P;
    case 9:
      return (reader.readString(offset)) as P;
    case 10:
      return (reader.readDateTime(offset)) as P;
    case 11:
      return (reader.readString(offset)) as P;
    case 12:
      return (reader.readString(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _localFieldSessionGetId(LocalFieldSession object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _localFieldSessionGetLinks(
  LocalFieldSession object,
) {
  return [];
}

void _localFieldSessionAttach(
  IsarCollection<dynamic> col,
  Id id,
  LocalFieldSession object,
) {
  object.id = id;
}

extension LocalFieldSessionByIndex on IsarCollection<LocalFieldSession> {
  Future<LocalFieldSession?> getByOwnerKey(String ownerKey) {
    return getByIndex(r'ownerKey', [ownerKey]);
  }

  LocalFieldSession? getByOwnerKeySync(String ownerKey) {
    return getByIndexSync(r'ownerKey', [ownerKey]);
  }

  Future<bool> deleteByOwnerKey(String ownerKey) {
    return deleteByIndex(r'ownerKey', [ownerKey]);
  }

  bool deleteByOwnerKeySync(String ownerKey) {
    return deleteByIndexSync(r'ownerKey', [ownerKey]);
  }

  Future<List<LocalFieldSession?>> getAllByOwnerKey(
    List<String> ownerKeyValues,
  ) {
    final values = ownerKeyValues.map((e) => [e]).toList();
    return getAllByIndex(r'ownerKey', values);
  }

  List<LocalFieldSession?> getAllByOwnerKeySync(List<String> ownerKeyValues) {
    final values = ownerKeyValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'ownerKey', values);
  }

  Future<int> deleteAllByOwnerKey(List<String> ownerKeyValues) {
    final values = ownerKeyValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'ownerKey', values);
  }

  int deleteAllByOwnerKeySync(List<String> ownerKeyValues) {
    final values = ownerKeyValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'ownerKey', values);
  }

  Future<Id> putByOwnerKey(LocalFieldSession object) {
    return putByIndex(r'ownerKey', object);
  }

  Id putByOwnerKeySync(LocalFieldSession object, {bool saveLinks = true}) {
    return putByIndexSync(r'ownerKey', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByOwnerKey(List<LocalFieldSession> objects) {
    return putAllByIndex(r'ownerKey', objects);
  }

  List<Id> putAllByOwnerKeySync(
    List<LocalFieldSession> objects, {
    bool saveLinks = true,
  }) {
    return putAllByIndexSync(r'ownerKey', objects, saveLinks: saveLinks);
  }
}

extension LocalFieldSessionQueryWhereSort
    on QueryBuilder<LocalFieldSession, LocalFieldSession, QWhere> {
  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension LocalFieldSessionQueryWhere
    on QueryBuilder<LocalFieldSession, LocalFieldSession, QWhereClause> {
  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterWhereClause>
  idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(lower: id, upper: id));
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterWhereClause>
  idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterWhereClause>
  idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterWhereClause>
  idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterWhereClause>
  idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.between(
          lower: lowerId,
          includeLower: includeLower,
          upper: upperId,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterWhereClause>
  ownerKeyEqualTo(String ownerKey) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IndexWhereClause.equalTo(indexName: r'ownerKey', value: [ownerKey]),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterWhereClause>
  ownerKeyNotEqualTo(String ownerKey) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'ownerKey',
                lower: [],
                upper: [ownerKey],
                includeUpper: false,
              ),
            )
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'ownerKey',
                lower: [ownerKey],
                includeLower: false,
                upper: [],
              ),
            );
      } else {
        return query
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'ownerKey',
                lower: [ownerKey],
                includeLower: false,
                upper: [],
              ),
            )
            .addWhereClause(
              IndexWhereClause.between(
                indexName: r'ownerKey',
                lower: [],
                upper: [ownerKey],
                includeUpper: false,
              ),
            );
      }
    });
  }
}

extension LocalFieldSessionQueryFilter
    on QueryBuilder<LocalFieldSession, LocalFieldSession, QFilterCondition> {
  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  activeEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'active', value: value),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  capturedPingCountEqualTo(int value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'capturedPingCount', value: value),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  capturedPingCountGreaterThan(int value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'capturedPingCount',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  capturedPingCountLessThan(int value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'capturedPingCount',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  capturedPingCountBetween(
    int lower,
    int upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'capturedPingCount',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  clientStartUuidEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'clientStartUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  clientStartUuidGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'clientStartUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  clientStartUuidLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'clientStartUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  clientStartUuidBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'clientStartUuid',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  clientStartUuidStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'clientStartUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  clientStartUuidEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'clientStartUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  clientStartUuidContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'clientStartUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  clientStartUuidMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'clientStartUuid',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  clientStartUuidIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'clientStartUuid', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  clientStartUuidIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'clientStartUuid', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  contractVersionEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  contractVersionGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  contractVersionLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  contractVersionBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'contractVersion',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  contractVersionStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  contractVersionEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  contractVersionContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'contractVersion',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  contractVersionMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'contractVersion',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  contractVersionIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'contractVersion', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  contractVersionIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'contractVersion', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  deviceUuidEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  deviceUuidGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  deviceUuidLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  deviceUuidBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'deviceUuid',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  deviceUuidStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  deviceUuidEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  deviceUuidContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'deviceUuid',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  deviceUuidMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'deviceUuid',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  deviceUuidIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'deviceUuid', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  deviceUuidIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'deviceUuid', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  employeeIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  employeeIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  employeeIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  employeeIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'employeeId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  employeeIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  employeeIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  employeeIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'employeeId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  employeeIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'employeeId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  employeeIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'employeeId', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  employeeIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'employeeId', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'id', value: value),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  idGreaterThan(Id value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'id',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  idLessThan(Id value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'id',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'id',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  lastPingAtIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNull(property: r'lastPingAt'),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  lastPingAtIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        const FilterCondition.isNotNull(property: r'lastPingAt'),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  lastPingAtEqualTo(DateTime? value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'lastPingAt', value: value),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  lastPingAtGreaterThan(DateTime? value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'lastPingAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  lastPingAtLessThan(DateTime? value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'lastPingAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  lastPingAtBetween(
    DateTime? lower,
    DateTime? upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'lastPingAt',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  membershipIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  membershipIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  membershipIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  membershipIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'membershipId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  membershipIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  membershipIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  membershipIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'membershipId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  membershipIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'membershipId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  membershipIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'membershipId', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  membershipIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'membershipId', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  ownerKeyEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'ownerKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  ownerKeyGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'ownerKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  ownerKeyLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'ownerKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  ownerKeyBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'ownerKey',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  ownerKeyStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'ownerKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  ownerKeyEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'ownerKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  ownerKeyContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'ownerKey',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  ownerKeyMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'ownerKey',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  ownerKeyIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'ownerKey', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  ownerKeyIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'ownerKey', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  serverSessionIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'serverSessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  serverSessionIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'serverSessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  serverSessionIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'serverSessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  serverSessionIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'serverSessionId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  serverSessionIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'serverSessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  serverSessionIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'serverSessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  serverSessionIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'serverSessionId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  serverSessionIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'serverSessionId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  serverSessionIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'serverSessionId', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  serverSessionIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'serverSessionId', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  startedAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'startedAt', value: value),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  startedAtGreaterThan(DateTime value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'startedAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  startedAtLessThan(DateTime value, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'startedAt',
          value: value,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  startedAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'startedAt',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  tenantIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  tenantIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  tenantIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  tenantIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'tenantId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  tenantIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  tenantIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  tenantIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'tenantId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  tenantIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'tenantId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  tenantIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'tenantId', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  tenantIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'tenantId', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  userIdEqualTo(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  userIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(
          include: include,
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  userIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.lessThan(
          include: include,
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  userIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.between(
          property: r'userId',
          lower: lower,
          includeLower: includeLower,
          upper: upper,
          includeUpper: includeUpper,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  userIdStartsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.startsWith(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  userIdEndsWith(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.endsWith(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  userIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.contains(
          property: r'userId',
          value: value,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  userIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.matches(
          property: r'userId',
          wildcard: pattern,
          caseSensitive: caseSensitive,
        ),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  userIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.equalTo(property: r'userId', value: ''),
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterFilterCondition>
  userIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(
        FilterCondition.greaterThan(property: r'userId', value: ''),
      );
    });
  }
}

extension LocalFieldSessionQueryObject
    on QueryBuilder<LocalFieldSession, LocalFieldSession, QFilterCondition> {}

extension LocalFieldSessionQueryLinks
    on QueryBuilder<LocalFieldSession, LocalFieldSession, QFilterCondition> {}

extension LocalFieldSessionQuerySortBy
    on QueryBuilder<LocalFieldSession, LocalFieldSession, QSortBy> {
  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByActive() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'active', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByActiveDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'active', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByCapturedPingCount() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'capturedPingCount', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByCapturedPingCountDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'capturedPingCount', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByClientStartUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'clientStartUuid', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByClientStartUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'clientStartUuid', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByContractVersion() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByContractVersionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByDeviceUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByDeviceUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByEmployeeId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByEmployeeIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByLastPingAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lastPingAt', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByLastPingAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lastPingAt', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByMembershipId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByMembershipIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByOwnerKey() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerKey', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByOwnerKeyDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerKey', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByServerSessionId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serverSessionId', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByServerSessionIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serverSessionId', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startedAt', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByStartedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startedAt', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByTenantId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByTenantIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  sortByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }
}

extension LocalFieldSessionQuerySortThenBy
    on QueryBuilder<LocalFieldSession, LocalFieldSession, QSortThenBy> {
  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByActive() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'active', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByActiveDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'active', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByCapturedPingCount() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'capturedPingCount', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByCapturedPingCountDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'capturedPingCount', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByClientStartUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'clientStartUuid', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByClientStartUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'clientStartUuid', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByContractVersion() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByContractVersionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'contractVersion', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByDeviceUuid() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByDeviceUuidDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'deviceUuid', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByEmployeeId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByEmployeeIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'employeeId', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByLastPingAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lastPingAt', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByLastPingAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'lastPingAt', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByMembershipId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByMembershipIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'membershipId', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByOwnerKey() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerKey', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByOwnerKeyDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerKey', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByServerSessionId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serverSessionId', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByServerSessionIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serverSessionId', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startedAt', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByStartedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'startedAt', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByTenantId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByTenantIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'tenantId', Sort.desc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QAfterSortBy>
  thenByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }
}

extension LocalFieldSessionQueryWhereDistinct
    on QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct> {
  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByActive() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'active');
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByCapturedPingCount() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'capturedPingCount');
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByClientStartUuid({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(
        r'clientStartUuid',
        caseSensitive: caseSensitive,
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByContractVersion({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(
        r'contractVersion',
        caseSensitive: caseSensitive,
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByDeviceUuid({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'deviceUuid', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByEmployeeId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'employeeId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByLastPingAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'lastPingAt');
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByMembershipId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'membershipId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByOwnerKey({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'ownerKey', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByServerSessionId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(
        r'serverSessionId',
        caseSensitive: caseSensitive,
      );
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByStartedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'startedAt');
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByTenantId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'tenantId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<LocalFieldSession, LocalFieldSession, QDistinct>
  distinctByUserId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'userId', caseSensitive: caseSensitive);
    });
  }
}

extension LocalFieldSessionQueryProperty
    on QueryBuilder<LocalFieldSession, LocalFieldSession, QQueryProperty> {
  QueryBuilder<LocalFieldSession, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<LocalFieldSession, bool, QQueryOperations> activeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'active');
    });
  }

  QueryBuilder<LocalFieldSession, int, QQueryOperations>
  capturedPingCountProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'capturedPingCount');
    });
  }

  QueryBuilder<LocalFieldSession, String, QQueryOperations>
  clientStartUuidProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'clientStartUuid');
    });
  }

  QueryBuilder<LocalFieldSession, String, QQueryOperations>
  contractVersionProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'contractVersion');
    });
  }

  QueryBuilder<LocalFieldSession, String, QQueryOperations>
  deviceUuidProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'deviceUuid');
    });
  }

  QueryBuilder<LocalFieldSession, String, QQueryOperations>
  employeeIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'employeeId');
    });
  }

  QueryBuilder<LocalFieldSession, DateTime?, QQueryOperations>
  lastPingAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'lastPingAt');
    });
  }

  QueryBuilder<LocalFieldSession, String, QQueryOperations>
  membershipIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'membershipId');
    });
  }

  QueryBuilder<LocalFieldSession, String, QQueryOperations> ownerKeyProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'ownerKey');
    });
  }

  QueryBuilder<LocalFieldSession, String, QQueryOperations>
  serverSessionIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'serverSessionId');
    });
  }

  QueryBuilder<LocalFieldSession, DateTime, QQueryOperations>
  startedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'startedAt');
    });
  }

  QueryBuilder<LocalFieldSession, String, QQueryOperations> tenantIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'tenantId');
    });
  }

  QueryBuilder<LocalFieldSession, String, QQueryOperations> userIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'userId');
    });
  }
}
