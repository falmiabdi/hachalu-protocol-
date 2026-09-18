import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';

class AdminProductionScreen extends StatefulWidget {
  const AdminProductionScreen({super.key});

  @override
  State<AdminProductionScreen> createState() => _AdminProductionScreenState();
}

class _AdminProductionScreenState extends State<AdminProductionScreen> {
  bool _loading = true;
  Object? _error;
  List<ProductionJob> _jobs = const [];
  List<Worker> _workers = const [];
  String? _busyId;

  static const List<String> _flow = [
    'Assigned',
    'Started',
    'InProgress25',
    'InProgress50',
    'InProgress75',
    'Ready',
    'QualityCheck',
    'Completed',
  ];

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
      final results = await Future.wait([
        repo.fetchProductionJobs(),
        repo.fetchWorkers(),
      ]);
      if (!mounted) return;
      setState(() {
        _jobs = results[0] as List<ProductionJob>;
        _workers = results[1] as List<Worker>;
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
        return AppColors.success;
      case 'Assigned':
        return AppColors.mutedForeground;
      default:
        return AppColors.warning;
    }
  }

  String _shortId(String id) => id.length > 8 ? id.substring(0, 8) : id;

  Future<void> _run(String id, Future<void> Function() action) async {
    setState(() => _busyId = id);
    try {
      await action();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Job updated')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _assignWorkers(ProductionJob job) async {
    final current = job.workers.map((w) => w.id).toSet();
    final selected = <String>{...current};
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Assign workers'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView(
              shrinkWrap: true,
              children: _workers
                  .map(
                    (w) => CheckboxListTile(
                      dense: true,
                      controlAffinity: ListTileControlAffinity.leading,
                      title: Text(w.displayName),
                      subtitle: w.specialty != null && w.specialty!.isNotEmpty
                          ? Text(w.specialty!)
                          : null,
                      value: selected.contains(w.id),
                      onChanged: (checked) {
                        setDialogState(() {
                          if (checked == true) {
                            selected.add(w.id);
                          } else {
                            selected.remove(w.id);
                          }
                        });
                      },
                    ),
                  )
                  .toList(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: selected.isEmpty
                  ? null
                  : () => Navigator.of(context).pop(true),
              child: const Text('Assign'),
            ),
          ],
        ),
      ),
    );
    if (result != true || !mounted) return;
    await _run(job.id, () async {
      await context.read<HachaluRepository>().assignJobWorkers(job.id, selected.toList());
    });
  }

  Future<void> _advance(ProductionJob job) async {
    final index = _flow.indexOf(job.status);
    if (index < 0 || index >= _flow.length - 1) return;
    final next = _flow[index + 1];
    await _run(job.id, () async {
      await context.read<HachaluRepository>().updateJobStatus(job.id, next);
    });
  }

  Future<void> _approveQc(ProductionJob job) async {
    await _run(job.id, () async {
      await context.read<HachaluRepository>().updateJobQc(job.id, 'Approved');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Production')),
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
                  child: _jobs.isEmpty
                      ? ListView(
                          padding: const EdgeInsets.all(16),
                          children: const [
                            SizedBox(height: 120),
                            Icon(Icons.factory_outlined, size: 48, color: AppColors.mutedForeground),
                            SizedBox(height: 12),
                            Text(
                              'No production jobs',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.mutedForeground),
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _jobs.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (context, i) {
                            final job = _jobs[i];
                            final busy = _busyId == job.id;
                            final flowIndex = _flow.indexOf(job.status);
                            final canAdvance =
                                flowIndex >= 0 && flowIndex < _flow.length - 1;
                            final progress =
                                (job.progress / 100).clamp(0.0, 1.0).toDouble();
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
                                          'Job ${_shortId(job.id)}',
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
                                          color: _statusColor(job.status).withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          job.status,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: _statusColor(job.status),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  if (job.orderId != null && job.orderId!.isNotEmpty)
                                    Text(
                                      'Order ${_shortId(job.orderId!)}',
                                      style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                                    ),
                                  const SizedBox(height: 8),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(999),
                                    child: LinearProgressIndicator(
                                      value: progress,
                                      minHeight: 6,
                                      backgroundColor: AppColors.muted,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${job.progress}%',
                                    style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                                  ),
                                  const SizedBox(height: 8),
                                  if (job.qcStatus != null && job.qcStatus!.isNotEmpty)
                                    Text(
                                      'QC: ${job.qcStatus}',
                                      style: const TextStyle(fontSize: 12, color: AppColors.foreground),
                                    ),
                                  if (job.notes != null && job.notes!.isNotEmpty)
                                    Text(
                                      job.notes!,
                                      style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                                    ),
                                  if (job.workers.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      'Workers: ${job.workers.map((w) => w.displayName).join(', ')}',
                                      style: const TextStyle(fontSize: 12, color: AppColors.foreground),
                                    ),
                                  ],
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      SizedBox(
                                        height: 32,
                                        child: OutlinedButton(
                                          style: OutlinedButton.styleFrom(
                                            padding: const EdgeInsets.symmetric(horizontal: 12),
                                            textStyle: const TextStyle(fontSize: 11),
                                          ),
                                          onPressed: busy ? null : () => _assignWorkers(job),
                                          child: const Text('Assign workers'),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      if (canAdvance)
                                        SizedBox(
                                          height: 32,
                                          child: FilledButton(
                                            style: FilledButton.styleFrom(
                                              backgroundColor: AppColors.primary,
                                              padding: const EdgeInsets.symmetric(horizontal: 12),
                                              textStyle: const TextStyle(fontSize: 11),
                                            ),
                                            onPressed: busy
                                                ? null
                                                : () => _advance(job),
                                            child: busy
                                                ? const SizedBox(
                                                    width: 14,
                                                    height: 14,
                                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                                  )
                                                : Text('Advance: ${_flow[flowIndex + 1]}'),
                                          ),
                                        ),
                                      const SizedBox(width: 8),
                                      if (job.status == 'QualityCheck')
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
                                                : () => _approveQc(job),
                                            child: const Text('Approve QC'),
                                          ),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}