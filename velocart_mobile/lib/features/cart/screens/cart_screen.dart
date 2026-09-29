import 'package:flutter/material.dart';
import '../../catalog/api/catalog_api.dart';
import 'checkout_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({Key? key}) : super(key: key);

  @override
  _CartScreenState createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  Map<String, dynamic>? cart;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchCart();
  }

  Future<void> _fetchCart() async {
    setState(() => isLoading = true);
    try {
      final data = await CatalogApi.getCart();
      setState(() { cart = data; isLoading = false; });
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  Future<void> _updateQuantity(int itemId, int newQty, int availableStock) async {
    if (newQty < 1 || newQty > availableStock) return;
    try {
      setState(() {
        var item = (cart!['items'] as List).firstWhere((i) => i['id'] == itemId);
        item['quantity'] = newQty;
      });
      await CatalogApi.updateCartItem(itemId, newQty);
      _fetchCart(); 
    } catch (e) {
      _fetchCart(); 
    }
  }

  Future<void> _removeItem(int itemId) async {
    try {
      setState(() { (cart!['items'] as List).removeWhere((i) => i['id'] == itemId); });
      await CatalogApi.removeCartItem(itemId);
      _fetchCart();
    } catch (e) {
      _fetchCart();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) return const Scaffold(backgroundColor: Colors.white, body: Center(child: CircularProgressIndicator(color: Color(0xFFD4AF37))));

    final items = cart?['items'] as List? ?? [];
    final hasAvailableItems = items.any((i) => i['isAvailable'] == true);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: const Text("Shopping Cart", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: items.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shopping_bag_outlined, size: 80, color: Colors.grey[300]),
                  const SizedBox(height: 16),
                  const Text("Your cart is empty", style: TextStyle(fontSize: 18, color: Colors.grey, fontWeight: FontWeight.bold)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                final bool isAvailable = item['isAvailable'] ?? false;

                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isAvailable ? Colors.white : Colors.red.shade50.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(15),
                    border: isAvailable ? Border.all(color: Colors.grey.shade200) : Border.all(color: Colors.red.shade100),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 80, height: 80,
                        decoration: BoxDecoration(
                          color: Colors.grey[100], borderRadius: BorderRadius.circular(10),
                          image: DecorationImage(image: NetworkImage(item['imageUrl']), fit: BoxFit.cover, 
                          colorFilter: isAvailable ? null : const ColorFilter.mode(Colors.grey, BlendMode.saturation)),
                        ),
                      ),
                      const SizedBox(width: 15),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(child: Text(item['productName'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16), maxLines: 1, overflow: TextOverflow.ellipsis)),
                                GestureDetector(
                                  onTap: () => _removeItem(item['id']),
                                  child: const Icon(Icons.delete_outline, color: Colors.grey, size: 20),
                                ),
                              ],
                            ),
                            Text("${item['brand']} • ${item['variantName']}", style: const TextStyle(color: Color(0xFFD4AF37), fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),

                            if (!isAvailable)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(color: Colors.red.shade100, borderRadius: BorderRadius.circular(6)),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [Icon(Icons.error_outline, size: 12, color: Colors.red), SizedBox(width: 4), Text("Unavailable", style: TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold))],
                                ),
                              )
                            else
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text("Rs. ${(item['unitPrice'] * item['quantity']).toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                                  Container(
                                    decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade300)),
                                    child: Row(
                                      children: [
                                        InkWell(
                                          onTap: item['quantity'] > 1 ? () => _updateQuantity(item['id'], item['quantity'] - 1, item['availableStock']) : null,
                                          child: Padding(padding: const EdgeInsets.all(6), child: Icon(Icons.remove, size: 16, color: item['quantity'] > 1 ? Colors.black87 : Colors.grey)),
                                        ),
                                        SizedBox(width: 20, child: Center(child: Text(item['quantity'].toString(), style: const TextStyle(fontWeight: FontWeight.bold)))),
                                        InkWell(
                                          onTap: item['quantity'] < item['availableStock'] ? () => _updateQuantity(item['id'], item['quantity'] + 1, item['availableStock']) : null,
                                          child: Padding(padding: const EdgeInsets.all(6), child: Icon(Icons.add, size: 16, color: item['quantity'] < item['availableStock'] ? Colors.black87 : Colors.grey)),
                                        ),
                                      ],
                                    ),
                                  )
                                ],
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
      bottomNavigationBar: items.isEmpty ? null : Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, -5))]),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // MATCHING IMAGE: Math Breakdown
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text("Subtotal", style: TextStyle(color: Colors.grey, fontSize: 14)), Text("Rs. ${cart!['subtotal']?.toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.bold))]),
              const SizedBox(height: 4),
              if ((cart!['discountAmount'] ?? 0) > 0)
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text("Discounts", style: TextStyle(color: Color(0xFFD4AF37), fontSize: 14)), Text("-Rs. ${cart!['discountAmount']?.toStringAsFixed(2)}", style: const TextStyle(color: Color(0xFFD4AF37), fontWeight: FontWeight.bold))]),
              const SizedBox(height: 4),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text("Taxes / VAT", style: TextStyle(color: Colors.grey, fontSize: 14)), Text("Rs. ${cart!['taxAmount']?.toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.bold))]),
              const SizedBox(height: 4),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text("Delivery Estimate", style: TextStyle(color: Colors.grey, fontSize: 14)), Text("Rs. ${cart!['deliveryFee']?.toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.bold))]),
              
              const Divider(height: 20),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Total", style: TextStyle(color: Colors.black87, fontSize: 18, fontWeight: FontWeight.bold)),
                  Text("Rs. ${cart!['grandTotal']?.toStringAsFixed(2)}", style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFFD4AF37))),
                ],
              ),
              const SizedBox(height: 15),
              SizedBox(
                width: double.infinity, height: 55,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD4AF37),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                    elevation: 2,
                  ),
                  onPressed: !hasAvailableItems ? null : () async {
                    // Navigate to Checkout and re-fetch if they came back from a 409 Conflict
                    final shouldRefresh = await Navigator.push(context, MaterialPageRoute(builder: (_) => CheckoutScreen(cartData: cart!)));
                    if (shouldRefresh == true) _fetchCart();
                  },
                  child: const Text("Proceed to Checkout", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}