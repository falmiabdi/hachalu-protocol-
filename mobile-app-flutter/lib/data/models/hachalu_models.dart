class ProductImage {
  const ProductImage({required this.url, this.position});
  final String url;
  final String? position;
  factory ProductImage.fromJson(Map<String, dynamic> j) =>
      ProductImage(url: '${j['url'] ?? ''}', position: j['position'] as String?);
  Map<String, dynamic> toJson() => {'url': url, if (position != null) 'position': position};
}

class ProductSize {
  const ProductSize({required this.id, required this.name});
  final String id;
  final String name;
  factory ProductSize.fromJson(Map<String, dynamic> j) =>
      ProductSize(id: '${j['id'] ?? ''}', name: '${j['name'] ?? ''}');
  Map<String, dynamic> toPersistJson() => {'id': id, 'name': name};
}

class ProductColor {
  const ProductColor({required this.id, required this.name, this.hex});
  final String id;
  final String name;
  final String? hex;
  factory ProductColor.fromJson(Map<String, dynamic> j) => ProductColor(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      hex: j['hex'] as String?);
  Map<String, dynamic> toPersistJson() =>
      {'id': id, 'name': name, if (hex != null) 'hex': hex};
}

class ProductVariant {
  const ProductVariant({
    required this.id,
    required this.price,
    this.size,
    this.color,
    this.stockQuantity = 0,
  });
  final String id;
  final double price;
  final ProductSize? size;
  final ProductColor? color;
  final int stockQuantity;

  factory ProductVariant.fromJson(Map<String, dynamic> j) => ProductVariant(
        id: '${j['id'] ?? ''}',
        price: _toDouble(j['price']),
        size: j['size'] is Map<String, dynamic>
            ? ProductSize.fromJson(j['size'] as Map<String, dynamic>)
            : null,
        color: j['color'] is Map<String, dynamic>
            ? ProductColor.fromJson(j['color'] as Map<String, dynamic>)
            : null,
        stockQuantity: _toInt(j['stockQuantity']),
      );

  Map<String, dynamic> toPersistJson() => {
        'id': id,
        'price': price,
        'stockQuantity': stockQuantity,
        if (size != null) 'size': size!.toPersistJson(),
        if (color != null) 'color': color!.toPersistJson(),
      };
}

class ProductCategory {
  const ProductCategory({required this.id, required this.name, this.slug});
  final String id;
  final String name;
  final String? slug;
  factory ProductCategory.fromJson(Map<String, dynamic> j) =>
      ProductCategory(
          id: '${j['id'] ?? ''}',
          name: '${j['name'] ?? ''}',
          slug: j['slug'] as String?);
  Map<String, dynamic> toJson() => {'id': id, 'name': name, if (slug != null) 'slug': slug};
}

class ProductBrand {
  const ProductBrand({required this.id, required this.name, this.slug});
  final String id;
  final String name;
  final String? slug;
  factory ProductBrand.fromJson(Map<String, dynamic> j) => ProductBrand(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      slug: j['slug'] as String?);
  Map<String, dynamic> toJson() => {'id': id, 'name': name, if (slug != null) 'slug': slug};
}

class Product {
  const Product({
    required this.id,
    required this.name,
    this.slug,
    this.description,
    required this.status,
    required this.sellerId,
    this.category,
    this.brand,
    this.images = const [],
    this.variants = const [],
    this.styleNotes,
    this.deliveryDays,
    this.returnPolicy,
  });

  final String id;
  final String name;
  final String? slug;
  final String? description;
  final String status;
  final String sellerId;
  final ProductCategory? category;
  final ProductBrand? brand;
  final List<ProductImage> images;
  final List<ProductVariant> variants;
  final String? styleNotes;
  final int? deliveryDays;
  final String? returnPolicy;

  String get displayImage =>
      images.isNotEmpty ? images.first.url : '';

  double get minPrice =>
      variants.isEmpty ? 0 : variants.map((v) => v.price).reduce((a, b) => a < b ? a : b);

  List<ProductColor> get availableColors =>
      variants.map((v) => v.color).whereType<ProductColor>().toSet().toList();

