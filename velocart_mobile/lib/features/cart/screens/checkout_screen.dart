import 'package:flutter/material.dart';
import 'dart:math';
import 'package:url_launcher/url_launcher.dart';
import '../../catalog/api/catalog_api.dart';
import '../../auth/services/auth_api_service.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CheckoutScreen extends StatefulWidget {
  final Map<String, dynamic> cartData;
  const CheckoutScreen({Key? key, required this.cartData}) : super(key: key);

  @override
  _CheckoutScreenState createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  String deliveryAddress = '';
  TextEditingController addressController = TextEditingController();
  bool isEditingAddress = false;
  bool isLoadingData = true;

  int userPointsBalance = 0;
  int pointsToRedeem = 0;

  String paymentMethod = 'CARD';
  String idempotencyKey = '';
  String gatewayStatus = '';
  bool isCheckingOut = false;
  Map<String, dynamic>? checkoutSuccess;

  @override
  void initState() {
    super.initState();
    _generateIdempotencyKey();
    _fetchUserData();
  }

  void _generateIdempotencyKey() {
    final rand = Random();
    idempotencyKey = '${DateTime.now().millisecondsSinceEpoch}-${rand.nextInt(999999)}';
  }

  Future<void> _fetchUserData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('velocart_token');

      final addressRes = await http.get(Uri.parse('${AuthApiService.baseUrl}/Address'), headers: {'Authorization': 'Bearer $token'});
      if (addressRes.statusCode == 200) {
        final List addresses = jsonDecode(addressRes.body);
        if (addresses.isNotEmpty) {
           final def = addresses.firstWhere((a) => a['isDefault'] == true, orElse: () => addresses[0]);
           deliveryAddress = "${def['streetLine1']}${def['streetLine2'] != null ? ', ' + def['streetLine2'] : ''}, ${def['city']}, ${def['postalCode']}, ${def['country']}";
        }
      }
      addressController.text = deliveryAddress;

      final loyaltyRes = await http.get(Uri.parse('${AuthApiService.baseUrl}/Loyalty/dashboard'), headers: {'Authorization': 'Bearer $token'});
      if (loyaltyRes.statusCode == 200) {
        userPointsBalance = jsonDecode(loyaltyRes.body)['currentPointsBalance'] ?? 0;
      }
      setState(() => isLoadingData = false);
    } catch (e) {
      setState(() => isLoadingData = false);
    }
  }

  // PRESERVED LOGIC: 409 Conflict Dialog
  void _showPriceConflictDialog(Map<String, dynamic> conflictData) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 30),
            SizedBox(width: 10),
            Text("Price Changed!"),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(conflictData['message'], style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(15),
              decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(10)),
              child: Column(
                children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text("Old Total:", style: TextStyle(color: Colors.grey)),
                    Text("Rs. ${widget.cartData['grandTotal'].toStringAsFixed(2)}", style: const TextStyle(decoration: TextDecoration.lineThrough, color: Colors.grey)),
                  ]),
                  const SizedBox(height: 10),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text("New Total:", style: TextStyle(fontWeight: FontWeight.bold)),
                    Text("Rs. ${conflictData['actualTotal'].toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange, fontSize: 18)),
                  ]),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context, true); // Return to cart to fetch updated prices
            },
            child: const Text("Cancel", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            onPressed: () {
              Navigator.pop(ctx);
              _handlePlaceOrder(force: true); 
            },
            child: const Text("Accept & Proceed", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<void> _handlePlaceOrder({bool force = false}) async {
    setState(() => isCheckingOut = true);
    
    if (paymentMethod == 'CARD') {
      setState(() => gatewayStatus = "Connecting to secure payment gateway...");
    }

    try {
      final responseData = await CatalogApi.checkoutOrder(
        deliveryAddress: deliveryAddress.isEmpty ? "123 Default Street, Colombo" : deliveryAddress,
        expectedTotal: widget.cartData['grandTotal'],
        forceCheckout: force,
        paymentMethod: paymentMethod,
        idempotencyKey: idempotencyKey,
        pointsToRedeem: pointsToRedeem
      );

      // PRESERVED LOGIC: Catching the 409 Conflict
      if (responseData['statusCode'] == 409) {
        setState(() { isCheckingOut = false; gatewayStatus = ''; });
        _generateIdempotencyKey(); 
        _showPriceConflictDialog(responseData);
        return;
      }

      if (responseData['stripeUrl'] != null && responseData['stripeUrl'].toString().isNotEmpty) {
        final Uri stripeUri = Uri.parse(responseData['stripeUrl']);
        if (!await launchUrl(stripeUri, mode: LaunchMode.externalApplication)) {
          throw 'Could not launch secure payment gateway.';
        }
        if (mounted) { Navigator.pop(context, true); } 
        return;
      }

      setState(() {
        checkoutSuccess = responseData;
        isCheckingOut = false;
        gatewayStatus = '';
      });
    } catch (e) {
      setState(() { isCheckingOut = false; gatewayStatus = ''; });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (gatewayStatus.isNotEmpty) {
      return Scaffold(
        backgroundColor: const Color(0xFF050505),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(color: Color(0xFFD4AF37)),
              const SizedBox(height: 24),
              Text(gatewayStatus, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text("Please do not close the app or press back.", style: TextStyle(color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    if (checkoutSuccess != null) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white, elevation: 0,
          leading: IconButton(icon: const Icon(Icons.close, color: Colors.black87), onPressed: () { Navigator.pop(context, true); }),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(30.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle, size: 100, color: Colors.green),
                const SizedBox(height: 20),
                const Text("Order Confirmed!", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87)),
                const SizedBox(height: 10),
                Text("Payment Status: ${checkoutSuccess!['paymentStatus']}", textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey, fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 40),
                Container(
                  width: double.infinity, padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.grey.shade200)),
                  child: Column(
                    children: [
                      const Text("Order Number", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 5),
                      Text(checkoutSuccess!['orderNumber'], style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFFD4AF37))),
                      const Padding(padding: EdgeInsets.symmetric(vertical: 15), child: Divider()),
                      const Text("Amount Paid", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 5),
                      Text("Rs. ${checkoutSuccess!['grandTotal'].toStringAsFixed(2)}", style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.black87)),
                    ],
                  ),
                ),
                const SizedBox(height: 40),
                SizedBox(
                  width: double.infinity, height: 55,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.black87, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
                    onPressed: () { Navigator.pop(context, true); },
                    child: const Text("Continue Shopping", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    double finalTotal = (widget.cartData['grandTotal'] ?? 0.0) - pointsToRedeem;
    if (finalTotal < 0) finalTotal = 0;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: const Text("Review & Delivery", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: isLoadingData ? const Center(child: CircularProgressIndicator(color: Color(0xFFD4AF37))) : ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.grey.shade200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Delivery Address", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    TextButton(
                      onPressed: () => setState(() => isEditingAddress = !isEditingAddress),
                      child: Text(isEditingAddress ? "Save" : "Edit", style: const TextStyle(color: Color(0xFFD4AF37), fontWeight: FontWeight.bold)),
                    )
                  ],
                ),
                const SizedBox(height: 10),
                isEditingAddress 
                  ? TextField(
                      controller: addressController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: "Enter full delivery address",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFD4AF37)))
                      ),
                      onChanged: (val) => deliveryAddress = val,
                    )
                  : Text(deliveryAddress.isEmpty ? "No address saved. Please edit." : deliveryAddress, style: const TextStyle(color: Colors.black87)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.grey.shade200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Loyalty Rewards", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text("$userPointsBalance pts", style: const TextStyle(color: Color(0xFFD4AF37), fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: "Points to spend",
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10)
                        ),
                        onChanged: (val) {
                          int parsed = int.tryParse(val) ?? 0;
                          setState(() => pointsToRedeem = parsed > userPointsBalance ? userPointsBalance : parsed);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.grey[200], foregroundColor: Colors.black),
                      onPressed: () => setState(() => pointsToRedeem = userPointsBalance),
                      child: const Text("MAX"),
                    )
                  ],
                ),
                if (pointsToRedeem > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text("Applying $pointsToRedeem points (-Rs. $pointsToRedeem.00)", style: const TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                  )
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.grey.shade200)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Payment Method", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => paymentMethod = 'CARD'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(color: paymentMethod == 'CARD' ? const Color(0xFFD4AF37).withOpacity(0.1) : Colors.transparent, border: Border.all(color: paymentMethod == 'CARD' ? const Color(0xFFD4AF37) : Colors.grey.shade300), borderRadius: BorderRadius.circular(10)),
                          child: Column(children: [Icon(Icons.credit_card, color: paymentMethod == 'CARD' ? const Color(0xFFD4AF37) : Colors.grey), const SizedBox(height: 4), Text("Card", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: paymentMethod == 'CARD' ? const Color(0xFFD4AF37) : Colors.grey))]),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => paymentMethod = 'COD'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(color: paymentMethod == 'COD' ? const Color(0xFFD4AF37).withOpacity(0.1) : Colors.transparent, border: Border.all(color: paymentMethod == 'COD' ? const Color(0xFFD4AF37) : Colors.grey.shade300), borderRadius: BorderRadius.circular(10)),
                          child: Column(children: [Icon(Icons.money, color: paymentMethod == 'COD' ? const Color(0xFFD4AF37) : Colors.grey), const SizedBox(height: 4), Text("Cash", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: paymentMethod == 'COD' ? const Color(0xFFD4AF37) : Colors.grey))]),
                        ),
                      ),
                    )
                  ],
                ),
              ],
            ),
          )
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, -5))]),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Grand Total", style: TextStyle(color: Colors.grey, fontSize: 16)),
                  Text("Rs. ${finalTotal.toStringAsFixed(2)}", style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFFD4AF37))),
                ],
              ),
              const SizedBox(height: 15),
              SizedBox(
                width: double.infinity, height: 55,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD4AF37), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
                  onPressed: isCheckingOut || deliveryAddress.isEmpty ? null : () => _handlePlaceOrder(force: false),
                  child: isCheckingOut 
                    ? const Row(mainAxisAlignment: MainAxisAlignment.center, children: [SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)), SizedBox(width: 10), Text("Processing...", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white))])
                    : Text(paymentMethod == 'CARD' ? "Pay Securely" : "Place Order", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}