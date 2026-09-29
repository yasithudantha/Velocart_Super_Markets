class Category {
  final int id;
  final String name;

  Category({required this.id, required this.name});

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'],
      name: json['name'],
    );
  }
}

class ProductVariant {
  final int id;
  final String sku;
  final String weightOrSize;
  
  // SECTION 2.7 & 2.8: Advanced Pricing
  final double originalPrice;
  final double? discountedPrice;
  final String? discountLabel;
  
  final int stockQuantity;
  final String? expiryDate;
  final bool isActive;

  ProductVariant({
    required this.id, required this.sku, required this.weightOrSize, 
    required this.originalPrice, this.discountedPrice, this.discountLabel,
    required this.stockQuantity, this.expiryDate, required this.isActive
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      id: json['id'],
      sku: json['sku'],
      weightOrSize: json['weightOrSize'],
      originalPrice: (json['originalPrice'] as num).toDouble(),
      discountedPrice: json['discountedPrice'] != null ? (json['discountedPrice'] as num).toDouble() : null,
      discountLabel: json['discountLabel'],
      stockQuantity: json['stockQuantity'],
      expiryDate: json['expiryDate'],
      isActive: json['isActive'],
    );
  }
}

class ProductImage {
  final int id;
  final String imageUrl;
  final bool isPrimary;

  ProductImage({required this.id, required this.imageUrl, required this.isPrimary});

  factory ProductImage.fromJson(Map<String, dynamic> json) {
    return ProductImage(
      id: json['id'],
      imageUrl: json['imageUrl'],
      isPrimary: json['isPrimary'],
    );
  }
}

class Product {
  final int id;
  final String name;
  final String brand;
  final String description;
  final String categoryName;
  final bool isActive;
  final List<ProductVariant> variants;
  final List<ProductImage> images;

  Product({
    required this.id, required this.name, required this.brand, required this.description,
    required this.categoryName, required this.isActive, required this.variants, required this.images
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      name: json['name'],
      brand: json['brand'],
      description: json['description'],
      categoryName: json['categoryName'],
      isActive: json['isActive'],
      variants: (json['variants'] as List).map((v) => ProductVariant.fromJson(v)).toList(),
      images: (json['images'] as List).map((i) => ProductImage.fromJson(i)).toList(),
    );
  }
}