import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';

class AdminMachinesScreen extends StatefulWidget {
  const AdminMachinesScreen({super.key});

  @override
  State<AdminMachinesScreen> createState() => _AdminMachinesScreenState();
}

class _AdminMachinesScreenState extends State<AdminMachinesScreen> {
  bool _loading = true;
  Object? _error;
  List<Machine> _machines = const [];
  bool _adding = false;

  static const List<String> _statuses = ['Available', 'InUse', 'Maintenance', 'Disabled'];

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
      final machines = await repo.fetchMachines();
      if (!mounted) return;
      setState(() {
        _machines = machines;
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
      case 'Available':
        return AppColors.success;
      case 'InUse':
        return AppColors.primary;
      case 'Maintenance':
        return AppColors.warning;
      case 'Disabled':
        return AppColors.mutedForeground;
      default:
        return AppColors.mutedForeground;
    }
  }

  Future<void> _openAdd() async {
    final name = TextEditingController();
    final type = TextEditingController();
    final code = TextEditingController();
    final location = TextEditingController();
    String status = 'Available';
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add machine'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  autofocus: true,
                  decoration: const InputDecoration(labelText: 'Name *'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: type,
                  decoration: const InputDecoration(labelText: 'Type'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: code,
                  decoration: const InputDecoration(labelText: 'Code'),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: status,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items: _statuses
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null && v.isNotEmpty) {
                      setDialogState(() => status = v);
                    }
                  },
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: location,
                  decoration: const InputDecoration(labelText: 'Location'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                if (name.text.trim().isEmpty) return;
                Navigator.of(context).pop(true);
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _adding = true);
    try {
      await context.read<HachaluRepository>().createMachine({
        'name': name.text.trim(),
        'type': type.text.trim(),
        'code': code.text.trim(),
        'status': status,
        'location': location.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Machine added')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      name.dispose();
      type.dispose();
      code.dispose();
      location.dispose();
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Machines')),
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
                  child: _machines.isEmpty
                      ? ListView(
                          padding: const EdgeInsets.all(16),
                          children: const [
                            SizedBox(height: 120),
                            Icon(Icons.precision_manufacturing_outlined, size: 48, color: AppColors.mutedForeground),
                            SizedBox(height: 12),
                            Text(
                              'No machines yet',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.mutedForeground),
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _machines.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (context, i) {
                            final machine = _machines[i];
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
                                          machine.name,
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
                                          color: _statusColor(machine.status).withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          machine.status,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: _statusColor(machine.status),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Wrap(
                                    spacing: 4,
                                    runSpacing: 4,
                                    children: [
                                      if (machine.code != null && machine.code!.isNotEmpty)
                                        _InfoChip(machine.code!),
                                      if (machine.type != null && machine.type!.isNotEmpty)
                                        _InfoChip(machine.type!),
                                    ],
                                  ),
                                  if (machine.location != null && machine.location!.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        'Location: ${machine.location}',
                                        style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                                      ),
                                    ),
                                  if (machine.maintenanceNotes != null && machine.maintenanceNotes!.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        'Notes: ${machine.maintenanceNotes}',
                                        style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                                      ),
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _adding ? null : _openAdd,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: _adding
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : const Icon(Icons.add),
        label: const Text('Add machine'),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.muted,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
      ),
    );
  }
}