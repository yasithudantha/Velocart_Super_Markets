import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/catalog_models.dart';
import '../api/catalog_api.dart';
import 'product_details_screen.dart';
import '../../cart/screens/cart_screen.dart';
import '../../orders/screens/order_history_screen.dart'; // ADDED: Import Order History Screen
import '../../notifications/screens/notifications_screen.dart';
import '../../loyalty/screens/loyalty_dashboard_screen.dart';
import '../../auth/screens/profile_screen.dart';
import 'storefront_assistant_screen.dart'; // ADD THIS LINE

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({Key? key}) : super(key: key);

  @override
  _CatalogScreenState createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  List<Product> products = [];
  List<Category> categories = [];
  bool isLoading = true;
  String error = '';

  // Filter States
  String searchTerm = '';
  int? selectedCategory;
  String sortBy = 'relevance';
  bool inStockOnly = false;

  // Controllers for strict validation
  TextEditingController minPriceCtrl = TextEditingController();
  TextEditingController maxPriceCtrl = TextEditingController();
  TextEditingController brandCtrl = TextEditingController();

  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _fetchInitialData();
  }

  Future<void> _fetchInitialData() async {
    try {
      final fetchedCategories = await CatalogApi.getCategories();
      setState(() => categories = fetchedCategories);
      _fetchProducts();
    } catch (e) {
      setState(() { error = e.toString(); isLoading = false; });
    }
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      setState(() => searchTerm = query);
      _fetchProducts();
    });
  }

  Future<void> _fetchProducts() async {
    setState(() { isLoading = true; error = ''; });
    try {
      final fetchedProducts = await CatalogApi.getProducts(
        search: searchTerm,
        categoryId: selectedCategory,
        minPrice: minPriceCtrl.text,
        maxPrice: maxPriceCtrl.text,
        brand: brandCtrl.text,
        inStockOnly: inStockOnly,
        sortBy: sortBy,
      );
      setState(() { products = fetchedProducts; isLoading = false; });
    } catch (e) {
      setState(() { error = e.toString(); isLoading = false; });
    }
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {

            // 100% STRICT VALIDATION LOGIC
            bool hasPriceError = false;
            if (minPriceCtrl.text.isNotEmpty && maxPriceCtrl.text.isNotEmpty) {
              double? min = double.tryParse(minPriceCtrl.text);
              double? max = double.tryParse(maxPriceCtrl.text);
              if (min != null && max != null && min > max) {
                hasPriceError = true;
              }
            }

            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 20, right: 20, top: 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Advanced Filters", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87)),
                  const SizedBox(height: 20),

                  // Category Dropdown
                  DropdownButtonFormField<int?>(
                    decoration: InputDecoration(labelText: "Category", border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
                    value: selectedCategory,
                    items: [
                      const DropdownMenuItem(value: null, child: Text("All Categories")),
                      ...categories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                    ],
                    onChanged: (val) => setModalState(() => selectedCategory = val),
                  ),
                  const SizedBox(height: 15),

                  // Brand Input
                  TextField(
                    controller: brandCtrl,
                    decoration: InputDecoration(labelText: "Brand (e.g. Nestlé)", border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))),
                  ),
                  const SizedBox(height: 15),

                  // Price Range (Strict Validation)
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: minPriceCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: false),
                          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
                          decoration: InputDecoration(
                            labelText: "Min Rs.",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: hasPriceError ? Colors.red : Colors.grey.shade400)),
                          ),
                          onChanged: (v) => setModalState(() {}),
                        ),
                      ),
                      const Padding(padding: EdgeInsets.symmetric(horizontal: 10), child: Text("-", style: TextStyle(fontSize: 20))),
                      Expanded(
                        child: TextField(
                          controller: maxPriceCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: false),
                          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
                          decoration: InputDecoration(
                            labelText: "Max Rs.",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: hasPriceError ? Colors.red : Colors.grey.shade400)),
                          ),
                          onChanged: (v) => setModalState(() {}),
                        ),
                      ),
                    ],
                  ),
                  if (hasPriceError)
                    const Padding(
                      padding: EdgeInsets.only(top: 8.0),
                      child: Text("Min price cannot exceed Max price.", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),

                  const SizedBox(height: 15),

                  // In Stock Only Toggle
                  SwitchListTile(
                    title: const Text("In Stock Only", style: TextStyle(fontWeight: FontWeight.bold)),
                    activeColor: const Color(0xFFD4AF37),
                    value: inStockOnly,
                    onChanged: (val) => setModalState(() => inStockOnly = val),
                  ),
                  const SizedBox(height: 20),

                  // Apply Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD4AF37),
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))
                      ),
                      onPressed: hasPriceError ? null : () {
                        Navigator.pop(context);
                        _fetchProducts();
                      },
                      child: const Text("Apply Filters", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            );
          }
        );
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: const Text("Velocart", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 24)),
        actions: [
          // NEW: Profile Icon
          IconButton(
            icon: const Icon(Icons.person_outline, color: Colors.black87),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()))
          ),
          
          // NEW: Loyalty Dashboard Icon
          IconButton(
            icon: const Icon(Icons.credit_card, color: Color(0xFFD4AF37)), 
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoyaltyDashboardScreen()))
          ),
          
          // NEW: Notifications Bell
          IconButton(
            icon: const Icon(Icons.notifications_none, color: Colors.black87), 
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()))
          ),

          // Order History Icon
          IconButton(
            icon: const Icon(Icons.history, color: Colors.black87), 
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OrderHistoryScreen()))
          ),
          
          // Cart Icon
          IconButton(
            icon: const Icon(Icons.shopping_cart, color: Colors.black87), 
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen()))
          ),
        ],
      ),
      body: Column(
        children: [
          // Basic Search & Autocomplete Input
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: "Search groceries...",
                prefixIcon: const Icon(Icons.search, color: Colors.grey),
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
              ),
            ),
          ),

          if (error.isNotEmpty) Padding(padding: const EdgeInsets.all(16), child: Text(error, style: const TextStyle(color: Colors.red))),

          // Product Grid
          Expanded(
            child: isLoading 
              ? const Center(child: CircularProgressIndicator(color: Color(0xFFD4AF37)))
              : products.isEmpty 
                ? const Center(child: Text("No products found.", style: TextStyle(color: Colors.black54, fontSize: 16)))
                : GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.60, // Adjusted slightly to fit the new price layout
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    itemCount: products.length,
                    itemBuilder: (context, index) {
                      final product = products[index];
                      final totalStock = product.variants.fold<int>(0, (sum, v) => sum + v.stockQuantity);
                      final primaryImage = product.images.firstWhere((img) => img.isPrimary, orElse: () => product.images.isNotEmpty ? product.images.first : ProductImage(id: 0, imageUrl: 'https://via.placeholder.com/150', isPrimary: true)).imageUrl;

                      final cheapestVariant = product.variants.isNotEmpty 
                          ? product.variants.reduce((a, b) => (a.discountedPrice ?? a.originalPrice) < (b.discountedPrice ?? b.originalPrice) ? a : b) 
                          : null;

                      final displayPrice = cheapestVariant?.discountedPrice ?? cheapestVariant?.originalPrice ?? 0.0;
                      final originalPrice = cheapestVariant?.originalPrice ?? 0.0;
                      final hasDiscount = cheapestVariant?.discountedPrice != null;
                      final discountBadge = cheapestVariant?.discountLabel;

                      return GestureDetector(
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailsScreen(productId: product.id))),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(15),
                            boxShadow: [BoxShadow(color: Colors.grey.withOpacity(0.1), blurRadius: 10, spreadRadius: 2)],
                          ),
                          child: Stack(
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Image
                                  Expanded(
                                    child: Container(
                                      decoration: BoxDecoration(
                                        borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                                        image: DecorationImage(image: NetworkImage(primaryImage), fit: BoxFit.cover,
                                        colorFilter: totalStock == 0 ? const ColorFilter.mode(Colors.grey, BlendMode.saturation) : null),
                                      ),
                                    ),
                                  ),
                                  // Details
                                  Padding(
                                    padding: const EdgeInsets.all(12.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(product.brand.toUpperCase(), style: const TextStyle(fontSize: 10, color: Color(0xFFD4AF37), fontWeight: FontWeight.bold)),
                                        const SizedBox(height: 4),
                                        Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87)),
                                        const SizedBox(height: 8),

                                        if (hasDiscount)
                                          Text("Rs. ${originalPrice.toStringAsFixed(2)}", style: const TextStyle(fontSize: 12, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                                        Text("Rs. ${displayPrice.toStringAsFixed(2)}", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: hasDiscount ? Colors.red : Colors.black87)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),

                              if (hasDiscount && discountBadge != null)
                                Positioned(
                                  top: 10, right: 10,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(8)),
                                    child: Text(discountBadge, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                ),

                              if (totalStock == 0)
                                Positioned.fill(
                                  child: Container(
                                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.7), borderRadius: BorderRadius.circular(15)),
                                    child: const Center(child: Text("OUT OF STOCK", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 16))),
                                  ),
                                ),
                              if (totalStock > 0 && totalStock <= 10)
                                Positioned(
                                  top: 10, left: 10,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(8)),
                                    child: Text("Only $totalStock left!", style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      
      // ADD THIS BLOCK RIGHT HERE:
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFFD4AF37),
        child: const Icon(Icons.smart_toy, color: Colors.black, size: 28),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const StorefrontAssistantScreen()),
          );
        },
      ),
    );
  }
}