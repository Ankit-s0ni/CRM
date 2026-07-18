import 'package:isar_community/isar.dart';
import 'package:path_provider/path_provider.dart';

import 'mobile_queue_models.dart';

class MobileQueueDatabase {
  MobileQueueDatabase._();

  static const name = 'hrms_mobile_queue';

  static Future<Isar> open() async {
    final existing = Isar.getInstance(name);
    if (existing != null) return existing;
    final directory = await getApplicationSupportDirectory();
    return Isar.open(
      const [
        PendingAttendanceRecordSchema,
        PendingFieldPingBatchSchema,
        LocalFieldSessionSchema,
      ],
      directory: directory.path,
      name: name,
      inspector: false,
    );
  }
}
