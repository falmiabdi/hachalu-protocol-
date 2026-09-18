import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/money.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';

class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  bool _loading = true;
  Object? _error;
  List<Order> _orders = const [];
  String? _busyId;

  static const Map<String, String> _next = {
    'PendingPayment': 'Paid',
    'Paid': 'MeasurementConfirmed',
    'MeasurementConfirmed': 'Assigned',
    'Assigned': 'InProduction',
    'InProduction': 'Packed',
    'Packed': 'Delivered',
    'Delivered': 'Completed',
  };

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
      final orders = await repo.fetchAllOrders();
      if (!mounted) return;
      setState(() {
        _orders = orders;
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

  Color _statusColor(String status) {
    switch (status) {
      case 'Completed':
      case 'Paid':
      case 'Delivered':
      case 'MeasurementConfirmed':
        return AppColors.success;
      case 'PendingPayment':
      case 'MeasurementPending':
      case 'Assigned':
      case 'InProduction':
      case 'Packed':
        return AppColors.warning;
      case 'Cancelled':
      case 'Failed':
        return AppColors.destructive;
      default:
        return AppColors.mutedForeground;
    }
  }

  String _customerName(Order order) {
    final info = order.deliveryInfo;
    if (info is Map<String, dynamic>) {
      final name = info['fullName'];
      if (name is String && name.isNotEmpty) return name;
    }
    return '';
  }

  Future<void> _advance(Order order) async {
    final next = _next[order.status];
    if (next == null || _busyId == order.id) return;
    setState(() => _busyId = order.id);
    try {
      await context.read<HachaluRepository>().updateOrderStatus(order.id, next);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${order.orderNumber} moved to $next')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
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
                  child: _orders.isEmpty
                      ? ListView(
                          padding: const EdgeInsets.all(16),
                          children: const [
                            SizedBox(height: 120),
                            Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.mutedForeground),
                            SizedBox(height: 12),
                            Text(
                              'No orders',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.mutedForeground),
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _orders.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (context, i) {
                            final order = _orders[i];
                            final status = order.status;
                            final busy = _busyId == order.id;
                            final canAdvance = _next.containsKey(status);
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
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          order.orderNumber,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.foreground,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: _statusColor(status).withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          status,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: _statusColor(status),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  if (_customerName(order).isNotEmpty)
                                    Text(
                                      _customerName(order),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 13, color: AppColors.foreground),
                                    ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.muted,
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          order.type,
                                          style: const TextStyle(fontSize: 10, color: AppColors.mutedForeground),
                                        ),
                                      ),
                                      const Spacer(),
                                      Text(
                                        Money.etb(order.totalPrice),
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (canAdvance) ...[
                                    const SizedBox(height: 10),
                                    SizedBox(
                                      width: double.infinity,
                                      height: 34,
                                      child: FilledButton.icon(
                                        style: FilledButton.styleFrom(
                                          backgroundColor: AppColors.primary,
                                          foregroundColor: Colors.white,
                                          textStyle: const TextStyle(fontSize: 12),
                                        ),
                                        onPressed: busy ? null : () => _advance(order),
                                        icon: busy
                                            ? const SizedBox(
                                                width: 14,
                                                height: 14,
                                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                              )
                                            : const Icon(Icons.arrow_forward, size: 16),
                                        label: Text('Next: ${_next[status]}'),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}