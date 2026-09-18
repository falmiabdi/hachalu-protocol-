import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/hachalu_models.dart';
import '../../data/repositories/hachalu_repository.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/hachalu_image.dart';

const List<String> _imagePositions = ['front', 'back', 'left', 'right', 'seatedFront', 'seatedBack'];
const List<String> _genders = ['Unisex', 'Male', 'Female', 'Child'];

class _VariantRow {
  _VariantRow({
    required this.colorId,
    required this.sizeId,
    required this.colorName,
    required this.sizeName,
  });

  final String colorId;
  final String sizeId;
  final String colorName;
  final String sizeName;
  final TextEditingController price = TextEditingController();
  final TextEditingController stock = TextEditingController();
}

class SellProductScreen extends StatefulWidget {
  const SellProductScreen({super.key});

  @override
  State<SellProductScreen> createState() => _SellProductScreenState();
}

class _SellProductScreenState extends State<SellProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();

  List<Category> _categories = const [];
  List<Brand> _brands = const [];
  List<AppColor> _colors = const [];
  List<AppSize> _sizes = const [];

  String? _categoryId;
  String? _brandId;
  String _gender = 'Unisex';

  final List<String?> _imageUrls = List<String?>.generate(6, (_) => null);
  final List<bool> _imageUploading = List<bool>.generate(6, (_) => false);

  final Set<String> _selectedColorIds = {};
  final Set<String> _selectedSizeIds = {};

  List<_VariantRow> _variants = [];

  bool _loading = true;
  bool _submitting = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _loadOptions();
  }

  @override
  void dispose() {
    for (final row in _variants) {
      row.price.dispose();
      row.stock.dispose();
    }
    _nameController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _loadOptions() async {
    final repo = context.read<HachaluRepository>();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        repo.fetchCategories(),
        repo.fetchBrands(),
        repo.fetchColors(),
        repo.fetchSizes(),
      ]);
      if (!mounted) return;
      setState(() {
        _categories = results[0] as List<Category>;
        _brands = results[1] as List<Brand>;
        _colors = results[2] as List<AppColor>;
        _sizes = results[3] as List<AppSize>;
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

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _pickSlot(int index) async {
    if (index < 0 || index >= _imageUrls.length || _imageUrls[index] != null) return;
    final repo = context.read<HachaluRepository>();
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      maxHeight: 1600,
    );
    if (file == null) return;
    setState(() => _imageUploading[index] = true);
    try {
      final bytes = await file.readAsBytes();
      final url = await repo.uploadImage(bytes, 'product_${_imagePositions[index]}.jpg');
      if (!mounted) return;
      setState(() {
        _imageUrls[index] = url;
        _imageUploading[index] = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _imageUploading[index] = false);
      _toast('Upload failed: $e');
    }
  }

  void _removeImage(int index) {
    if (index < 0 || index >= _imageUrls.length) return;
    setState(() => _imageUrls[index] = null);
  }

  void _generateVariants() {
    if (_selectedColorIds.isEmpty || _selectedSizeIds.isEmpty) {
      _toast('Select at least one color and one size first');
      return;
    }
    for (final row in _variants) {
      row.price.dispose();
      row.stock.dispose();
    }
    final rows = <_VariantRow>[];
    for (final color in _colors) {
      if (!_selectedColorIds.contains(color.id)) continue;
      for (final size in _sizes) {
        if (!_selectedSizeIds.contains(size.id)) continue;
        final row = _VariantRow(
          colorId: color.id,
          sizeId: size.id,
          colorName: color.name,
          sizeName: size.name,
        );
        row.price.text = _priceController.text;
        rows.add(row);
      }
    }
    setState(() => _variants = rows);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final name = _nameController.text.trim();
    if (name.length < 3) {
      _toast('Enter a product name');
      return;
    }
    final categoryId = _categoryId;
    if (categoryId == null || categoryId.isEmpty) {
      _toast('Choose a category');
      return;
    }
    final readyImages = <String>[];
    for (final url in _imageUrls) {
      if (url != null && url.isNotEmpty) readyImages.add(url);
    }
    if (readyImages.length < 4) {
      _toast('Upload at least 4 product images (front, back, left, right)');
      return;
    }
    final basePrice = double.tryParse(_priceController.text.trim()) ?? 0;
    if (basePrice <= 0) {
      _toast('Enter a base price greater than zero');
      return;
    }
    final validVariants = _variants
        .where((v) => (double.tryParse(v.price.text.trim()) ?? 0) > 0)
        .toList();
    if (_variants.isNotEmpty && validVariants.isEmpty) {
      _toast('Each generated variant needs a price');
      return;
    }

    final images = <Map<String, dynamic>>[];
    for (var i = 0; i < _imageUrls.length; i++) {
      final url = _imageUrls[i];
      if (url != null && url.isNotEmpty) {
        images.add({'url': url, 'position': _imagePositions[i]});
      }
    }

    final description = _descriptionController.text.trim();
    final body = <String, dynamic>{
      'name': name,
      'categoryId': categoryId,
      'gender': _gender,
      'price': basePrice,
      'images': images,
      if (description.isNotEmpty) 'description': description,
      if (_brandId != null && _brandId!.isNotEmpty) 'brandId': _brandId,
    };
    if (validVariants.isNotEmpty) {
      body['variants'] = validVariants
          .map((v) => {
                'sizeId': v.sizeId,
                'colorId': v.colorId,
                'price': double.tryParse(v.price.text.trim()) ?? 0,
                'stock': int.tryParse(v.stock.text.trim()) ?? 0,
              })
          .toList();
    } else {
      body['stock'] = 0;
    }

    setState(() => _submitting = true);
    try {
      final repo = context.read<HachaluRepository>();
      await repo.createProduct(body);
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      Navigator.of(context).pop();
      messenger.showSnackBar(const SnackBar(content: Text('Product submitted for review')));
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      _toast('Failed to submit product: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    return Scaffold(
      appBar: AppBar(title: const Text('Sell New Product')),
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
                      FilledButton(onPressed: _loadOptions, child: const Text('Retry')),
                    ],
                  ),
                )
              : Form(
                  key: _formKey,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (user != null && user.name.isNotEmpty)
                        Text(
                          'Selling as ${user.name}',
                          style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                        ),
                      const SizedBox(height: 12),
                      _SectionTitle('Photos', 'At least 4 images required (front, back, left, right)'),
                      const SizedBox(height: 8),
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 8,
                          childAspectRatio: 0.78,
                        ),
                        itemCount: _imageUrls.length,
                        itemBuilder: (context, i) {
                          final url = _imageUrls[i];
                          final uploading = _imageUploading[i];
                          if (uploading) {
                            return Container(
                              decoration: BoxDecoration(
                                color: AppColors.muted,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                            );
                          }
                          if (url != null && url.isNotEmpty) {
                            return Stack(
                              fit: StackFit.expand,
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: HachaluImage(
                                    repository: context.read<HachaluRepository>(),
                                    rawUrl: url,
                                  ),
                                ),
                                Positioned(
                                  top: 4,
                                  right: 4,
                                  child: GestureDetector(
                                    onTap: () => _removeImage(i),
                                    child: Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: const BoxDecoration(
                                        color: Colors.black54,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.close, size: 14, color: Colors.white),
                                    ),
                                  ),
                                ),
                              ],
                            );
                          }
                          return InkWell(
                            onTap: () => _pickSlot(i),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              decoration: BoxDecoration(
                                color: AppColors.muted,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.add_a_photo_outlined, color: AppColors.mutedForeground, size: 20),
                                  const SizedBox(height: 4),
                                  Text(
                                    _imagePositions[i],
                                    style: const TextStyle(fontSize: 10, color: AppColors.mutedForeground),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 20),
                      _SectionTitle('Details', ''),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _nameController,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(labelText: 'Product name *'),
                        validator: (v) => (v == null || v.trim().length < 3) ? 'Enter a product name' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _descriptionController,
                        maxLines: 3,
                        decoration: const InputDecoration(labelText: 'Description'),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _categoryId,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Category *'),
                        hint: const Text('Select category'),
                        items: _categories
                            .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                            .toList(),
                        onChanged: (v) => setState(() => _categoryId = v),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _brandId,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Brand'),
                        hint: const Text('None'),
                        items: _brands
                            .map((b) => DropdownMenuItem(value: b.id, child: Text(b.name)))
                            .toList(),
                        onChanged: (v) => setState(() => _brandId = v),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _gender,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Gender'),
                        items: _genders
                            .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                            .toList(),
                        onChanged: (v) {
                          if (v != null && v.isNotEmpty) setState(() => _gender = v);
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _priceController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(labelText: 'Base price (ETB) *'),
                        validator: (v) {
                          final price = double.tryParse((v ?? '').trim());
                          if (price == null || price <= 0) return 'Enter a valid price';
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),
                      _SectionTitle('Colors', ''),
                      const SizedBox(height: 8),
                      if (_colors.isEmpty)
                        const Text('No colors available', style: TextStyle(color: AppColors.mutedForeground))
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _colors
                              .map(
                                (c) => FilterChip(
                                  label: Text(c.name),
                                  selected: _selectedColorIds.contains(c.id),
                                  onSelected: (sel) {
                                    setState(() {
                                      if (sel) {
                                        _selectedColorIds.add(c.id);
                                      } else {
                                        _selectedColorIds.remove(c.id);
                                      }
                                    });
                                  },
                                ),
                              )
                              .toList(),
                        ),
                      const SizedBox(height: 16),
                      _SectionTitle('Sizes', ''),
                      const SizedBox(height: 8),
                      if (_sizes.isEmpty)
                        const Text('No sizes available', style: TextStyle(color: AppColors.mutedForeground))
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _sizes
                              .map(
                                (s) => FilterChip(
                                  label: Text(s.name),
                                  selected: _selectedSizeIds.contains(s.id),
                                  onSelected: (sel) {
                                    setState(() {
                                      if (sel) {
                                        _selectedSizeIds.add(s.id);
                                      } else {
                                        _selectedSizeIds.remove(s.id);
                                      }
                                    });
                                  },
                                ),
                              )
                              .toList(),
                        ),
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: _generateVariants,
                        icon: const Icon(Icons.autorenew),
                        label: const Text('Generate variants'),
                      ),
                      if (_variants.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          '${_variants.length} variant(s) generated. Give each a price and stock.',
                          style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                        ),
                        const SizedBox(height: 8),
                        ..._variants.map(
                          (v) => Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.card,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${v.colorName} · ${v.sizeName}',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.foreground),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextField(
                                        controller: v.price,
                                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                        decoration: const InputDecoration(labelText: 'Price', isDense: true),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: TextField(
                                        controller: v.stock,
                                        keyboardType: TextInputType.number,
                                        decoration: const InputDecoration(labelText: 'Stock', isDense: true),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      FilledButton.icon(
                        onPressed: _submitting ? null : _submit,
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        icon: _submitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.send),
                        label: Text(_submitting ? 'Submitting...' : 'Submit for review'),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, this.subtitle);

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.foreground),
        ),
        if (subtitle.isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
        ],
      ],
    );
  }
}