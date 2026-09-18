import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/money.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';
import 'admin_commissions_screen.dart';
import 'admin_inventory_screen.dart';
import 'admin_machines_screen.dart';
import 'admin_orders_screen.dart';
import 'admin_production_screen.dart';
import 'admin_products_screen.dart';
import 'admin_workers_screen.dart';

class AdminPortalScreen extends StatefulWidget {
  const AdminPortalScreen({super.key});

  @override
  State<AdminPortalScreen> createState() => _AdminPortalScreenState();
}

class _AdminPortalScreenState extends State<AdminPortalScreen> {
  bool _loading = true;
  Object? _error;
  AdminOverview? _overview;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final repo = context.read<HachaluRepository>();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final overview = await repo.fetchAdminOverview();
      if (!mounted) return;
      setState(() {
        _overview = overview;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  double get _totalRevenue {
    final stats = _overview?.paymentStats;
    if (stats == null) return 0;
    final raw = stats['totalRevenue'];
    if (raw is num) return raw.toDouble();
    if (raw is String) return double.tryParse(raw) ?? 0;
    return 0;
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'Completed':
      case 'Paid':
      case 'Delivered':
        return AppColors.success;
      case 'PendingPayment':
      case 'MeasurementPending':
      case 'Packed':
        return AppColors.warning;
      case 'Cancelled':
      case 'Failed':
        return AppColors.destructive;
      default:
        return AppColors.mutedForeground;
    }
  }

  void _push(Widget screen) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Portal'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.cloud_off_outlined, color: AppColors.mutedForeground, size: 36),
                      const SizedBox(height: 8),
                      Text('$_error', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.mutedForeground)),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      const Text(
                        'Portal',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.foreground),
                      ),
                      const SizedBox(height: 8),
                      _buildPortalLinks(),
                      const SizedBox(height: 20),
                      const Text(
                        'Overview',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.foreground),
                      ),
                      const SizedBox(height: 8),
                      _buildStats(),
                      const SizedBox(height: 10),
                      _buildPaymentSummary(),
                      const SizedBox(height: 20),
                      const Text(
                        'Recent orders',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.foreground),
                      ),
                      const SizedBox(height: 8),
                      _buildRecentOrders(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildPortalLinks() {
    final links = <(String, IconData, Widget)>[
      ('Products', Icons.inventory_2_outlined, const AdminProductsScreen()),
      ('Orders', Icons.receipt_long_outlined, const AdminOrdersScreen()),
      ('Production', Icons.factory_outlined, const AdminProductionScreen()),
      ('Workers', Icons.person_outline, const AdminWorkersScreen()),
      ('Machines', Icons.precision_manufacturing_outlined, const AdminMachinesScreen()),
      ('Inventory', Icons.inventory_outlined, const AdminInventoryScreen()),
      ('Commissions', Icons.payments_outlined, const AdminCommissionsScreen()),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 1.05,
      ),
      itemCount: links.length,
      itemBuilder: (context, i) {
        final (label, icon, screen) = links[i];
        return _LinkCard(
          label: label,
          icon: icon,
          onTap: () => _push(screen),
        );
      },
    );
  }

  Widget _buildStats() {
    final overview = _overview;
    final stats = <(String, String, IconData, Color)>[
      ('Sellers', '${overview?.sellers ?? 0}', Icons.people_outline, AppColors.accent),
      ('Products', '${overview?.products ?? 0}', Icons.inventory_2_outlined, AppColors.primary),
      ('Pending products', '${overview?.pendingProducts ?? 0}', Icons.hourglass_top, AppColors.warning),
      ('Orders', '${overview?.orders ?? 0}', Icons.receipt_long_outlined, AppColors.primary),
      ('Workers', '${overview?.workers ?? 0}', Icons.person_outline, AppColors.success),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 1.8,
      ),
      itemCount: stats.length,
      itemBuilder: (context, i) {
        final (label, value, icon, color) = stats[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(AppColors.radius),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 20, color: color),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      value,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.foreground),
                    ),
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPaymentSummary() {
    final stats = _overview?.paymentStats;
    final completedCount = stats?['completedCount'] ?? 0;
    final pendingCount = stats?['pendingCount'] ?? 0;
    final failedCount = stats?['failedCount'] ?? 0;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppColors.radius),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Payments',
            style: TextStyle(fontSize: 12, color: AppColors.mutedForeground, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            Money.etb(_totalRevenue),
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.success),
          ),
          const SizedBox(height: 2),
          Text(
            'Total revenue',
            style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _PaymentLegend(color: AppColors.success, label: 'Completed $completedCount'),
              const SizedBox(width: 12),
              _PaymentLegend(color: AppColors.warning, label: 'Pending $pendingCount'),
              const SizedBox(width: 12),
              _PaymentLegend(color: AppColors.destructive, label: 'Failed $failedCount'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRecentOrders() {
    final orders = _overview?.recentOrders ?? const <Order>[];
    if (orders.isEmpty) {
      return const Text('No recent orders', style: TextStyle(color: AppColors.mutedForeground));
    }
    return Column(
      children: orders
          .map(
            (o) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      o.orderNumber,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.foreground),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: _statusColor(o.status).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      o.status,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: _statusColor(o.status),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    Money.etb(o.totalPrice),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

class _LinkCard extends StatelessWidget {
  const _LinkCard({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 22, color: AppColors.primary),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.foreground),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentLegend extends StatelessWidget {
  const _PaymentLegend({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
      ],
    );
  }
}