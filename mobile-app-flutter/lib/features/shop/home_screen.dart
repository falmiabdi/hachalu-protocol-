import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';
import '../../widgets/product_card.dart';
import 'catalog_screen.dart';
import 'custom_order_screen.dart';

class HachaluHomeScreen extends StatefulWidget {
  const HachaluHomeScreen({super.key});

  @override
  State<HachaluHomeScreen> createState() => _HachaluHomeScreenState();
}

class _HachaluHomeScreenState extends State<HachaluHomeScreen> {
  bool _started = false;
  bool _loading = true;
  bool _error = false;
  List<Category> _categories = const [];
  List<Product> _products = const [];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_started) {
      _started = true;
      _load();
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = false;
    });
    try {
      final repo = context.read<HachaluRepository>();
      final categories = await repo.fetchCategories();
      final products = await repo.fetchProducts(limit: 8);
      if (!mounted) return;
      setState(() {
        _categories = categories;
        _products = products;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = true;
      });
    }
  }

  void _openCatalog([String? categoryId, String? query]) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => CatalogScreen(categoryId: categoryId, query: query),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Hachalu Protocol')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Could not load the shop'),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _HeroBanner(onShopNow: () => _openCatalog()),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Categories',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.foreground,
                ),
              ),
              TextButton(
                onPressed: () => _openCatalog(),
                child: const Text('See all'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _categoriesRow(),
          const SizedBox(height: 24),
          const Text(
            'Featured',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.foreground,
            ),
          ),
          const SizedBox(height: 12),
          _featuredGrid(),
          const SizedBox(height: 24),
          _madeToMeasureCard(),
        ],
      ),
    );
  }

  Widget _categoriesRow() {
    if (_categories.isEmpty) {
      return const SizedBox(
        height: 40,
        child: Center(
          child: Text(
            'No categories yet',
            style: TextStyle(color: AppColors.mutedForeground),
          ),
        ),
      );
    }
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final c = _categories[i];
          return _CategoryChip(
            label: c.productCount > 0 ? '${c.name} (${c.productCount})' : c.name,
            onTap: () => _openCatalog(c.id),
          );
        },
      ),
    );
  }

  Widget _featuredGrid() {
    if (_products.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(AppColors.radius),
          border: Border.all(color: AppColors.border),
        ),
        child: const Text(
          'No featured products yet',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.mutedForeground),
        ),
      );
    }
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 0.7,
      children: [
        for (final p in _products)
          ProductCard(product: p, repository: context.read<HachaluRepository>()),
      ],
    );
  }

  Widget _madeToMeasureCard() {
    final product = _products.isEmpty ? null : _products.first;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppColors.radius),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Made to Measure',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.foreground,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Custom-made garments measured to your exact specifications.',
            style: TextStyle(color: AppColors.mutedForeground),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: product == null
                ? null
                : () {
                    Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => CustomOrderScreen(
                        product: product,
                        repository: context.read<HachaluRepository>(),
                      ),
                    ));
                  },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Start Custom Order'),
          ),
        ],
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  const _HeroBanner({required this.onShopNow});

  final VoidCallback onShopNow;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppColors.radius),
        gradient: const LinearGradient(
          colors: [Color(0xFFF97316), Color(0xFFFDBA74)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Hachalu Protocol',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Tailored Ethiopian Fashion',
            style: TextStyle(fontSize: 15, color: Colors.white70),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: onShopNow,
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.primary,
            ),
            child: const Text('Shop Now'),
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.card,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
          ),
          child: Text(
            label,
            style: const TextStyle(
              color: AppColors.foreground,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}