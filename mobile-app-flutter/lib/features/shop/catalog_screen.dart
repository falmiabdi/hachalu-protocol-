import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';
import '../../widgets/product_card.dart';

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key, this.categoryId, this.query});

  final String? categoryId;
  final String? query;

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;

  bool _started = false;
  bool _loading = true;
  bool _loadingMore = false;
  bool _error = false;
  bool _hasMore = true;
  int _page = 1;
  String? _selectedCategoryId;
  List<Category> _categories = const [];
  List<Product> _products = const [];

  @override
  void initState() {
    super.initState();
    _selectedCategoryId = (widget.categoryId == null || widget.categoryId!.isEmpty)
        ? null
        : widget.categoryId;
    _searchController.text = widget.query ?? '';
    _scrollController.addListener(_onScroll);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_started) {
      _started = true;
      _reload();
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), _reload);
  }

  Future<void> _reload() async {
    setState(() {
      _loading = true;
      _error = false;
    });
    try {
      final repo = context.read<HachaluRepository>();
      var categories = _categories;
      if (categories.isEmpty) {
        categories = await repo.fetchCategories();
      }
      final query = _searchController.text.trim();
      final products = await repo.fetchProducts(
        category: _selectedCategoryId,
        query: query,
        page: 1,
        limit: 12,
      );
      if (!mounted) return;
      setState(() {
        _categories = categories;
        _products = products;
        _page = 1;
        _hasMore = products.length >= 12;
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

  Future<void> _loadMore() async {
    if (_loadingMore || _loading || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final repo = context.read<HachaluRepository>();
      final query = _searchController.text.trim();
      final nextPage = _page + 1;
      final list = await repo.fetchProducts(
        category: _selectedCategoryId,
        query: query,
        page: nextPage,
        limit: 12,
      );
      if (!mounted) return;
      setState(() {
        _products = [..._products, ...list];
        _page = nextPage;
        _hasMore = list.length >= 12;
        if (list.isEmpty) _hasMore = false;
      });
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() => _loadingMore = false);
      }
    }
  }

  void _selectCategory(String? id) {
    if (_selectedCategoryId == id) return;
    setState(() => _selectedCategoryId = id);
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Shop')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              controller: _searchController,
              onChanged: _onQueryChanged,
              onSubmitted: (_) => _reload(),
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Search products',
                prefixIcon: const Icon(Icons.search),
                isDense: true,
                filled: true,
                fillColor: AppColors.card,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          _chipsRow(),
          const SizedBox(height: 4),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _chipsRow() {
    if (_categories.isEmpty) {
      return const SizedBox(height: 4);
    }
    final items = <(String?, String)>[(null, 'All')];
    for (final c in _categories) {
      items.add((c.id, c.name));
    }
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final entry = items[i];
          final selected = entry.$1 == _selectedCategoryId;
          return InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => _selectCategory(entry.$1),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected ? AppColors.primary : AppColors.card,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: selected ? AppColors.primary : AppColors.border,
                ),
              ),
              child: Text(
                entry.$2,
                style: TextStyle(
                  color: selected ? Colors.white : AppColors.foreground,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Could not load products'),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: _reload, child: const Text('Retry')),
          ],
        ),
      );
    }
    if (_products.isEmpty) {
      return const Center(
        child: Text(
          'No products found',
          style: TextStyle(color: AppColors.mutedForeground),
        ),
      );
    }
    return CustomScrollView(
      controller: _scrollController,
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverGrid(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.7,
            ),
            delegate: SliverChildBuilderDelegate(
              (context, i) => ProductCard(
                product: _products[i],
                repository: context.read<HachaluRepository>(),
              ),
              childCount: _products.length,
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: _loadingMore
              ? const Padding(
                  padding: EdgeInsets.only(bottom: 24),
                  child: Center(
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                )
              : const SizedBox(height: 24),
        ),
      ],
    );
  }
}