import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/catalog_models.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../auth/services/auth_api_service.dart';
import 'dart:io';

class CatalogApi {
  static const String baseUrl = 'https://velocart.up.railway.app/api';
  
  // NEW: Store the JWT token after login
  static String? jwtToken;
  
  // Helper to generate secure headers
  static Map<String, String> _getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      if (jwtToken != null) 'Authorization': 'Bearer $jwtToken',
    };
  }

  static Future<List<Category>> getCategories() async {
    final response = await http.get(Uri.parse('$baseUrl/catalog/categories'));
    if (response.statusCode == 200) {
      Iterable l = json.decode(response.body);
      return List<Category>.from(l.map((model) => Category.fromJson(model)));
    } else {
      throw Exception('Failed to load categories');
    }
  }

  static Future<List<Product>> getProducts({
    int? categoryId, String? search, String? minPrice, String? maxPrice,
    String? brand, bool? inStockOnly, String? sortBy
  }) async {
    Map<String, String> queryParams = {};
    if (categoryId != null) queryParams['categoryId'] = categoryId.toString();
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (minPrice != null && minPrice.isNotEmpty) queryParams['minPrice'] = minPrice;
    if (maxPrice != null && maxPrice.isNotEmpty) queryParams['maxPrice'] = maxPrice;
    if (brand != null && brand.isNotEmpty) queryParams['brand'] = brand;
    if (inStockOnly == true) queryParams['inStockOnly'] = 'true';
    if (sortBy != null && sortBy.isNotEmpty) queryParams['sortBy'] = sortBy;

    final uri = Uri.parse('$baseUrl/catalog/products').replace(queryParameters: queryParams);
    final response = await http.get(uri);
    
    if (response.statusCode == 200) {
      Iterable l = json.decode(response.body);
      return List<Product>.from(l.map((model) => Product.fromJson(model)));
    } else {
      throw Exception('Failed to load products');
    }
  }

  static Future<Product> getProductById(int id) async {
    final response = await http.get(Uri.parse('$baseUrl/catalog/products/$id'));
    if (response.statusCode == 200) {
      return Product.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to load product details');
    }
  }

  // SECURED: Removed userId, added auth headers
  static Future<void> addToCart(int productVariantId, int quantity) async {
    final response = await http.post(
      Uri.parse('$baseUrl/cart/add'),
      headers: _getAuthHeaders(),
      body: json.encode({
        'productVariantId': productVariantId,
        'quantity': quantity,
      }),
    );
    if (response.statusCode != 200) {
      final errorData = json.decode(response.body);
      throw Exception(errorData['message'] ?? 'Failed to add item to cart.');
    }
  }

  // SECURED: Removed userId from URL, added auth headers
  static Future<Map<String, dynamic>> getCart() async {
    final response = await http.get(
      Uri.parse('$baseUrl/cart'), 
      headers: _getAuthHeaders()
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load cart summary');
    }
  }

  // SECURED: Added auth headers
  static Future<void> updateCartItem(int cartItemId, int quantity) async {
    final response = await http.put(
      Uri.parse('$baseUrl/cart/update/$cartItemId'),
      headers: _getAuthHeaders(),
      body: json.encode({'quantity': quantity}),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to update cart item.');
    }
  }

  // SECURED: Added auth headers
  static Future<void> removeCartItem(int cartItemId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/cart/remove/$cartItemId'),
      headers: _getAuthHeaders()
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to remove cart item.');
    }
  }

  // SECURED: Removed userId from payload, added auth headers
  static Future<Map<String, dynamic>> checkoutOrder({
    required String deliveryAddress,
    required double expectedTotal,
    required bool forceCheckout,
    required String paymentMethod,
    required String idempotencyKey,
    required int pointsToRedeem // NEW PARAMETER
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('velocart_token');

      final response = await http.post(
        Uri.parse('${AuthApiService.baseUrl}/orders/checkout'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'deliveryAddress': deliveryAddress,
          'deliveryMethod': "STANDARD",
          'expectedTotal': expectedTotal,
          'forceCheckout': forceCheckout,
          'paymentMethod': paymentMethod,
          'idempotencyKey': idempotencyKey,
          'pointsToRedeem': pointsToRedeem // ADDED TO PAYLOAD
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 409) {
        final data = jsonDecode(response.body);
        data['statusCode'] = response.statusCode;
        return data;
      } else {
        throw jsonDecode(response.body)['message'] ?? "Checkout failed.";
      }
    } catch (e) {
      rethrow;
    }
  }

  // SECURED: Removed userId from URL, added auth headers
  static Future<List<dynamic>> getOrderHistory() async {
    final response = await http.get(
      Uri.parse('$baseUrl/orders/history'),
      headers: _getAuthHeaders()
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else if (response.statusCode == 404) {
      return []; 
    } else {
      throw Exception('Failed to load order history');
    }
  }

  // SECURED: Removed userId from payload, added auth headers
  static Future<void> submitReview(int productId, int rating, String comment) async {
    final response = await http.post(
      Uri.parse('$baseUrl/reviews'),
      headers: _getAuthHeaders(),
      body: json.encode({
        'productId': productId,
        'rating': rating,
        'comment': comment
      }),
    );
    if (response.statusCode != 200) {
      final errorData = json.decode(response.body);
      throw Exception(errorData['message'] ?? 'Failed to submit review.');
    }
  }

  static Future<List<dynamic>> getProductReviews(int productId) async {
    final response = await http.get(Uri.parse('$baseUrl/reviews/product/$productId'));
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load reviews');
    }
  }

  // NEW: SMART REORDER
  static Future<Map<String, dynamic>> reorderItems(int orderId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/orders/$orderId/reorder'),
      headers: _getAuthHeaders(),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception(json.decode(response.body)['message'] ?? 'Failed to reorder items');
    }
  }

  // NEW: CANCEL ORDER
  static Future<Map<String, dynamic>> cancelOrder(int orderId) async {
    final response = await http.put(
      Uri.parse('$baseUrl/orders/$orderId/cancel'),
      headers: _getAuthHeaders(),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception(json.decode(response.body)['message'] ?? 'Failed to cancel order');
    }
  }

  // NEW: Confirm Receipt (Completes the order lifecycle)
  static Future<String> confirmReceipt(int orderId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/orders/$orderId/confirm-receipt'),
      headers: _getAuthHeaders()
    );
    if (response.statusCode == 200) {
      return json.decode(response.body)['message'];
    } else {
      throw Exception(json.decode(response.body)['message'] ?? 'Failed to confirm receipt');
    }
  }

  static Future<String> submitComplaint(int orderId, String subject, String description, {File? imageFile}) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('velocart_token') ?? '';

    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/orders/$orderId/complaints'));
    request.headers['Authorization'] = 'Bearer $token';
    // Do NOT set Content-Type to application/json; MultipartRequest sets its own boundary.

    request.fields['subject'] = subject;
    request.fields['description'] = description;

    if (imageFile != null) {
      request.files.add(await http.MultipartFile.fromPath('image', imageFile.path));
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      return json.decode(response.body)['message'];
    } else {
      throw Exception(json.decode(response.body)['message'] ?? 'Failed to submit complaint');
    }
  }

  // NEW: CHOOSE REFUND METHOD
  static Future<Map<String, dynamic>> chooseRefundMethod(int complaintId, String refundMethod) async {
    final url = Uri.parse('$baseUrl/orders/complaints/$complaintId/choose-refund');
    final response = await http.put(
      url,
      headers: _getAuthHeaders(),
      body: jsonEncode({'refundMethod': refundMethod}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Failed to submit refund choice.');
    }
  }
}

