import 'package:flutter/material.dart';
import 'dart:io'; 
import '../../catalog/api/catalog_api.dart';
import '../../auth/services/auth_api_service.dart';
import '../../cart/screens/cart_screen.dart'; 
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({Key? key}) : super(key: key);

  @override
  _OrderHistoryScreenState createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  List<dynamic> orders = [];
  bool isLoading = true;
  int? reorderingId;
  int? cancellingId;
  int? confirmingId;
  int? refundingComplaintId; // NEW: Tracks the loading state of refund choices

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    try {
      final data = await CatalogApi.getOrderHistory();

      setState(() {
        orders = data;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _handleReorder(int orderId) async {
    setState(() => reorderingId = orderId);

    try {
      final response = await CatalogApi.reorderItems(orderId);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response['message']),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => const CartScreen(),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceAll('Exception: ', ''),
          ),
          backgroundColor: Colors.orange,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => reorderingId = null);
      }
    }
  }

    // THE FIX: Add the 'isPaidCard' parameter
    Future<void> _handleCancelOrder(int orderId, bool isPaidCard) async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text("Cancel Order"),
          content: Text(
            isPaidCard 
                ? "Are you sure you want to cancel this order?\n\n" "Note: Your card refund will take 2-3 business days to process."
                : "Are you sure you want to cancel this order?",
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
          actions: [
            TextButton(
              child: const Text("No", style: TextStyle(color: Colors.grey),),
              onPressed: () => Navigator.of(context).pop(false),
            ),
           TextButton(
              child: const Text("Yes, Cancel", style: TextStyle(color: Colors.red)),
              onPressed: () => Navigator.of(context).pop(true),
            ),
          ],
        );
      },
    );
          

    if (confirm != true) return;

    setState(() => cancellingId = orderId);

    try {
      final response = await CatalogApi.cancelOrder(orderId);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response['message']),
          backgroundColor: Colors.green,
        ),
      );

      _fetchOrders();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceAll('Exception: ', ''),
          ),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => cancellingId = null);
    }
  }

  Future<void> _handleConfirmReceipt(int orderId) async {
    setState(() => confirmingId = orderId);

    try {
      final msg = await CatalogApi.confirmReceipt(orderId);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: Colors.green,
        ),
      );

      _fetchOrders();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceAll('Exception: ', ''),
          ),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => confirmingId = null);
    }
  }

  // ============================================================
  // NEW: HANDLE REFUND CHOICE SUBMISSION
  // ============================================================
  Future<void> _handleChooseRefund(int complaintId, String method) async {
    setState(() => refundingComplaintId = complaintId);

    try {
      final response = await CatalogApi.chooseRefundMethod(complaintId, method);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response['message']),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 4),
        ),
      );

      _fetchOrders(); // Refresh to update status
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => refundingComplaintId = null);
    }
  }

  void _showComplaintDialog(int orderId) {
    final _subjectCtrl = TextEditingController();
    final _descCtrl = TextEditingController();
    File? _selectedImage;
    bool _isSubmittingComplaint = false;
    final ImagePicker _picker = ImagePicker();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.report_problem, color: Colors.orange),
              SizedBox(width: 10),
              Text("Report a Problem"),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Is something missing or damaged? Let our Delivery Manager know.",
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 15),
                TextField(
                  controller: _subjectCtrl,
                  decoration: InputDecoration(
                    labelText: "Subject",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _descCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: "Description",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 15),
                
                // --- NEW DEVICE FEATURE UI ---
                const Text("Upload Photo (Optional)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 8),
                InkWell(
                  onTap: () async {
                    try {
                      final XFile? image = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70); // Uses Native Camera
                      if (image != null) {
                        setModalState(() => _selectedImage = File(image.path));
                      }
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Camera permission denied."), backgroundColor: Colors.red));
                    }
                  },
                  child: Container(
                    width: double.infinity,
                    height: _selectedImage == null ? 80 : 150,
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      border: Border.all(color: Colors.orange.shade200, style: BorderStyle.solid),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: _selectedImage == null 
                        ? const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.camera_alt, color: Colors.orange),
                              SizedBox(height: 4),
                              Text("Tap to open Camera", style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.bold))
                            ],
                          )
                        : ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.file(_selectedImage!, fit: BoxFit.cover),
                          ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text("Cancel", style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _isSubmittingComplaint
                  ? null
                  : () async {
                      if (_subjectCtrl.text.isEmpty || _descCtrl.text.isEmpty) return;

                      setModalState(() => _isSubmittingComplaint = true);
                      try {
                        final msg = await CatalogApi.submitComplaint(
                          orderId,
                          _subjectCtrl.text,
                          _descCtrl.text,
                          imageFile: _selectedImage, // Pass the native file
                        );
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.green));
                        _fetchOrders();
                      } catch (e) {
                        setModalState(() => _isSubmittingComplaint = false);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: Colors.red));
                      }
                    },
              child: _isSubmittingComplaint
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text("Submit", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  void _showReviewDialog(
    int productId,
    String productName,
  ) {
    int selectedRating = 5;
    TextEditingController commentCtrl = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(25),
        ),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context)
                    .viewInsets
                    .bottom,
                left: 24,
                right: 24,
                top: 30,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(
                        Icons.verified,
                        color: Color(0xFFD4AF37),
                        size: 18,
                      ),
                      SizedBox(width: 8),
                      Text(
                        "Verified Purchase",
                        style: TextStyle(
                          color: Color(0xFFD4AF37),
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    "Review $productName",
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 30),
                  const Text(
                    "Rating",
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment:
                        MainAxisAlignment.center,
                    children: List.generate(
                      5,
                      (index) {
                        return IconButton(
                          icon: Icon(
                            index < selectedRating
                                ? Icons.star
                                : Icons.star_border,
                            size: 40,
                          ),
                          color: index < selectedRating
                              ? const Color(0xFFD4AF37)
                              : Colors.grey.shade300,
                          onPressed: () {
                            setModalState(
                              () => selectedRating =
                                  index + 1,
                            );
                          },
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 30),
                  const Text(
                    "Your Experience (Optional)",
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: commentCtrl,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText:
                          "What did you like or dislike?",
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      border: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(15),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 30),
                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            const Color(0xFFD4AF37),
                        shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(15),
                        ),
                        elevation: 0,
                      ),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              setModalState(
                                () => isSubmitting = true,
                              );

                              try {
                                await CatalogApi.submitReview(
                                  productId,
                                  selectedRating,
                                  commentCtrl.text,
                                );

                                Navigator.pop(context);

                                ScaffoldMessenger.of(context)
                                    .showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      "Review submitted successfully!",
                                    ),
                                    backgroundColor:
                                        Colors.green,
                                  ),
                                );
                              } catch (e) {
                                setModalState(
                                  () => isSubmitting = false,
                                );

                                ScaffoldMessenger.of(context)
                                    .showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      e.toString().replaceAll(
                                          'Exception: ', ''),
                                    ),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            },
                      child: isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child:
                                  CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text(
                              "Submit Review",
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _downloadReceiptAsText(
    Map<String, dynamic> receiptData,
  ) async {
    try {
      final String orderNumber =
          receiptData['orderNumber'];

      final String fileName =
          'Velocart_Receipt_$orderNumber.txt';

      final directory =
          Directory('/storage/emulated/0/Download');

      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }

      final file =
          File('${directory.path}/$fileName');

      StringBuffer buffer = StringBuffer();

      buffer.writeln(
          "====================================");
      buffer.writeln(
          " VELOCART - Official Digital Receipt");
      buffer.writeln(
          "====================================\n");

      buffer.writeln(
          "BILLED TO: ${receiptData['customerName']}");
      buffer.writeln(
          "EMAIL: ${receiptData['customerEmail']}\n");

      buffer.writeln(
          "ORDER NO: $orderNumber");
      buffer.writeln(
          "STATUS: ${receiptData['paymentStatus']}\n");

      buffer.writeln(
          "------------------------------------");
      buffer.writeln("ITEMS:");

      for (var item in receiptData['items']) {
        buffer.writeln(
          "${item['quantity']}x ${item['productName']} - Rs. ${item['total'].toStringAsFixed(2)}",
        );
      }

      buffer.writeln(
          "------------------------------------");

      buffer.writeln(
        "Subtotal:         Rs. ${receiptData['subtotal'].toStringAsFixed(2)}",
      );

      if (receiptData['discountAmount'] > 0) {
        buffer.writeln(
          "Promotions:      -Rs. ${receiptData['discountAmount'].toStringAsFixed(2)}",
        );
      }

      if (receiptData['loyaltyDiscountAmount'] > 0) {
        buffer.writeln(
          "Loyalty Pts:     -Rs. ${receiptData['loyaltyDiscountAmount'].toStringAsFixed(2)}",
        );
      }

      buffer.writeln(
        "VAT/Taxes:        Rs. ${receiptData['taxAmount'].toStringAsFixed(2)}",
      );

      buffer.writeln(
        "Delivery:         Rs. ${receiptData['deliveryFee'].toStringAsFixed(2)}",
      );

      buffer.writeln(
          "------------------------------------");

      buffer.writeln(
        "GRAND TOTAL:      Rs. ${receiptData['grandTotal'].toStringAsFixed(2)}",
      );

      buffer.writeln(
          "====================================");

      await file.writeAsString(
        buffer.toString(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              "Receipt downloaded to Downloads folder ($fileName)",
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              "Download failed. Storage permission might be required.",
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _showDeliveryDetailsDialog(Map<String, dynamic> order) async {
    int orderId = order['id'];
    String orderStatus = order['orderStatus'];
    bool isConfirmed = order['isCustomerConfirmed'] == true;
    
    // STRICT CONSTRAINT: Only show map if Delivering, or Delivered but not yet confirmed
    bool showMap = orderStatus == 'DELIVERING' || (orderStatus == 'DELIVERED' && !isConfirmed);
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(
        child: CircularProgressIndicator(
          color: Color(0xFFD4AF37),
        ),
      ),
    );

    try {
      final prefs =
          await SharedPreferences.getInstance();

      final token = prefs.getString('velocart_token') ??
          prefs.getString('token');

      final res = await http.get(
        Uri.parse(
          '${AuthApiService.baseUrl}/orders/$orderId/delivery-details',
        ),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      final locRes = await http.get(
        Uri.parse('${AuthApiService.baseUrl}/orders/$orderId/locations'),
        headers: {'Authorization': 'Bearer $token'},
      );

      Navigator.pop(context); // Close spinner

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);

        if (data['message'] != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(data['message']),
              backgroundColor: Colors.orange,
            ),
          );
          return;
        }

        showDialog(
          context: context,
          builder: (ctx) => Dialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            child: Container(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment:
                        MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(
                            Icons.local_shipping,
                            color: Colors.blue,
                          ),
                          SizedBox(width: 8),
                          Text(
                            "Delivery Tracking",
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () =>
                            Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    "Tracking Number",
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  Text(
                    data['deliveryNumber'] ??
                        'Pending Assignment',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 15),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment:
                              CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Est. Date",
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey,
                              ),
                            ),
                            Text(
                              data['estimatedDeliveryDate'] !=
                                      null
                                  ? DateTime.parse(
                                      data[
                                          'estimatedDeliveryDate'],
                                    )
                                      .toLocal()
                                      .toString()
                                      .split(' ')[0]
                                  : 'TBD',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment:
                              CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Est. Time",
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey,
                              ),
                            ),
                            Text(
                              data[
                                      'estimatedDeliveryTime'] ??
                                  'TBD',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 15),
                  const Text(
                    "Assigned Driver",
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  Text(
                    data['assignedDriverName'] ??
                        'Assigning...',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (data['assignedDriverContact'] !=
                          null &&
                      data['assignedDriverContact']
                          .isNotEmpty)
                    Text(
                      data['assignedDriverContact'],
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 12,
                      ),
                    ),
                  if (data['deliveryNotes'] != null &&
                      data['deliveryNotes'].isNotEmpty) ...[
                    const SizedBox(height: 15),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius:
                            BorderRadius.circular(10),
                      ),
                      child: Column(
                        crossAxisAlignment:
                            CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Update from Delivery Team:",
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            data['deliveryNotes'],
                            style: const TextStyle(
                              color: Colors.blue,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  // --- NEW: CUSTOMER LIVE TRACKING MAP ---
                  if (showMap && locRes.statusCode == 200 && jsonDecode(locRes.body).isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Row(
                      children: [
                        Icon(Icons.pin_drop, color: Colors.blue, size: 16),
                        SizedBox(width: 6),
                        Text("Live Tracking", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      height: 200,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.black12),
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(15),
                        child: FlutterMap(
                          options: MapOptions(
                            // Center map on the most recent location
                            initialCenter: LatLng(jsonDecode(locRes.body)[0]['latitude'], jsonDecode(locRes.body)[0]['longitude']),
                            initialZoom: 13.0,
                          ),
                          children: [
                            TileLayer(
                              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                              userAgentPackageName: 'com.velocart.app', // Required by OSM policy
                            ),
                            MarkerLayer(
                              markers: (jsonDecode(locRes.body) as List).map((loc) => Marker(
                                point: LatLng(loc['latitude'], loc['longitude']),
                                width: 40,
                                height: 40,
                                child: const Icon(Icons.location_on, color: Colors.red, size: 36),
                              )).toList(),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    
                    // Timeline History
                    Container(
                      constraints: const BoxConstraints(maxHeight: 120),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: jsonDecode(locRes.body).length,
                        itemBuilder: (ctx, i) {
                          final loc = jsonDecode(locRes.body)[i];
                          final time = DateTime.parse(loc['timestamp']).toLocal();
                          return ListTile(
                            dense: true,
                            leading: const Icon(Icons.my_location, size: 16, color: Colors.blue),
                            title: Text(loc['placeName'], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                            subtitle: Text("${time.day}/${time.month}/${time.year}  ${time.hour}:${time.minute.toString().padLeft(2, '0')}", style: const TextStyle(fontSize: 10)),
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content:
                Text("Failed to load delivery info."),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _showReceiptDialog(
    int orderId,
  ) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(
        child: CircularProgressIndicator(
          color: Color(0xFFD4AF37),
        ),
      ),
    );

    try {
      final prefs =
          await SharedPreferences.getInstance();
      final token = prefs.getString('velocart_token') ??
          prefs.getString('token');

      final res = await http.get(
        Uri.parse(
          '${AuthApiService.baseUrl}/orders/$orderId/invoice',
        ),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      Navigator.pop(context); 

      if (res.statusCode == 200) {
        final receiptData = jsonDecode(res.body);

        showDialog(
          context: context,
          builder: (ctx) => Dialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            child: Container(
              padding: const EdgeInsets.all(24),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      "VELOCART",
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFD4AF37),
                        letterSpacing: 2,
                      ),
                    ),
                    const Text(
                      "Official Digital Receipt",
                      style: TextStyle(
                        color: Colors.grey,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment:
                          MainAxisAlignment.spaceBetween,
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "BILLED TO",
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey,
                                ),
                              ),
                              Text(
                                receiptData[
                                        'customerName'] ??
                                    '',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                              Text(
                                receiptData[
                                        'customerEmail'] ??
                                    '',
                                style: const TextStyle(
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.end,
                            children: [
                              const Text(
                                "ORDER NO.",
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey,
                                ),
                              ),
                              Text(
                                receiptData[
                                        'orderNumber'] ??
                                    '',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                             Text(
                              receiptData['paymentStatus'] ?? '',
                              style: TextStyle(
                                color: receiptData['paymentStatus'] == 'REFUND_PENDING' 
                                    ? Colors.blue 
                                    : receiptData['paymentStatus'] == 'CANCELLED'
                                        ? Colors.red
                                        : receiptData['paymentStatus'] == 'PENDING'
                                            ? Colors.orange
                                            : Colors.green,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 30),
                    ...((receiptData['items'] as List)
                        .map(
                          (item) => Padding(
                            padding:
                                const EdgeInsets.only(
                              bottom: 8.0,
                            ),
                            child: Row(
                              children: [
                                Text(
                                  "${item['quantity']}x",
                                  style:
                                      const TextStyle(
                                    fontWeight:
                                        FontWeight.bold,
                                    color: Colors.grey,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    item['productName'],
                                    style:
                                        const TextStyle(
                                      fontWeight:
                                          FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                Text(
                                  "Rs. ${item['total'].toStringAsFixed(2)}",
                                  style:
                                      const TextStyle(
                                    fontWeight:
                                        FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList()),
                    const Divider(height: 30),
                    Row(
                      mainAxisAlignment:
                          MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Subtotal",
                          style: TextStyle(fontSize: 12),
                        ),
                        Text(
                          "Rs. ${receiptData['subtotal'].toStringAsFixed(2)}",
                          style:
                              const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                    if (receiptData['discountAmount'] > 0)
                      Row(
                        mainAxisAlignment:
                            MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Promotions",
                            style: TextStyle(
                              color: Color(0xFFD4AF37),
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            "-Rs. ${receiptData['discountAmount'].toStringAsFixed(2)}",
                            style: const TextStyle(
                              color: Color(0xFFD4AF37),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    if (receiptData[
                            'loyaltyDiscountAmount'] >
                        0)
                      Row(
                        mainAxisAlignment:
                            MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Loyalty Points",
                            style: TextStyle(
                              color: Colors.green,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            "-Rs. ${receiptData['loyaltyDiscountAmount'].toStringAsFixed(2)}",
                            style: const TextStyle(
                              color: Colors.green,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    Row(
                      mainAxisAlignment:
                          MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "VAT/Taxes",
                          style: TextStyle(fontSize: 12),
                        ),
                        Text(
                          "Rs. ${receiptData['taxAmount'].toStringAsFixed(2)}",
                          style:
                              const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment:
                          MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Delivery",
                          style: TextStyle(fontSize: 12),
                        ),
                        Text(
                          "Rs. ${receiptData['deliveryFee'].toStringAsFixed(2)}",
                          style:
                              const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment:
                          MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "GRAND TOTAL",
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          "Rs. ${receiptData['grandTotal'].toStringAsFixed(2)}",
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 18,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () =>
                                _downloadReceiptAsText(
                              receiptData,
                            ),
                            icon: const Icon(
                              Icons.download,
                              size: 16,
                            ),
                            label: const Text("Download"),
                            style:
                                OutlinedButton.styleFrom(
                              foregroundColor:
                                  Colors.black87,
                              side: const BorderSide(
                                color: Colors.black12,
                              ),
                              shape:
                                  RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(
                                  10,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () =>
                                Navigator.pop(ctx),
                            style:
                                ElevatedButton.styleFrom(
                              backgroundColor:
                                  Colors.black87,
                              shape:
                                  RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(
                                  10,
                                ),
                              ),
                              elevation: 0,
                            ),
                            child: const Text(
                              "Close",
                              style: TextStyle(
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              "Failed to load receipt.",
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PENDING':
        return Colors.orange;
      case 'VALIDATING':
        return Colors.blue;
      case 'CONFIRMED':
        return Colors.purple;
      case 'DELIVERING':
        return Colors.orangeAccent;
      case 'DELIVERED':
        return Colors.green;
      case 'CANCELLED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme:
            const IconThemeData(color: Colors.black87),
        title: const Text(
          "My Orders",
          style: TextStyle(
            color: Colors.black87,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: isLoading
          ? const Center(
              child: CircularProgressIndicator(
                color: Color(0xFFD4AF37),
              ),
            )
          : orders.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment:
                        MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.history,
                        size: 80,
                        color: Colors.grey[300],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        "No orders yet",
                        style: TextStyle(
                          fontSize: 18,
                          color: Colors.grey,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding:
                      const EdgeInsets.all(16),
                  itemCount: orders.length,
                  itemBuilder:
                      (context, index) {
                    final order = orders[index];
                    final bool isDelivered = order['orderStatus'] == 'DELIVERED';
                    final bool isPending = order['orderStatus'] == 'PENDING' || order['orderStatus'] == 'VALIDATING';
                    final bool isCancelled = order['orderStatus'] == 'CANCELLED';
                    final bool isConfirmed = order['isCustomerConfirmed'] == true;
                    final orderDate = DateTime.parse(order['orderDate']).toLocal();

                    return Container(
                      margin: const EdgeInsets.only(bottom: 20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(15),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Opacity(
                        opacity: isCancelled ? 0.6 : 1.0,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text("Order Number", style: TextStyle(fontSize: 12, color: Colors.grey)),
                                      Text(
                                        order['orderNumber'],
                                        style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFFD4AF37), fontSize: 16),
                                      ),
                                      const SizedBox(height: 4),
                                      Text("${orderDate.day}/${orderDate.month}/${orderDate.year}", style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                        decoration: BoxDecoration(
                                          color: isDelivered ? Colors.green.shade50 : isCancelled ? Colors.red.shade50 : Colors.orange.shade50,
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: isDelivered ? Colors.green.shade200 : isCancelled ? Colors.red.shade200 : Colors.orange.shade200),
                                        ),
                                        child: Text(
                                          order['orderStatus'],
                                          style: TextStyle(
                                            color: isDelivered ? Colors.green : isCancelled ? Colors.red : Colors.orange,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                      // ADDED: Show REFUND_PENDING directly on the card so the user doesn't panic
                                      const SizedBox(height: 4),
                                      Text(
                                        order['paymentStatus'] == 'REFUND_PENDING'
                                            ? 'Refund Processing'
                                            : 'Payment: ${order['paymentStatus']}',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: order['paymentStatus'] == 'REFUND_PENDING'
                                              ? Colors.blue 
                                              : Colors.grey,
                                        ),
                                      ),
                                      if (isDelivered || isCancelled) ...[
                                        const SizedBox(height: 8),
                                        InkWell(
                                          onTap: reorderingId == order['id'] ? null : () => _handleReorder(order['id']),
                                          child: Row(
                                            children: [
                                              reorderingId == order['id']
                                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFD4AF37)))
                                                  : const Icon(Icons.refresh, size: 14, color: Color(0xFFD4AF37)),
                                              const SizedBox(width: 4),
                                              const Text("Reorder", style: TextStyle(color: Color(0xFFD4AF37), fontSize: 12, fontWeight: FontWeight.bold)),
                                            ],
                                          ),
                                        ),
                                      ],
                                      
                                      if (isPending) ...[
                                        const SizedBox(height: 8),
                                        InkWell(
                                          // THE FIX: Check paymentMethod and grandTotal, ignore paymentStatus string
                                          onTap: cancellingId == order['id'] 
                                              ? null 
                                              : () {
                                                  // Safe casting to handle Dart dynamic JSON types (int vs double)
                                                  final double grandTotal = (order['grandTotal'] ?? 0).toDouble();
                                                  final bool isPaidCard = (order['paymentMethod'] == 'CARD') && (grandTotal > 0);
                                                  
                                                  _handleCancelOrder(order['id'], isPaidCard);
                                                },
                                          child: Row(
                                            children: [
                                              cancellingId == order['id']
                                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.redAccent))
                                                  : const Icon(Icons.cancel_outlined, size: 14, color: Colors.redAccent),
                                              const SizedBox(width: 4),
                                              const Text("Cancel", style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                                            ],
                                          ),
                                        ),
                                      ],
                                      if (order['orderStatus'] == 'DELIVERING' || order['orderStatus'] == 'DELIVERED') ...[
                                        const SizedBox(height: 8),
                                        InkWell(
                                          onTap: () => _showDeliveryDetailsDialog(order),
                                          child: const Row(
                                            children: [
                                              Icon(Icons.local_shipping_outlined, size: 14, color: Colors.blue),
                                              SizedBox(width: 4),
                                              Text("Delivery Info", style: TextStyle(color: Colors.blue, fontSize: 12, fontWeight: FontWeight.bold)),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            if (isDelivered && !isConfirmed)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                decoration: BoxDecoration(
                                  color: Colors.orange.shade50,
                                  border: Border(bottom: BorderSide(color: Colors.orange.shade100)),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton(
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: Colors.orange.shade700,
                                          side: BorderSide(color: Colors.orange.shade300),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        ),
                                        onPressed: () => _showComplaintDialog(order['id']),
                                        child: const Text("Report Problem", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.green,
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          elevation: 0,
                                        ),
                                        onPressed: confirmingId == order['id'] ? null : () => _handleConfirmReceipt(order['id']),
                                        child: confirmingId == order['id']
                                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                            : const Text("Confirm Receipt", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                            if (isConfirmed)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                color: Colors.green.shade50,
                                child: const Row(
                                  children: [
                                    Icon(Icons.check_circle, color: Colors.green, size: 16),
                                    SizedBox(width: 6),
                                    Text("Delivery Confirmed by You", style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),

                            Padding(
                              padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 4),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
                                  const SizedBox(width: 5),
                                  Expanded(
                                    child: Text(
                                      "Delivered to: ${order['deliveryAddress']} via ${order['deliveryMethod']}",
                                      style: const TextStyle(fontSize: 12, color: Colors.black87),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                children: (order['items'] as List).map<Widget>((item) {
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 40,
                                          height: 40,
                                          decoration: BoxDecoration(
                                            color: Colors.grey[200],
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Center(
                                            child: Text(
                                              "${item['quantity']}x",
                                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                item['productName'],
                                                style: const TextStyle(fontWeight: FontWeight.bold),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              Text(
                                                "${item['variantName']} • Rs. ${item['unitPrice'].toStringAsFixed(2)}",
                                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (isDelivered && item['productId'] != null && item['productId'] > 0)
                                          ElevatedButton.icon(
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.white,
                                              foregroundColor: const Color(0xFFD4AF37),
                                              side: const BorderSide(color: Color(0xFFD4AF37)),
                                              elevation: 0,
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                                            ),
                                            icon: const Icon(Icons.star, size: 16),
                                            label: const Text("Review", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                            onPressed: () => _showReviewDialog(item['productId'], item['productName']),
                                          )
                                        else
                                          Text(
                                            "Rs. ${(item['quantity'] * item['unitPrice']).toStringAsFixed(2)}",
                                            style: const TextStyle(fontWeight: FontWeight.bold),
                                          ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),

                            // ============================================================
                            // NEW: COMPLAINTS & REFUNDS UI BLOCK
                            // ============================================================
                            if (order['complaints'] != null && (order['complaints'] as List).isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                child: Column(
                                  children: (order['complaints'] as List).map<Widget>((comp) {
                                    final isResolutionOffered = comp['status'] == 'RESOLUTION_OFFERED';
                                    final isPendingChoice = comp['refundStatus'] == 'Pending_Customer_Choice';

                                    return Container(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: isResolutionOffered ? Colors.orange.shade50 : Colors.grey.shade50,
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: isResolutionOffered ? Colors.orange.shade200 : Colors.grey.shade200,
                                        ),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  "Ticket: ${comp['subject']}", 
                                                  style: TextStyle(fontWeight: FontWeight.bold, color: isResolutionOffered ? Colors.orange.shade800 : Colors.black87),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(color: isResolutionOffered ? Colors.orange : Colors.grey, borderRadius: BorderRadius.circular(4)),
                                                child: Text(
                                                  comp['status'].toString().replaceAll('_', ' '), 
                                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)
                                                ),
                                              )
                                            ],
                                          ),
                                          
                                          if (isResolutionOffered && isPendingChoice) ...[
                                            const Padding(
                                              padding: EdgeInsets.symmetric(vertical: 8),
                                              child: Divider(height: 1),
                                            ),
                                            Text(
                                              "AI Resolution: ${comp['resolutionNotes'] ?? 'Refund offered.'}", 
                                              style: TextStyle(fontSize: 12, color: Colors.grey.shade800)
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              "Refund Approved: Rs. ${(comp['refundAmount'] ?? 0).toStringAsFixed(2)}", 
                                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)
                                            ),
                                            const SizedBox(height: 12),
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: OutlinedButton.icon(
                                                    style: OutlinedButton.styleFrom(foregroundColor: Colors.black87, padding: EdgeInsets.zero),
                                                    icon: const Icon(Icons.credit_card, size: 14),
                                                    label: const Text("To Card", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                                    onPressed: refundingComplaintId == comp['id'] ? null : () => _handleChooseRefund(comp['id'], 'OriginalPayment'),
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                Expanded(
                                                  child: ElevatedButton.icon(
                                                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD4AF37), foregroundColor: Colors.black, padding: EdgeInsets.zero, elevation: 0),
                                                    icon: const Icon(Icons.star, size: 14),
                                                    label: const Text("To Points (+10%)", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                                    onPressed: refundingComplaintId == comp['id'] ? null : () => _handleChooseRefund(comp['id'], 'LoyaltyPoints'),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],

                                          if (comp['refundStatus'] == 'Processing')
                                            const Padding(
                                              padding: EdgeInsets.only(top: 8.0),
                                              child: Row(
                                                children: [
                                                  SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2)),
                                                  SizedBox(width: 6),
                                                  Text("Your card refund is processing...", style: TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold)),
                                                ],
                                              ),
                                            ),
                                            
                                          if (comp['refundStatus'] == 'Completed')
                                            const Padding(
                                              padding: EdgeInsets.only(top: 8.0),
                                              child: Row(
                                                children: [
                                                  Icon(Icons.check_circle, size: 14, color: Colors.green),
                                                  SizedBox(width: 4),
                                                  Text("Refund Completed", style: TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.bold)),
                                                ],
                                              ),
                                            ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),

                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: const BoxDecoration(
                                border: Border(top: BorderSide(color: Colors.black12)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  TextButton.icon(
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    onPressed: () => _showReceiptDialog(order['id']),
                                    icon: const Icon(Icons.receipt_long, size: 18, color: Colors.blue),
                                    label: const Text("View Receipt", style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                                  ),
                                  Row(
                                    children: [
                                      const Text("Total: ", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                                      Text("Rs. ${order['grandTotal'].toStringAsFixed(2)}", style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}