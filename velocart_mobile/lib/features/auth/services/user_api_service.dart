import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class UserApiService {
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

  static Future<Map<String, dynamic>> getUserProfile() async {
    try {
      final headers = await _getAuthHeaders();
      final response = await http.get(Uri.parse('$baseUrl/user/profile'), headers: headers);

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        throw "Unauthorized. Session expired.";
      } else {
        final errorData = jsonDecode(response.body);
        throw errorData['message'] ?? "Failed to load profile.";
      }
    } catch (e) {
      rethrow;
    }
  }

  static Future<String> updateUserProfile(Map<String, dynamic> profileData) async {
    try {
      final headers = await _getAuthHeaders();
      final response = await http.put(
        Uri.parse('$baseUrl/user/profile'),
        headers: headers,
        body: jsonEncode(profileData),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body)['message'];
      } else if (response.statusCode == 401) {
        throw "Unauthorized. Session expired.";
      } else {
        throw jsonDecode(response.body)['message'] ?? "Failed to update profile.";
      }
    } catch (e) {
      rethrow;
    }
  }

  // ==========================================
  // NEW: SECURITY ZONE ENDPOINTS
  // ==========================================
  
  static Future<String> changePassword(Map<String, dynamic> data) async {
    try {
      final headers = await _getAuthHeaders();
      final response = await http.put(
        Uri.parse('$baseUrl/user/change-password'),
        headers: headers,
        body: jsonEncode(data),
      );
      if (response.statusCode == 200) return jsonDecode(response.body)['message'];
      throw jsonDecode(response.body)['message'] ?? "Failed to change password.";
    } catch (e) { rethrow; }
  }

  static Future<String> requestEmailChange(Map<String, dynamic> data) async {
    try {
      final headers = await _getAuthHeaders();
      final response = await http.put(
        Uri.parse('$baseUrl/user/change-email'),
        headers: headers,
        body: jsonEncode(data),
      );
      if (response.statusCode == 200) return jsonDecode(response.body)['message'];
      throw jsonDecode(response.body)['message'] ?? "Failed to request email change.";
    } catch (e) { rethrow; }
  }

  static Future<String> deleteAccount(Map<String, dynamic> data) async {
    try {
      final headers = await _getAuthHeaders();
      // http.delete supports body in modern Flutter http package
      final response = await http.delete(
        Uri.parse('$baseUrl/user/account'),
        headers: headers,
        body: jsonEncode(data),
      );
      if (response.statusCode == 200) return jsonDecode(response.body)['message'];
      throw jsonDecode(response.body)['message'] ?? "Failed to delete account.";
    } catch (e) { rethrow; }
  }
}