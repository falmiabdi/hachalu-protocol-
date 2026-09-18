import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../data/repositories/hachalu_repository.dart';

class HachaluImage extends StatelessWidget {
  const HachaluImage({
    super.key,
    required this.repository,
    required this.rawUrl,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.placeholderColor,
  });

  final HachaluRepository repository;
  final String rawUrl;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Color? placeholderColor;

  @override
  Widget build(BuildContext context) {
    if (rawUrl.isEmpty) {
      return Container(
        width: width,
        height: height,
        color: placeholderColor ?? Colors.grey.shade200,
        alignment: Alignment.center,
        child: const Icon(Icons.checkroom, color: Colors.grey, size: 32),
      );
    }

    return FutureBuilder<String>(
      future: repository.absoluteUrl(rawUrl),
      builder: (context, snap) {
        final url = snap.data;
        if (url == null || url.isEmpty) {
          return Container(
            width: width,
            height: height,
            color: placeholderColor ?? Colors.grey.shade200,
          );
        }
        return CachedNetworkImage(
          imageUrl: url,
          width: width,
          height: height,
          fit: fit,
          placeholder: (_, __) => Container(
            decoration: BoxDecoration(
              color: placeholderColor ?? Colors.grey.shade200,
            ),
          ),
          errorWidget: (_, __, ___) => Container(
            color: placeholderColor ?? Colors.grey.shade200,
            alignment: Alignment.center,
            child: const Icon(Icons.image_not_supported_outlined,
                color: Colors.grey),
          ),
        );
      },
    );
  }
}