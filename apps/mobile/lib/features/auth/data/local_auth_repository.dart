import '../domain/auth_repository.dart';

class LocalAuthRepository implements AuthRepository {
  const LocalAuthRepository();

  @override
  Future<void> login(String identifier, String password) async {
    await Future<void>.delayed(const Duration(milliseconds: 550));
    if (identifier.trim().isEmpty || password.isEmpty) {
      throw const FormatException('Enter your email and password.');
    }
  }

  @override
  Future<void> logout() async {}
}
