import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class NotificationApiService {
  static String get baseUrl {
    if (kIsWeb) return 'https://velocart.up.railway.app/api';
    if (Platform.isAndroid) return 'https://velocart.up.railway.app/api';
    return 'https://velocart.up.railway.app/api';
  }

  static Future<Map<String, String>> _getAuthHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('velocart_token') ?? '';
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  static Future<List<dynamic>> getNotifications() async {
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/notifications'), headers: headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception("Failed to load notifications.");
  }

  static Future<void> markAsRead(int id) async {
    final headers = await _getAuthHeaders();
    final response = await http.put(Uri.parse('$baseUrl/notifications/$id/read'), headers: headers);
    if (response.statusCode != 200) throw Exception("Failed to update notification.");
  }

  static Future<void> markAllAsRead() async {
    final headers = await _getAuthHeaders();
    final response = await http.put(Uri.parse('$baseUrl/notifications/read-all'), headers: headers);
    if (response.statusCode != 200) throw Exception("Failed to clear notifications.");
  }
}