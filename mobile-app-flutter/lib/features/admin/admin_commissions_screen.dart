import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/money.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';

class AdminCommissionsScreen extends StatefulWidget {
  const AdminCommissionsScreen({super.key});

  @override
  State<AdminCommissionsScreen> createState() => _AdminCommissionsScreenState();
}

class _AdminCommissionsScreenState extends State<AdminCommissionsScreen> {
  bool _loading = true;
  Object? _error;
  List<Commission> _commissions = const [];
  String? _busyId;

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
      final commissions = await repo.fetchAllCommissions();
      if (!mounted) return;
      setState(() {
        _commissions = commissions;
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
      case 'Paid':
        return AppColors.success;
      case 'Pending':
        return AppColors.warning;
      case 'Void':
        return AppColors.mutedForeground;
      default:
        return AppColors.mutedForeground;
    }
  }

  double get _pendingOutstanding =>
      _commissions.where((c) => c.status == 'Pending').fold(0.0, (s, c) => s + c.amount);

  String _sellerName(Commission c) {
    final seller = c.seller;
    if (seller is Map<String, dynamic>) {
      return '${seller['username'] ?? ''}';
    }
    return '';
  }

  String _orderNumber(Commission c) {
    final order = c.order;
    if (order is Map<String, dynamic>) {
      return '${order['orderNumber'] ?? ''}';
    }
    return '';
  }

  String _rateText(Commission c) {
    final rate = c.rate ?? 0;
    final pct = rate * 100;
    return pct == pct.roundToDouble()
        ? '${pct.toStringAsFixed(0)}%'
        : '${pct.toStringAsFixed(1)}%';
  }

  Future<void> _setStatus(Commission commission, String status) async {
    setState(() => _busyId = commission.id);
    try {
      await context.read<HachaluRepository>().updateCommissionStatus(commission.id, status);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Commission marked $status')),
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
      appBar: AppBar(title: const Text('Commissions')),
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
                      Container(
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
                              'Outstanding (Pending)',
                              style: TextStyle(fontSize: 11, color: AppColors.mutedForeground, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              Money.etb(_pendingOutstanding),
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppColors.warning,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'All commissions',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.foreground),
                      ),
                      const SizedBox(height: 8),
                      if (_commissions.isEmpty)
                        const Text('No commissions yet', style: TextStyle(color: AppColors.mutedForeground))
                      else
                        ..._commissions.map(
                          (c) {
                            final busy = _busyId == c.id;
                            final pending = c.status == 'Pending';
                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
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
                                          _sellerName(c).isEmpty ? 'Unknown seller' : _sellerName(c),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
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
                                          color: _statusColor(c.status).withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          c.status,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: _statusColor(c.status),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    _orderNumber(c),
                                    style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Text(
                                        Money.etb(c.amount),
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                      const Spacer(),
                                      Text(
                                        _rateText(c),
                                        style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                                      ),
                                    ],
                                  ),
                                  if (c.createdAt != null && c.createdAt!.length >= 10) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      c.createdAt!.substring(0, 10),
                                      style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                                    ),
                                  ],
                                  if (pending) ...[
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        SizedBox(
                                          height: 32,
                                          child: FilledButton(
                                            style: FilledButton.styleFrom(
                                              backgroundColor: AppColors.success,
                                              padding: const EdgeInsets.symmetric(horizontal: 12),
                                              textStyle: const TextStyle(fontSize: 11),
                                            ),
                                            onPressed: busy
                                                ? null
                                                : () => _setStatus(c, 'Paid'),
                                            child: busy
                                                ? const SizedBox(
                                                    width: 14,
                                                    height: 14,
                                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                                  )
                                                : const Text('Mark Paid'),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        SizedBox(
                                          height: 32,
                                          child: OutlinedButton(
                                            style: OutlinedButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(horizontal: 12),
                                              textStyle: const TextStyle(fontSize: 11),
                                            ),
                                            onPressed: busy ? null : () => _setStatus(c, 'Void'),
                                            child: const Text('Void'),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                ),
    );
  }
}