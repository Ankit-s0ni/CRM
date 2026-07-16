import 'home_summary.dart';

abstract interface class HomeRepository {
  Future<HomeSummary> loadToday();
}
