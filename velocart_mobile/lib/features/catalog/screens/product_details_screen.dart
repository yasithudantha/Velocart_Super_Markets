import 'package:flutter/material.dart';
import '../models/catalog_models.dart';
import '../api/catalog_api.dart';

class ProductDetailsScreen extends StatefulWidget {
  final int productId;
  const ProductDetailsScreen({Key? key, required this.productId}) : super(key: key);

  @override
  _ProductDetailsScreenState createState() => _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends State<ProductDetailsScreen> {
  Product? product;
  Map<String, dynamic>? cart;
  List<dynamic> reviews = [];
  ProductVariant? selectedVariant;
  String? selectedImage;
  bool isLoading = true;
  
  int quantity = 1;
  bool isAdding = false;
  bool addSuccess = false;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => isLoading = true);
    try {
      final results = await Future.wait([
        CatalogApi.getProductById(widget.productId),
        CatalogApi.getCart(), // FIXED: Removed userId: 1
        CatalogApi.getProductReviews(widget.productId)
      ]);

      final p = results[0] as Product;
      final c = results[1] as Map<String, dynamic>;
      final r = results[2] as List<dynamic>;

      setState(() {
        product = p;
        cart = c;
        reviews = r;
        if (p.variants.isNotEmpty) selectedVariant = p.variants.first;
        if (p.images.isNotEmpty) {
          selectedImage = p.images.firstWhere((i) => i.isPrimary, orElse: () => p.images.first).imageUrl;
        }
        quantity = _realAvailableStock > 0 ? 1 : 0;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  int get _inCartQty {
    if (selectedVariant == null || cart == null || cart!['items'] == null) return 0;
    final item = (cart!['items'] as List).firstWhere(
      (i) => i['productVariantId'] == selectedVariant!.id, 
      orElse: () => null
    );
    return item != null ? item['quantity'] as int : 0;
  }

  int get _realAvailableStock {
    if (selectedVariant == null) return 0;
    int realStock = selectedVariant!.stockQuantity - _inCartQty;
    return realStock > 0 ? realStock : 0;
  }

  void _updateQuantity(int delta) {
    if (selectedVariant == null) return;
    int newQty = quantity + delta;
    if (newQty >= 1 && newQty <= _realAvailableStock) {
      setState(() => quantity = newQty);
    }
  }

  Future<void> _handleAddToCart() async {
    if (selectedVariant == null || quantity < 1 || quantity > _realAvailableStock) return;
    
    setState(() => isAdding = true);
    try {
      await CatalogApi.addToCart(selectedVariant!.id, quantity);
      
      final updatedCart = await CatalogApi.getCart(); // FIXED: Removed userId: 1

      setState(() { 
        cart = updatedCart;
        isAdding = false; 
        addSuccess = true; 
        quantity = _realAvailableStock > 0 ? 1 : 0; 
      });
      
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => addSuccess = false);
      });
    } catch (e) {
      setState(() => isAdding = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: Colors.red)
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) return const Scaffold(backgroundColor: Colors.white, body: Center(child: CircularProgressIndicator(color: Color(0xFFD4AF37))));
    if (product == null) return const Scaffold(backgroundColor: Colors.white, body: Center(child: Text("Product not found", style: TextStyle(color: Colors.black87))));

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: Text(product!.brand, style: const TextStyle(color: Color(0xFFD4AF37), fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 2)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Gallery
            Container(
              height: 300,
              width: double.infinity,
              color: Colors.white,
              child: selectedImage != null ? Image.network(selectedImage!, fit: BoxFit.contain) : const Icon(Icons.image, size: 100, color: Colors.grey),
            ),
            
            if (product!.images.length > 1)
              SizedBox(
                height: 80,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: product!.images.length,
                  itemBuilder: (ctx, i) {
                    final img = product!.images[i];
                    return GestureDetector(
                      onTap: () => setState(() => selectedImage = img.imageUrl),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.only(right: 10),
                        width: 70,
                        decoration: BoxDecoration(
                          border: Border.all(color: selectedImage == img.imageUrl ? const Color(0xFFD4AF37) : Colors.transparent, width: 2),
                          borderRadius: BorderRadius.circular(15),
                          image: DecorationImage(image: NetworkImage(img.imageUrl), fit: BoxFit.cover),
                        ),
                      ),
                    );
                  },
                ),
              ),

