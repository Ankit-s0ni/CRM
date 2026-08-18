// GENERATED FILE. Run `pnpm mobile:contracts:generate`; do not edit manually.
import 'package:dio/dio.dart';

import '../api_routes.dart';
import '../authority_clients.dart';
import 'mobile_api_contract.g.dart';

class GeneratedPlatformApiClient extends PlatformApiClient {
  const GeneratedPlatformApiClient(super.session);

  Future<ProductTokenResponse> exchangeHrmsToken() async {
    final response = await post<Map<String, dynamic>>(
      ApiRoutes.productToken,
      data: const ProductTokenRequest().toJson(),
    );
    return ProductTokenResponse.fromJson(response.data!);
  }
}

class GeneratedHrmsApiClient extends HrmsApiClient {
  const GeneratedHrmsApiClient(super.session);

  Future<Response<Map<String, dynamic>>> runtimeConfig() =>
      get<Map<String, dynamic>>(ApiRoutes.mobileRuntimeConfig);

  Future<Response<Map<String, dynamic>>> punch(HrmsPunchRequest request) =>
      post<Map<String, dynamic>>(ApiRoutes.punches, data: request.toJson());
}
