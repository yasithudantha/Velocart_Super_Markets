import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AddressApiService {
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

  static Future<List<dynamic>> getAddresses() async {
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/address'), headers: headers);
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw "Failed to load addresses.";
  }

  static Future<String> addAddress(Map<String, dynamic> data) async {
    final headers = await _getAuthHeaders();
    final response = await http.post(Uri.parse('$baseUrl/address'), headers: headers, body: jsonEncode(data));
    
    if (response.statusCode == 200) return jsonDecode(response.body)['message'];
    throw jsonDecode(response.body)['message'] ?? "Failed to add address.";
  }

  static Future<String> updateAddress(int id, Map<String, dynamic> data) async {
    final headers = await _getAuthHeaders();
    final response = await http.put(Uri.parse('$baseUrl/address/$id'), headers: headers, body: jsonEncode(data));
    
    if (response.statusCode == 200) return jsonDecode(response.body)['message'];
    throw jsonDecode(response.body)['message'] ?? "Failed to update address.";
  }

  static Future<String> deleteAddress(int id) async {
    final headers = await _getAuthHeaders();
    final response = await http.delete(Uri.parse('$baseUrl/address/$id'), headers: headers);
    
    if (response.statusCode == 200) return jsonDecode(response.body)['message'];
    throw jsonDecode(response.body)['message'] ?? "Failed to delete address.";
  }
}