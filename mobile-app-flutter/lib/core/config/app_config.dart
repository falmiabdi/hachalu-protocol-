
library;

import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

abstract final class AppConfig {
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  static const String _devLanBase = 'http://172.29.2.7:4000';
  static const String _realApiBase = 'https://api.jebugeneraltrading.com';

  static List<String> get apiBaseCandidates {
    const override = String.fromEnvironment('API_BASE_URL');
    final list = <String>[];
    if (override.isNotEmpty) list.add(override);
    list.add(_realApiBase);
    list.add(_devLanBase);
    if (!kIsWeb && Platform.isAndroid) {
      list.add('http://10.0.2.2:4000');
      list.add('http://localhost:4000');
    } else {
      list.add('http://localhost:4000');
    }
    return list.toSet().toList();
  }

  
  
  static String get apiBaseUrl => apiBaseCandidates.first;

  
  
  
  static const Duration connectTimeout = Duration(seconds: 30);

  
  
  
  static const Duration receiveTimeout = Duration(seconds: 60);
static const String authTokenKey = 'auth_token';
  static const String cachedUserKey = 'auth_user';
  static const String languageKey = 'hachalu_lang';

  
  

  static const String appName = 'Hachalu Protocol';
  static const String appTagline = 'Ethiopian Garment Manufacturing & Custom Tailoring';
  static const String playStorePackageId = 'com.hachalu.mobile';

  static String webShareBaseUrl = 'https://hachalu.jebugeneraltrading.com';

  
  static String get playStoreUrl =>
      'https://play.google.com/store/apps/details?id=$playStorePackageId';
}