  factory Product.fromJson(Map<String, dynamic> j) {
    return Product(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      slug: j['slug'] as String?,
      description: j['description'] as String?,
      status: '${j['status'] ?? ''}',
      sellerId: '${j['sellerId'] ?? ''}',
      category: j['category'] is Map<String, dynamic>
          ? ProductCategory.fromJson(j['category'] as Map<String, dynamic>)
          : null,
      brand: j['brand'] is Map<String, dynamic>
          ? ProductBrand.fromJson(j['brand'] as Map<String, dynamic>)
          : null,
      images: (j['images'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ProductImage.fromJson)
          .toList(),
      variants: (j['variants'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ProductVariant.fromJson)
          .toList(),
      styleNotes: j['styleNotes'] as String?,
      deliveryDays: _toIntNullable(j['deliveryDays']),
      returnPolicy: j['returnPolicy'] as String?,
    );
  }

  Map<String, dynamic> toPersistJson() => {
        'id': id,
        'name': name,
        'status': status,
        'sellerId': sellerId,
        if (slug != null) 'slug': slug,
        if (description != null) 'description': description,
        if (category != null) 'category': category!.toJson(),
        if (brand != null) 'brand': brand!.toJson(),
        'images': images.map((e) => e.toJson()).toList(),
        'variants': variants.map((e) => e.toPersistJson()).toList(),
        if (styleNotes != null) 'styleNotes': styleNotes,
        if (deliveryDays != null) 'deliveryDays': deliveryDays,
      };
}

class Category {
  const Category({
    required this.id,
    required this.name,
    this.slug,
    this.description,
    this.productCount = 0,
    this.isActive = true,
  });
  final String id;
  final String name;
  final String? slug;
  final String? description;
  final int productCount;
  final bool isActive;

  factory Category.fromJson(Map<String, dynamic> j) => Category(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        slug: j['slug'] as String?,
        description: j['description'] as String?,
        productCount: j['_count'] is Map<String, dynamic>
            ? _toInt((j['_count'] as Map<String, dynamic>)['products'])
            : 0,
        isActive: j['isActive'] as bool? ?? true,
      );
}

class Brand {
  const Brand({required this.id, required this.name, this.slug});
  final String id;
  final String name;
  final String? slug;
  factory Brand.fromJson(Map<String, dynamic> j) => Brand(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      slug: j['slug'] as String?);
}

class AppColor {
  const AppColor(
      {required this.id, required this.name, this.hex, this.isActive = true});
  final String id;
  final String name;
  final String? hex;
  final bool isActive;
  factory AppColor.fromJson(Map<String, dynamic> j) => AppColor(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      hex: j['hex'] as String?,
      isActive: j['isActive'] as bool? ?? true);
}

class AppSize {
  const AppSize({required this.id, required this.name, this.sortOrder = 0});
  final String id;
  final String name;
  final int sortOrder;
  factory AppSize.fromJson(Map<String, dynamic> j) => AppSize(
      id: '${j['id'] ?? ''}',
      name: '${j['name'] ?? ''}',
      sortOrder: _toInt(j['sortOrder']));
}

class MeasurementField {
  const MeasurementField({
    required this.name,
    this.type = 'number',
    this.required = true,
    this.min,
    this.max,
    this.options,
  });
  final String name;
  final String type;
  final bool required;
  final num? min;
  final num? max;
  final List<String>? options;

  factory MeasurementField.fromJson(Map<String, dynamic> j) =>
      MeasurementField(
        name: '${j['name'] ?? ''}',
        type: '${j['type'] ?? 'number'}',
        required: j['required'] as bool? ?? true,
        min: j['min'] as num?,
        max: j['max'] as num?,
        options:
            (j['options'] as List?)?.map((e) => '$e').toList(),
      );
}

class MeasurementTemplate {
  const MeasurementTemplate(
      {required this.id, required this.name, this.fields = const []});
  final String id;
  final String name;
  final List<MeasurementField> fields;
  factory MeasurementTemplate.fromJson(Map<String, dynamic> j) =>
      MeasurementTemplate(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        fields: (j['fields'] as List? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(MeasurementField.fromJson)
            .toList(),
      );
}

class OrderItemProduct {
  const OrderItemProduct({this.name, this.images});
  final String? name;
  final List<ProductImage>? images;
  factory OrderItemProduct.fromJson(Map<String, dynamic> j) =>
      OrderItemProduct(
        name: j['name'] as String?,
        images: (j['images'] as List? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(ProductImage.fromJson)
            .toList(),
      );
}

class OrderItemVariant {
  const OrderItemVariant({this.sizeName, this.colorName});
  final String? sizeName;
  final String? colorName;
  factory OrderItemVariant.fromJson(Map<String, dynamic> j) =>
      OrderItemVariant(
        sizeName: j['size'] is Map<String, dynamic>
            ? '${(j['size'] as Map<String, dynamic>)['name'] ?? ''}'
            : null,
        colorName: j['color'] is Map<String, dynamic>
            ? '${(j['color'] as Map<String, dynamic>)['name'] ?? ''}'
            : null,
      );
}

class OrderItem {
  const OrderItem({
    required this.id,
    required this.quantity,
    required this.price,
    this.product,
    this.variant,
    this.measurements,
  });
  final String id;
  final int quantity;
  final double price;
  final OrderItemProduct? product;
  final OrderItemVariant? variant;
  final Map<String, dynamic>? measurements;

  factory OrderItem.fromJson(Map<String, dynamic> j) => OrderItem(
        id: '${j['id'] ?? ''}',
        quantity: _toInt(j['quantity']),
        price: _toDouble(j['price']),
        product: j['product'] is Map<String, dynamic>
            ? OrderItemProduct.fromJson(j['product'] as Map<String, dynamic>)
            : null,
        variant: j['variant'] is Map<String, dynamic>
            ? OrderItemVariant.fromJson(j['variant'] as Map<String, dynamic>)
            : null,
        measurements: j['measurements'] as Map<String, dynamic>?,
      );
}

class Order {
  const Order({
    required this.id,
    required this.orderNumber,
    required this.totalPrice,
    required this.status,
    required this.type,
    this.customerId,
    this.sellerId,
    this.items = const [],
    this.deliveryInfo,
    this.paymentInfo,
    this.notes,
    this.createdAt,
  });
  final String id;
  final String orderNumber;
  final double totalPrice;
  final String status;
  final String type;
  final String? customerId;
  final String? sellerId;
  final List<OrderItem> items;
  final Map<String, dynamic>? deliveryInfo;
  final Map<String, dynamic>? paymentInfo;
  final String? notes;
  final String? createdAt;

  factory Order.fromJson(Map<String, dynamic> j) => Order(
        id: '${j['id'] ?? ''}',
        orderNumber: '${j['orderNumber'] ?? ''}',
        totalPrice: _toDouble(j['totalPrice']),
        status: '${j['status'] ?? ''}',
        type: '${j['type'] ?? ''}',
        customerId: j['customerId'] as String?,
        sellerId: j['sellerId'] as String?,
        items: (j['items'] as List? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(OrderItem.fromJson)
            .toList(),
        deliveryInfo: j['deliveryInfo'] as Map<String, dynamic>?,
        paymentInfo: j['paymentInfo'] as Map<String, dynamic>?,
        notes: j['notes'] as String?,
        createdAt: j['createdAt'] as String?,
      );
}

class Worker {
  const Worker({
    required this.id,
    this.specialty,
    this.status,
    this.user,
    this.machine,
  });
  final String id;
  final String? specialty;
  final String? status;
  final Map<String, dynamic>? user;
  final Map<String, dynamic>? machine;

  String get displayName =>
      user != null ? '${user!['username'] ?? user!['name'] ?? 'Worker'}' : 'Worker';

  factory Worker.fromJson(Map<String, dynamic> j) => Worker(
        id: '${j['id'] ?? ''}',
        specialty: j['specialty'] as String?,
        status: j['status'] as String?,
        user: j['user'] as Map<String, dynamic>?,
        machine: j['machine'] as Map<String, dynamic>?,
      );
}

class Machine {
  const Machine({
    required this.id,
    required this.name,
    this.type,
    this.code,
    this.status = 'Available',
    this.location,
    this.maintenanceNotes,
  });
  final String id;
  final String name;
  final String? type;
  final String? code;
  final String status;
  final String? location;
  final String? maintenanceNotes;

  factory Machine.fromJson(Map<String, dynamic> j) => Machine(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        type: j['type'] as String?,
        code: j['code'] as String?,
        status: '${j['status'] ?? 'Available'}',
        location: j['location'] as String?,
        maintenanceNotes: j['maintenanceNotes'] as String?,
      );
}

class InventoryMaterial {
  const InventoryMaterial({
    required this.id,
    required this.name,
    this.category,
    this.unit,
    this.currentQuantity = 0,
    this.minStockLevel,
  });
  final String id;
  final String name;
  final String? category;
  final String? unit;
  final double currentQuantity;
  final double? minStockLevel;

  bool get isLow =>
      minStockLevel != null && currentQuantity <= minStockLevel!;

  factory InventoryMaterial.fromJson(Map<String, dynamic> j) => InventoryMaterial(
        id: '${j['id'] ?? ''}',
        name: '${j['name'] ?? ''}',
        category: j['category'] as String?,
        unit: j['unit'] as String?,
        currentQuantity: _toDouble(j['currentQuantity']),
        minStockLevel: j['minStockLevel'] != null
            ? _toDouble(j['minStockLevel'])
            : null,
      );
}

class ProductionJob {
  const ProductionJob({
    required this.id,
    required this.status,
    this.orderId,
    this.productId,
    this.progress = 0,
    this.estimatedDays,
    this.qcStatus,
    this.notes,
    this.workers = const [],
  });
  final String id;
  final String status;
  final String? orderId;
  final String? productId;
  final int progress;
  final int? estimatedDays;
  final String? qcStatus;
  final String? notes;
  final List<Worker> workers;

  factory ProductionJob.fromJson(Map<String, dynamic> j) => ProductionJob(
        id: '${j['id'] ?? ''}',
        status: '${j['status'] ?? ''}',
        orderId: j['orderId'] as String?,
        productId: j['productId'] as String?,
        progress: _toInt(j['progress']),
        estimatedDays: _toIntNullable(j['estimatedDays']),
        qcStatus: j['qcStatus'] as String?,
        notes: j['notes'] as String?,
        workers: (j['assignees'] as List? ?? [])
            .whereType<Map<String, dynamic>>()
            .map((a) => Worker.fromJson(
                (a['worker'] as Map<String, dynamic>?) ?? a))
            .toList(),
      );
}

class Commission {
  const Commission({
    required this.id,
    required this.amount,
    this.rate,
    required this.status,
    this.paidAt,
    this.createdAt,
    this.order,
    this.seller,
  });
  final String id;
  final double amount;
  final double? rate;
  final String status;
  final String? paidAt;
  final String? createdAt;
  final Map<String, dynamic>? order;
  final Map<String, dynamic>? seller;

  factory Commission.fromJson(Map<String, dynamic> j) => Commission(
        id: '${j['id'] ?? ''}',
        amount: _toDouble(j['amount']),
        rate: j['rate'] != null ? _toDouble(j['rate']) : null,
        status: '${j['status'] ?? ''}',
        paidAt: j['paidAt'] as String?,
        createdAt: j['createdAt'] as String?,
        order: j['order'] as Map<String, dynamic>?,
        seller: j['seller'] as Map<String, dynamic>?,
      );
}

class AdminOverview {
  const AdminOverview({
    this.sellers = 0,
    this.pendingSellers = 0,
    this.products = 0,
    this.pendingProducts = 0,
    this.orders = 0,
    this.workers = 0,
    this.paymentStats,
    this.recentOrders = const [],
  });

  final int sellers;
  final int pendingSellers;
  final int products;
  final int pendingProducts;
  final int orders;
  final int workers;
  final Map<String, dynamic>? paymentStats;
  final List<Order> recentOrders;

  factory AdminOverview.fromJson(Map<String, dynamic> j) {
    final counts =
        (j['counts'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    return AdminOverview(
      sellers: _toInt(counts['sellers']),
      pendingSellers: _toInt(counts['pendingSellers']),
      products: _toInt(counts['products']),
      pendingProducts: _toInt(counts['pendingProducts']),
      orders: _toInt(counts['orders']),
      workers: _toInt(counts['workers']),
      paymentStats: j['paymentStats'] as Map<String, dynamic>?,
      recentOrders: (j['recentOrders'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(Order.fromJson)
          .toList(),
    );
  }
}

int _toInt(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v) ?? 0;
  return 0;
}

int? _toIntNullable(dynamic v) {
  if (v == null) return null;
  return _toInt(v);
}

double _toDouble(dynamic v) {
  if (v is double) return v;
  if (v is int) return v.toDouble();
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? 0;
  return 0;
}
