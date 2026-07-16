import 'package:flutter/material.dart';

class AppConfig {
  AppConfig._();

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );
  static const localMode = bool.fromEnvironment(
    'LOCAL_MODE',
    defaultValue: true,
  );
  static const tenantId = String.fromEnvironment(
    'TENANT_ID',
    defaultValue: 'northstar-oman',
  );
  static const environment = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'development',
  );
  static const companyName = String.fromEnvironment(
    'COMPANY_NAME',
    defaultValue: 'Northstar Logistics LLC',
  );
  static const productName = String.fromEnvironment(
    'PRODUCT_NAME',
    defaultValue: 'Northstar People',
  );
  static const defaultLocale = String.fromEnvironment(
    'DEFAULT_LOCALE',
    defaultValue: 'en',
  );
  static const timezone = String.fromEnvironment(
    'TENANT_TIMEZONE',
    defaultValue: 'Asia/Muscat',
  );
  static const currencyCode = String.fromEnvironment(
    'CURRENCY_CODE',
    defaultValue: 'OMR',
  );
  static const countryCode = String.fromEnvironment(
    'COUNTRY_CODE',
    defaultValue: 'OM',
  );
  static const supportEmail = String.fromEnvironment(
    'SUPPORT_EMAIL',
    defaultValue: 'people@northstar.om',
  );
  static const brandColorHex = String.fromEnvironment(
    'BRAND_COLOR',
    defaultValue: '1E2329',
  );
  static Color get brandColor =>
      Color(int.parse('FF$brandColorHex', radix: 16));
  static const connectTimeout = Duration(seconds: 15);
  static const receiveTimeout = Duration(seconds: 20);
}
