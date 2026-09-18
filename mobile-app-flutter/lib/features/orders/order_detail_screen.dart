import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/money.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';
import '../../widgets/hachalu_image.dart';

Color _statusColor(String status) {
  switch (status) {
    case 'PendingPayment':
      return AppColors.warning;
    case 'Paid':
      return const Color(0xFF3B82F6);
    case 'MeasurementPending':
      return const Color(0xFF8B5CF6);
    case 'MeasurementConfirmed':
      return const Color(0xFF14B8A6);
    case 'Assigned':
      return AppColors.primary;
    case 'InProduction':
      return const Color(0xFF6366F1);
    case 'Packed':
      return const Color(0xFF64748B);
    case 'Delivered':
      return AppColors.success;
    case 'Completed':
      return AppColors.success;
    case 'Cancelled':
      return AppColors.destructive;
    default:
      return AppColors.mutedForeground;
  }
}

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({
    super.key,
    required this.orderId,
    required this.repository,
    this.initialOrder,
  });

  final String orderId;
  final HachaluRepository repository;
  final Order? initialOrder;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Order? _order;
  bool _started = false;
  bool _loading = true;
  bool _error = false;
  bool _cancelling = false;

  static const Set<String> _cancellableStatuses = {
    'PendingPayment',
    'Paid',
    'MeasurementPending',
  };

  @override
  void initState() {
    super.initState();
    _order = widget.initialOrder;
  }

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
      _loading = _order == null;
      _error = false;
    });
    try {
      final order = await widget.repository.fetchOrder(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order ?? _order;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _order == null;
      });
    }
  }

  Future<void> _confirmCancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel order?'),
        content: const Text('Are you sure you want to cancel this order?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Yes, cancel'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _cancelling = true);
    try {
      final order = await widget.repository.cancelOrder(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order;
        _cancelling = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _cancelling = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not cancel order: $e')),
      );
    }
  }

  static String _date(Order order) {
    final raw = order.createdAt;
    if (raw == null || raw.length < 10) return '';
    return raw.substring(0, 10);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Order')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    final order = _order;
    if (order == null) {
      if (_error) {
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Could not load order'),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        );
      }
      return const Center(child: CircularProgressIndicator());
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _headerCard(order),
          const SizedBox(height: 16),
          if ((order.deliveryInfo?.containsKey('fullName') ?? false) ||
              (order.deliveryInfo?.containsKey('email') ?? false))
            _customerCard(order),
          const SizedBox(height: 16),
          _itemsCard(order),
          const SizedBox(height: 16),
          _deliveryCard(order),
          const SizedBox(height: 16),
          _totalCard(order),
          if (_cancellableStatuses.contains(order.status)) ...[
            const SizedBox(height: 16),
            _cancelCard(),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _headerCard(Order order) {
    final date = _date(order);
    return Container(
      padding: const EdgeInsets.all(16),
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
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.foreground,
                  ),
                ),
              ),
              _StatusChip(status: order.status),
            ],
          ),
          if (date.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                date,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.mutedForeground,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _customerCard(Order order) {
    final name = order.deliveryInfo?['fullName'] as String? ?? '';
    final email = order.deliveryInfo?['email'] as String? ?? '';
    return _sectionCard(
      title: 'Customer',
      children: [
        if (name.isNotEmpty) _infoLine(Icons.person_outline, name),
        if (email.isNotEmpty) _infoLine(Icons.mail_outline, email),
      ],
    );
  }

  Widget _itemsCard(Order order) {
    return _sectionCard(
      title: 'Items',
      children: [
        if (order.items.isEmpty)
          const Text(
            'No items',
            style: TextStyle(color: AppColors.mutedForeground),
          )
        else
          for (final item in order.items) ...[
            _itemRow(item),
            const Divider(height: 20, color: AppColors.border),
          ],
      ],
    );
  }

  Widget _itemRow(OrderItem item) {
    final images = item.product?.images ?? const <ProductImage>[];
    final url = images.isEmpty ? '' : images.first.url;
    final name = item.product?.name?.isNotEmpty ?? false
        ? item.product!.name!
        : 'Product';
    final size = item.variant?.sizeName ?? '';
    final color = item.variant?.colorName ?? '';
    final variantInfo =
        [size, color].where((s) => s.isNotEmpty).join(' · ');
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: HachaluImage(
            repository: widget.repository,
            rawUrl: url,
            width: 56,
            height: 56,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.foreground,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (variantInfo.isNotEmpty)
                Text(
                  variantInfo,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.mutedForeground,
                  ),
                ),
              Text(
                'Qty ${item.quantity}',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.mutedForeground,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              Money.etb(item.price),
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.mutedForeground,
              ),
            ),
            Text(
              Money.etb(item.price * item.quantity),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.foreground,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _deliveryCard(Order order) {
    final info = order.deliveryInfo;
    final fullName = info?['fullName'] as String? ?? '';
    final phone = info?['phone'] as String? ?? '';
    final city = info?['city'] as String? ?? '';
    final address = info?['address'] as String? ?? '';
    if (fullName.isEmpty && phone.isEmpty && city.isEmpty && address.isEmpty) {
      return const SizedBox.shrink();
    }
    return _sectionCard(
      title: 'Delivery',
      children: [
        if (fullName.isNotEmpty)
          _infoLine(Icons.person_outline, fullName, fallback: 'Name'),
        if (phone.isNotEmpty) _infoLine(Icons.phone_outlined, phone),
        if (city.isNotEmpty) _infoLine(Icons.location_city_outlined, city),
        if (address.isNotEmpty) _infoLine(Icons.place_outlined, address),
      ],
    );
  }

  Widget _totalCard(Order order) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppColors.radius),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Text(
            'Total',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.foreground,
            ),
          ),
          const Spacer(),
          Text(
            Money.etb(order.totalPrice),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _cancelCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppColors.radius),
        border: Border.all(color: AppColors.border),
      ),
      child: _cancelling
          ? const Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          : Center(
              child: OutlinedButton.icon(
                onPressed: _confirmCancel,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.destructive,
                  side: const BorderSide(color: AppColors.destructive),
                ),
                icon: const Icon(Icons.close),
                label: const Text('Cancel Order'),
              ),
            ),
    );
  }

  Widget _sectionCard({
    required String title,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppColors.radius),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.foreground,
            ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  Widget _infoLine(IconData icon, String value, {String? fallback}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.mutedForeground),
          const SizedBox(width: 10),
          Expanded(
            child: Text(value.isEmpty ? fallback ?? '' : value),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.isEmpty ? 'Unknown' : status,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}