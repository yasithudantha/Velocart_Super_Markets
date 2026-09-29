import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../auth/services/auth_api_service.dart';

class AiAgentApi {
  // 1. Send Chat Message to AI
  static Future<Map<String, dynamic>> sendChatMessage(String message) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('velocart_token');

      print("DEBUG: Sending chat with token: ${token != null ? 'EXISTS' : 'NULL'}");

      final response = await http.post(
        Uri.parse('${AuthApiService.baseUrl}/CustomerAgent/chat'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'message': message}),
      );

      print("DEBUG: Response Code = ${response.statusCode}");
      print("DEBUG: Response Body = ${response.body}");

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw "Server returned ${response.statusCode}: ${response.body}";
      }
    } catch (e) {
      print("DEBUG: Network/API Exception: $e");
      rethrow;
    }
  }

  // 2. Safely add AI-approved items to the cart
  static Future<void> approveAndAddToCart(int productVariantId, int quantity) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('velocart_token');

      final response = await http.post(
        Uri.parse('${AuthApiService.baseUrl}/Cart/add'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'productVariantId': productVariantId,
          'quantity': quantity
        }),
      );

      if (response.statusCode != 200) {
        throw "Item might be out of stock.";
      }
    } catch (e) {
      rethrow;
    }
  }
}