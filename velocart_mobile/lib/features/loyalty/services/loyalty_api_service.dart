import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class LoyaltyApiService {
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:5176/api';
    if (Platform.isAndroid) return 'http://10.0.2.2:5176/api';
    return 'http://localhost:5176/api';
  }

  static Future<Map<String, String>> _getAuthHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('velocart_token') ?? '';
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  static Future<Map<String, dynamic>> getDashboard() async {
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/loyalty/dashboard'), headers: headers);
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception("Failed to load loyalty points.");
    }
  }
}