import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/money.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';
import '../../providers/cart_provider.dart';
import '../../widgets/hachalu_image.dart';
import 'custom_order_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({
    super.key,
    required this.repository,
    required this.product,
  });

  final HachaluRepository repository;
  final Product product;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  Product get product => widget.product;

  int _quantity = 1;
  String? _selectedColorId;
  String? _selectedSizeKey;
  int _pageIndex = 0;

  @override
  void initState() {
    super.initState();
    final colors = product.availableColors;
    if (colors.isNotEmpty) {
      _selectedColorId = colors.first.id;
    }
    if (product.variants.isNotEmpty) {
      _selectedSizeKey = product.variants.first.size?.id ?? '__no_size__';
    }
  }

  List<ProductVariant> get _colorVariants {
    if (_selectedColorId == null) return product.variants;
    return product.variants
        .where((v) => v.color?.id == _selectedColorId)
        .toList();
  }

  ProductVariant? get _selectedVariant {
    final list = _colorVariants;
    if (list.isEmpty) return null;
    if (_selectedSizeKey != null) {
      for (final v in list) {
        if ((v.size?.id ?? '__no_size__') == _selectedSizeKey) return v;
      }
    }
    return list.first;
  }

  List<List<String>> get _sizeOptions {
    final seen = <String>{};
    final result = <List<String>>[];
    for (final v in _colorVariants) {
      final key = v.size?.id ?? '__no_size__';
      if (seen.add(key)) {
        result.add([key, v.size?.name ?? 'Default']);
      }
    }
    return result;
  }

  void _selectColor(String id) {
    setState(() {
      _selectedColorId = id;
      final variants =
          product.variants.where((v) => v.color?.id == id).toList();
      _selectedSizeKey =
          variants.isEmpty ? null : (variants.first.size?.id ?? '__no_size__');
    });
  }

  List<String> get _galleryUrls {
    final urls =
        product.images.map((i) => i.url).where((u) => u.isNotEmpty).toList();
    return urls.isEmpty ? <String>[''] : urls;
  }

  Future<void> _addToCart() async {
    final variant = _selectedVariant;
    if (variant == null) return;
    await context.read<CartProvider>().add(product, variant, quantity: _quantity);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Added to cart')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final soldOut = product.variants.isEmpty;
    final variant = _selectedVariant;
    final unitPrice = variant?.price ?? product.minPrice;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _gallery(),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (product.category != null)
                          Text(
                            product.category!.name,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.mutedForeground,
                            ),
                          ),
                        if (product.category != null) const SizedBox(height: 4),
                        Text(
                          product.name,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: AppColors.foreground,
                          ),
                        ),
                        if (product.description != null &&
                            product.description!.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            product.description!,
                            style: const TextStyle(
                              fontSize: 15,
                              color: AppColors.foreground,
                              height: 1.5,
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        if (!soldOut) ...[
                          const Text(
                            'Price',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.mutedForeground,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            Money.etb(unitPrice),
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                          if (product.availableColors.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            const Text(
                              'Color',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.foreground,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final c in product.availableColors)
                                  _buildColorChip(
                                    id: c.id,
                                    name: c.name,
                                    hex: c.hex,
                                  ),
                              ],
                            ),
                          ],
                          if (_sizeOptions.isNotEmpty) ...[
                            const SizedBox(height: 16),
                            const Text(
                              'Size',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.foreground,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final s in _sizeOptions)
                                  ChoiceChip(
                                    label: Text(s[1]),
                                    selected: _selectedSizeKey == s[0],
                                    selectedColor: AppColors.primarySoft,
                                    onSelected: (_) =>
                                        setState(() => _selectedSizeKey = s[0]),
                                  ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 16),
                          const Text(
                            'Quantity',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.foreground,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _quantityStepper(),
                        ],
                        if (soldOut) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.card,
                              borderRadius:
                                  BorderRadius.circular(AppColors.radius),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.info_outline,
                                    color: AppColors.destructive),
                                SizedBox(width: 12),
                                Text(
                                  'Sold out',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.destructive,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          _bottomBar(unitPrice, soldOut, variant),
        ],
      ),
    );
  }

  Widget _gallery() {
    final urls = _galleryUrls;
    return SizedBox(
      height: 320,
      child: Stack(
        children: [
          PageView.builder(
            itemCount: urls.length,
            onPageChanged: (i) => setState(() => _pageIndex = i),
            itemBuilder: (_, i) => HachaluImage(
              repository: widget.repository,
              rawUrl: urls[i],
              fit: BoxFit.cover,
              width: double.infinity,
              height: 320,
            ),
          ),
          if (urls.length > 1)
            Positioned(
              bottom: 12,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (int i = 0; i < urls.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: _pageIndex == i ? 16 : 8,
                      height: 8,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      decoration: BoxDecoration(
                        color:
                            _pageIndex == i ? AppColors.primary : Colors.white70,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildColorChip({
    required String id,
    required String name,
    required String? hex,
  }) {
    final selected = _selectedColorId == id;
    return InkWell(
      borderRadius: BorderRadius.circular(30),
      onTap: () => _selectColor(id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primarySoft : AppColors.card,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Dot(hex: hex),
            const SizedBox(width: 6),
            Text(
              name,
              style: TextStyle(
                color: selected ? AppColors.primary : AppColors.foreground,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _quantityStepper() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.remove),
            onPressed: _quantity > 1
                ? () => setState(() => _quantity--)
                : null,
          ),
          Text(
            '$_quantity',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => setState(() => _quantity++),
          ),
        ],
      ),
    );
  }

  Widget _bottomBar(double unitPrice, bool soldOut, ProductVariant? variant) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            OutlinedButton(
              onPressed: () {
                Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => CustomOrderScreen(
                    product: product,
                    repository: widget.repository,
                  ),
                ));
              },
              child: const Text('Made to Measure'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Total',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.mutedForeground,
                        ),
                      ),
                      Text(
                        Money.etb(unitPrice * _quantity),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.foreground,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ElevatedButton(
                    onPressed: (soldOut || variant == null) ? null : _addToCart,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Add to Cart'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({this.hex});

  final String? hex;

  @override
  Widget build(BuildContext context) {
    Color? parsed;
    if (hex != null && hex!.isNotEmpty) {
      final clean = hex!
          .replaceFirst('#', '')
          .replaceFirst('0x', '')
          .replaceFirst('0X', '');
      if (clean.length >= 6) {
        parsed = Color(int.tryParse('FF$clean', radix: 16) ??
            int.tryParse(clean, radix: 16) ??
            0xFFBDBDBD);
      }
    }
    return Container(
      width: 14,
      height: 14,
      decoration: BoxDecoration(
        color: parsed ?? Colors.grey.shade300,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 1),
      ),
    );
  }
}