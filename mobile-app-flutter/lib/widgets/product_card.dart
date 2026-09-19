import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/utils/money.dart';
import '../data/models/hachalu_models.dart';
import '../data/repositories/hachalu_repository.dart';
import '../features/shop/product_detail_screen.dart';
import 'hachalu_image.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.product,
    required this.repository,
  });

  final Product product;
  final HachaluRepository repository;

  @override
  Widget build(BuildContext context) {
    final name = product.availableColors;
    return InkWell(
      borderRadius: BorderRadius.circular(AppColors.radius),
      onTap: () {
        Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => ProductDetailScreen(
            repository: repository,
            product: product,
          ),
        ));
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(AppColors.radius),
          border: Border.all(color: AppColors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: HachaluImage(
                repository: repository,
                rawUrl: product.displayImage,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.category?.name ?? '',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.mutedForeground,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    product.name,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColors.foreground,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    Money.etb(product.minPrice),
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (name.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    SizedBox(
                      height: 12,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        shrinkWrap: true,
                        itemCount: name.length > 4 ? 4 : name.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 4),
                        itemBuilder: (_, i) => _ColorDot(color: name[i]),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ColorDot extends StatelessWidget {
  const _ColorDot({required this.color});

  final ProductColor color;

  @override
  Widget build(BuildContext context) {
    final hex = color.hex;
    Color? parsed;
    if (hex != null && hex.isNotEmpty) {
      final clean =
          hex.replaceFirst('#', '').replaceFirst('0x', '').replaceFirst('0X', '');
      if (clean.length >= 6) {
        parsed = Color(int.tryParse('FF$clean', radix: 16) ??
            int.tryParse(clean, radix: 16) ??
            0xFFBDBDBD);
      }
    }
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        color: parsed ?? Colors.grey.shade300,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 1),
      ),
    );
  }
}