abstract interface class AuthRepository {
  Future<void> login(String identifier, String password);
  Future<void> logout();
}
