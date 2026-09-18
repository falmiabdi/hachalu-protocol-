abstract final class Money {
  static String etb(num amount) {
    final n = amount.toDouble();
    final neg = n < 0;
    final abs = n.abs();
    final text = abs == abs.truncate() && abs < 1e6
        ? '${abs.truncate()}'
        : _twoDecimals(abs);
    return '${neg ? '-' : ''}ETB $text';
  }

  static String _twoDecimals(double v) {
    final s = v.toStringAsFixed(2);
    final parts = s.split('.');
    final intPart = parts[0].replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
    return '$intPart.${parts[1]}';
  }
}