            // Details
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product!.name, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.black87)),
                  const SizedBox(height: 5),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(20)),
                    child: Text(product!.categoryName, style: TextStyle(fontSize: 12, color: Colors.grey[800], fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 20),
                  Text(product!.description, style: TextStyle(color: Colors.grey[600], height: 1.5, fontSize: 15)),
                  const SizedBox(height: 30),

                  // Variant Selection
                  const Text("Select Variant", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87)),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 12,
                    children: product!.variants.map((variant) {
                      final isSelected = selectedVariant?.id == variant.id;
                      return ChoiceChip(
                        label: Text(variant.weightOrSize, style: TextStyle(color: isSelected ? Colors.white : Colors.black87, fontWeight: FontWeight.bold)),
                        selected: isSelected,
                        selectedColor: const Color(0xFFD4AF37),
                        backgroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: isSelected ? const Color(0xFFD4AF37) : Colors.grey.shade300)),
                        onSelected: (selected) { 
                          if (selected) {
                            setState(() { 
                              selectedVariant = variant; 
                              quantity = _realAvailableStock > 0 ? 1 : 0; 
                            });
                          }
                        },
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 30),

                  if (selectedVariant != null) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (selectedVariant!.discountedPrice != null)
                              Text("Rs. ${selectedVariant!.originalPrice.toStringAsFixed(2)}", style: const TextStyle(fontSize: 16, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                            Row(
                              children: [
                                Text(
                                  "Rs. ${(selectedVariant!.discountedPrice ?? selectedVariant!.originalPrice).toStringAsFixed(2)}", 
                                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: selectedVariant!.discountedPrice != null ? Colors.red : Colors.black87)
                                ),
                                if (selectedVariant!.discountLabel != null)
                                  Padding(
                                    padding: const EdgeInsets.only(left: 10),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(color: Colors.red.shade100, borderRadius: BorderRadius.circular(8)),
                                      child: Text(selectedVariant!.discountLabel!, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12)),
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                        
                        if (_realAvailableStock > 10)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text("In Stock", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                              if (_inCartQty > 0) Text("($_inCartQty in cart)", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          )
                        else if (_realAvailableStock > 0)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text("Only $_realAvailableStock left", style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
                              if (_inCartQty > 0) Text("($_inCartQty in cart)", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          )
                        else
                          Text(_inCartQty > 0 ? "Max Stock in Cart" : "Out of Stock", style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],

                  // REVIEWS SECTION
                  const SizedBox(height: 40),
                  const Divider(),
                  const SizedBox(height: 20),
                  const Text("Customer Reviews", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.black87)),
                  const SizedBox(height: 20),

                  if (reviews.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Column(
                          children: [
                            Icon(Icons.rate_review_outlined, size: 50, color: Colors.grey.shade300),
                            const SizedBox(height: 10),
                            const Text("No reviews yet. Be the first to review after purchase!", textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                      ),
                    )
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: reviews.length,
                      itemBuilder: (context, index) {
                        final review = reviews[index];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 15),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.grey.shade200)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(review['userName'] ?? 'Customer', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                      if (review['isVerifiedPurchase'] == true)
                                        Row(
                                          children: [
                                            const Icon(Icons.verified, color: Color(0xFFD4AF37), size: 12),
                                            const SizedBox(width: 4),
                                            const Text("Verified Buyer", style: TextStyle(color: Color(0xFFD4AF37), fontSize: 10, fontWeight: FontWeight.bold)),
                                            if (review['orderReference'] != null) ...[
                                              const SizedBox(width: 8),
                                              const Text("|", style: TextStyle(color: Colors.grey, fontSize: 10)),
                                              const SizedBox(width: 8),
                                              Text("Order: ${review['orderReference']}", style: const TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.w500)),
                                            ]
                                          ],
                                        )
                                    ],
                                  ),
                                  Row(
                                    children: List.generate(5, (starIndex) {
                                      return Icon(
                                        starIndex < review['rating'] ? Icons.star : Icons.star_border,
                                        size: 16,
                                        color: const Color(0xFFD4AF37),
                                      );
                                    }),
                                  )
                                ],
                              ),
                              const SizedBox(height: 10),
                              if (review['comment'] != null && review['comment'].toString().isNotEmpty)
                                Text(review['comment'], style: TextStyle(color: Colors.grey.shade700)),
                              const SizedBox(height: 10),
                              Text(DateTime.parse(review['createdAt']).toLocal().toString().split(' ')[0], style: TextStyle(color: Colors.grey.shade400, fontSize: 10)),
                            ],
                          ),
                        );
                      },
                    )
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, -5))],
          ),
          child: Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: Colors.grey.shade200)
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove, size: 20),
                      color: Colors.black87,
                      onPressed: (selectedVariant != null && quantity > 1) ? () => _updateQuantity(-1) : null,
                    ),
                    Text(quantity.toString(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.add, size: 20),
                      color: Colors.black87,
                      onPressed: (selectedVariant != null && quantity < _realAvailableStock) ? () => _updateQuantity(1) : null,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  height: 60,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: addSuccess ? Colors.green : const Color(0xFFD4AF37),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                      disabledBackgroundColor: Colors.grey[300],
                      elevation: addSuccess ? 10 : 2,
                      shadowColor: addSuccess ? Colors.green.withOpacity(0.5) : Colors.black.withOpacity(0.2),
                    ),
                    onPressed: (selectedVariant == null || _realAvailableStock == 0 || quantity < 1 || isAdding) ? null : _handleAddToCart,
                    child: isAdding 
                        ? const CircularProgressIndicator(color: Colors.white)
                        : addSuccess 
                          ? const Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.check_circle, color: Colors.white), SizedBox(width: 8), Text("Added!", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white))])
                          : Text(
                              _realAvailableStock == 0 
                                ? (_inCartQty > 0 ? "Limit Reached" : "Out of Stock") 
                                : "Add to Cart", 
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)
                            ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}