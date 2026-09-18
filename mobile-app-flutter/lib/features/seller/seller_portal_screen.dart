import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/money.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';
import '../../providers/auth_provider.dart';
import 'sell_product_screen.dart';
import 'seller_commissions_screen.dart';
import 'seller_orders_screen.dart';
import 'seller_products_screen.dart';

class SellerPortalScreen extends StatefulWidget {
  const SellerPortalScreen({super.key});

  @override
  State<SellerPortalScreen> createState() => _SellerPortalScreenState();
}

class _SellerPortalScreenState extends State<SellerPortalScreen> {
  int _index = 0;

  void _onNavigate(int index) => setState(() => _index = index);

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Seller Portal'),
            if (user != null && user.name.isNotEmpty)
              Text(
                user.name,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.mutedForeground,
                  fontWeight: FontWeight.w500,
                ),
              ),
          ],
        ),
      ),
      body: IndexedStack(
        index: _index,
        children: [
          _SellerDashboard(onNavigate: _onNavigate),
          const SellerProductsScreen(),
          const SellerOrdersScreen(),
          const SellerCommissionsScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: _onNavigate,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.mutedForeground,
        backgroundColor: Colors.white,
        selectedFontSize: 10,
        unselectedFontSize: 10,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.space_dashboard_outlined),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.inventory_2_outlined),
            label: 'Products',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.payments_outlined),
            label: 'Commission',
          ),
        ],
      ),
    );
  }
}

class _SellerDashboard extends StatefulWidget {
  const _SellerDashboard({required this.onNavigate});

  final ValueChanged<int> onNavigate;

  @override
  State<_SellerDashboard> createState() => _SellerDashboardState();
}

class _SellerDashboardState extends State<_SellerDashboard> {
  bool _loading = true;
  List<Product> _products = const [];
  List<Commission> _commissions = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final repo = context.read<HachaluRepository>();
    setState(() {
      _loading = true;
    });
    List<Product> products = const [];
    List<Commission> commissions = const [];
    try {
      products = await repo.fetchMyProducts();
    } catch (_) {}
    try {
      commissions = await repo.fetchMyCommissions();
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _products = products;
      _commissions = commissions;
      _loading = false;
    });
  }

  double get _pendingTotal =>
      _commissions.where((c) => c.status == 'Pending').fold(0.0, (s, c) => s + c.amount);
  double get _paidTotal =>
      _commissions.where((c) => c.status == 'Paid').fold(0.0, (s, c) => s + c.amount);

  Future<void> _openSell() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const SellProductScreen()),
    );
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          FilledButton.icon(
            onPressed: _openSell,
            icon: const Icon(Icons.add),
            label: const Text('Sell new product'),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'My products',
                  value: '${_products.length}',
                  icon: Icons.inventory_2_outlined,
                  color: AppColors.primary,
                  onTap: () => widget.onNavigate(1),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatCard(
                  label: 'My orders',
                  value: '-',
                  icon: Icons.receipt_long_outlined,
                  color: AppColors.accent,
                  onTap: () => widget.onNavigate(2),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  label: 'Pending commission',
                  value: Money.etb(_pendingTotal),
                  icon: Icons.hourglass_top,
                  color: AppColors.warning,
                  onTap: () => widget.onNavigate(3),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatCard(
                  label: 'Paid commission',
                  value: Money.etb(_paidTotal),
                  icon: Icons.payments_outlined,
                  color: AppColors.success,
                  onTap: () => widget.onNavigate(3),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'Latest products',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.foreground),
          ),
          const SizedBox(height: 8),
          if (_products.isEmpty)
            const Text('No products yet', style: TextStyle(color: AppColors.mutedForeground))
          else
            ..._products.take(5).map(
                  (p) => _BriefProductTile(
                    product: p,
                    onTap: () => widget.onNavigate(1),
                  ),
                ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppColors.radius),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(AppColors.radius),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 22, color: color),
            const SizedBox(height: 10),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.foreground,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }
}

class _BriefProductTile extends StatelessWidget {
  const _BriefProductTile({required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border, width: 0.5))),
        child: Row(
          children: [
            Expanded(
              child: Text(
                product.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, color: AppColors.foreground),
              ),
            ),
            Text(
              Money.etb(product.minPrice),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary),
            ),
          ],
        ),
      ),
    );
  }
}