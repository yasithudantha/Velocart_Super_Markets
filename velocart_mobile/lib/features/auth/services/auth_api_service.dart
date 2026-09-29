import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AuthApiService {
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:5176/api';
    if (Platform.isAndroid) return 'http://10.0.2.2:5176/api';
    return 'http://localhost:5176/api';
  }

  // --- NEW VERSION 7 GOOGLE API SETUP ---
  static final GoogleSignIn googleSignInInstance = GoogleSignIn.instance;
  static bool _isGoogleInitialized = false;

  static Future<void> ensureGoogleInitialized() async {
    if (!_isGoogleInitialized) {
      await googleSignInInstance.initialize(
        // clientId is used by iOS and Web
        clientId: '994236263523-4im3g1rrmvgpp7al8nmi6qpfhldipfda.apps.googleusercontent.com',
        
        // serverClientId is REQUIRED by Android to generate the ID Token for our ASP.NET API!
        serverClientId: '994236263523-4im3g1rrmvgpp7al8nmi6qpfhldipfda.apps.googleusercontent.com',
      );
      _isGoogleInitialized = true;
    }
  }
  // ----------------------------------------

  static Future<String> registerUser(Map<String, dynamic> userData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(userData),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body)['message'];
      } else if (response.statusCode == 400) {
        final errorData = jsonDecode(response.body);
        if (errorData['errors'] != null) throw errorData['errors'].values.first[0];
        throw errorData['message'] ?? "Invalid registration data.";
      } else {
        throw "Server error. Please check your connection.";
      }
    } catch (e) {
      rethrow;
    }
  }

  static Future<String> loginUser(Map<String, dynamic> credentials) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(credentials),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('velocart_token', data['token']);
        await prefs.setString('velocart_user', jsonEncode(data['user']));
        return data['message'];
      } else if (response.statusCode == 400) {
        final errorData = jsonDecode(response.body);
        throw errorData['message'] ?? "Invalid login credentials.";
      } else {
        throw "Server error. Please check your connection.";
      }
    } catch (e) {
      rethrow;
    }
  }

  static Future<String> requestPasswordReset(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );
      if (response.statusCode == 200) return jsonDecode(response.body)['message'];
      throw jsonDecode(response.body)['message'] ?? "Failed to request reset.";
    } catch (e) {
      rethrow;
    }
  }

  static Future<String> resetPassword(Map<String, dynamic> resetData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(resetData),
      );
      if (response.statusCode == 200) return jsonDecode(response.body)['message'];
      throw jsonDecode(response.body)['message'] ?? "Failed to reset password.";
    } catch (e) {
      rethrow;
    }
  }

  static Future<String> googleAuth(String idToken) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/google'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': idToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('velocart_token', data['token']);
        await prefs.setString('velocart_user', jsonEncode(data['user']));
        return data['message'];
      } else {
        throw jsonDecode(response.body)['message'] ?? "Google authentication failed.";
      }
    } catch (e) {
      rethrow;
    }
  }
}