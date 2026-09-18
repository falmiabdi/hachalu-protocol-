import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/models/hachalu_models.dart';

class CartItem {
  const CartItem({
    required this.product,
    required this.variant,
    required this.quantity,
  });

  final Product product;
  final ProductVariant variant;
  final int quantity;

  double get lineTotal => variant.price * quantity;

  CartItem copyWith({int? quantity}) => CartItem(
        product: product,
        variant: variant,
        quantity: quantity ?? this.quantity,
      );

  Map<String, dynamic> toJson() => {
        'productId': product.id,
        'variantId': variant.id,
        'quantity': quantity,
      };
}

class CartProvider extends ChangeNotifier {
  CartProvider(this._prefs);

  static const String _storageKey = 'hachalu_cart_v1';

  final SharedPreferences _prefs;
  List<CartItem> _items = [];

  List<CartItem> get items => _items;
  int get count => _items.fold(0, (s, i) => s + i.quantity);
  double get total => _items.fold(0, (s, i) => s + i.lineTotal);

  Future<void> load() async {
    final raw = _prefs.getString(_storageKey);
    if (raw == null) {
      return;
    }
    try {
      final list = jsonDecode(raw) as List? ?? [];
      final restored = <CartItem>[];
      for (final entry in list.whereType<Map<String, dynamic>>()) {
        final product = entry['product'];
        final variant = entry['variant'];
        if (product is! Map<String, dynamic>) continue;
        restored.add(CartItem(
          product: Product.fromJson(product),
          variant: ProductVariant.fromJson(variant as Map<String, dynamic>),
          quantity: (entry['quantity'] as num?)?.toInt() ?? 1,
        ));
      }
      _items = restored;
    } catch (_) {
      _items = [];
    }
    notifyListeners();
  }

  Future<void> add(Product product, ProductVariant variant,
      {int quantity = 1}) async {
    final idx = _items.indexWhere((i) => i.variant.id == variant.id);
    if (idx >= 0) {
      _items[idx] = _items[idx].copyWith(quantity: _items[idx].quantity + quantity);
    } else {
      _items.add(CartItem(product: product, variant: variant, quantity: quantity));
    }
    await _persist();
  }

  Future<void> setQuantity(String variantId, int quantity) async {
    final idx = _items.indexWhere((i) => i.variant.id == variantId);
    if (idx < 0) return;
    if (quantity <= 0) {
      _items.removeAt(idx);
    } else {
      _items[idx] = _items[idx].copyWith(quantity: quantity);
    }
    await _persist();
  }

  Future<void> remove(String variantId) async {
    _items.removeWhere((i) => i.variant.id == variantId);
    await _persist();
  }

  Future<void> clear() async {
    _items = [];
    await _persist();
  }

  Future<void> _persist() async {
    notifyListeners();
    final payload = _items.map((i) => {
          'product': i.product.toPersistJson(),
          'variant': i.variant.toPersistJson(),
          'quantity': i.quantity,
        }).toList();
    await _prefs.setString(_storageKey, jsonEncode(payload));
  }
}