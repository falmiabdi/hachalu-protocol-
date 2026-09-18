import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/money.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';
import '../orders/order_detail_screen.dart';

class CustomOrderScreen extends StatefulWidget {
  const CustomOrderScreen({
    super.key,
    required this.product,
    required this.repository,
  });

  final Product product;
  final HachaluRepository repository;

  @override
  State<CustomOrderScreen> createState() => _CustomOrderScreenState();
}

class _CustomOrderScreenState extends State<CustomOrderScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, String?> _selectValues = {};
  final Map<String, String?> _selectErrors = {};
  final TextEditingController _notesController = TextEditingController();

  bool _started = false;
  bool _loading = true;
  bool _error = false;
  bool _submitting = false;
  int _quantity = 1;
  List<MeasurementTemplate> _templates = const [];
  String? _selectedTemplateId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_started) {
      _started = true;
      _loadTemplates();
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadTemplates() async {
    setState(() {
      _loading = true;
      _error = false;
    });
    try {
      final templates = await widget.repository.fetchMeasurementTemplates();
      if (!mounted) return;
      setState(() {
        _templates = templates;
        _selectedTemplateId = templates.isEmpty ? null : templates.first.id;
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

  MeasurementTemplate? get _template {
    for (final t in _templates) {
      if (t.id == _selectedTemplateId) return t;
    }
    return null;
  }

  TextEditingController _controllerFor(String name) =>
      _controllers.putIfAbsent(name, () => TextEditingController());

  void _selectTemplate(String id) {
    setState(() => _selectedTemplateId = id);
  }

  InputDecoration _decoration(String label, {String? errorText}) {
    return InputDecoration(
      labelText: label,
      errorText: errorText,
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
    );
  }

  Future<void> _submit() async {
    final template = _template;
    if (template == null) return;
    final valid = _formKey.currentState?.validate() ?? false;
    final selectErrors = <String, String?>{};
    for (final f in template.fields) {
      if (f.type == 'select' && f.required) {
        final v = _selectValues[f.name];
        if (v == null || v.isEmpty) selectErrors[f.name] = 'Required';
      }
    }
    setState(() {
      _selectErrors
        ..clear()
        ..addAll(selectErrors);
    });
    if (!valid || selectErrors.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all required fields')),
      );
      return;
    }

    final measurements = <String, dynamic>{};
    for (final f in template.fields) {
      if (f.type == 'select') {
        final v = _selectValues[f.name];
        if (v != null && v.isNotEmpty) measurements[f.name] = v;
      } else {
        final v = _controllerFor(f.name).text.trim();
        if (v.isNotEmpty) measurements[f.name] = v;
      }
    }

    setState(() => _submitting = true);
    try {
      final order = await widget.repository.createOrder({
        'type': 'custom',
        'items': [
          {
            'productId': widget.product.id,
            'variantId': null,
            'quantity': _quantity,
            'templateId': template.id,
            'measurementValues': measurements,
            'styleNotes': _notesController.text.trim(),
          },
        ],
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Custom order submitted')),
      );
      Navigator.of(context).pushReplacement(MaterialPageRoute(
        builder: (_) => OrderDetailScreen(
          orderId: order.id,
          repository: widget.repository,
        ),
      ));
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not submit order: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Made to Measure')),
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
            const Text('Could not load measurement templates'),
            const SizedBox(height: 12),
            OutlinedButton(
                onPressed: _loadTemplates, child: const Text('Retry')),
          ],
        ),
      );
    }
    final template = _template;
    if (template == null) {
      return const Center(
        child: Text(
          'No measurement templates available',
          style: TextStyle(color: AppColors.mutedForeground),
        ),
      );
    }
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.product.name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.foreground,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Measurements will be confirmed by our tailors before production.',
                  style: const TextStyle(color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Measurement Template',
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
                    for (final t in _templates)
                      ChoiceChip(
                        label: Text(t.name),
                        selected: _selectedTemplateId == t.id,
                        selectedColor: AppColors.primarySoft,
                        onSelected: (_) => _selectTemplate(t.id),
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final field in template.fields) ...[
                        _fieldWidget(field),
                        const SizedBox(height: 12),
                      ],
                      TextFormField(
                        controller: _notesController,
                        minLines: 2,
                        maxLines: 4,
                        decoration:
                            _decoration('Style notes (optional)'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        _bottomBar(template),
      ],
    );
  }

  Widget _fieldWidget(MeasurementField field) {
    if (field.type == 'select') {
      return InputDecorator(
        isEmpty: _selectValues[field.name] == null ||
            _selectValues[field.name]!.isEmpty,
        decoration: _decoration(field.name, errorText: _selectErrors[field.name]),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            value: _selectValues[field.name],
            isExpanded: true,
            hint: const Text('Select an option'),
            items: [
              for (final o in (field.options ?? const <String>[]))
                DropdownMenuItem(value: o, child: Text(o)),
            ],
            onChanged: (v) => setState(() {
              _selectValues[field.name] = v;
              _selectErrors.remove(field.name);
            }),
          ),
        ),
      );
    }
    final isNumber = field.type == 'number';
    return TextFormField(
      controller: _controllerFor(field.name),
      keyboardType: isNumber
          ? const TextInputType.numberWithOptions(decimal: true)
          : TextInputType.text,
      decoration: _decoration(field.name),
      validator: (v) {
        final text = v?.trim() ?? '';
        if (field.required && text.isEmpty) return 'Required';
        if (!isNumber || text.isEmpty) return null;
        final parsed = double.tryParse(text);
        if (parsed == null) return 'Enter a valid number';
        if (field.min != null && parsed < field.min!.toDouble()) {
          return 'Minimum ${field.min}';
        }
        if (field.max != null && parsed > field.max!.toDouble()) {
          return 'Maximum ${field.max}';
        }
        return null;
      },
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

  Widget _bottomBar(MeasurementTemplate template) {
    final estimated = widget.product.minPrice * _quantity;
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
            Row(
              children: [
                const Text(
                  'Quantity',
                  style: TextStyle(color: AppColors.mutedForeground),
                ),
                const Spacer(),
                _quantityStepper(),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Text(
                  'Estimated',
                  style: TextStyle(color: AppColors.mutedForeground),
                ),
                const Spacer(),
                Text(
                  Money.etb(estimated),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.foreground,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Submit Custom Order'),
            ),
          ],
        ),
      ),
    );
  }
}