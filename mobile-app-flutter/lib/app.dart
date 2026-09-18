import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme/app_colors.dart';
import '../features/auth/login_screen.dart';
import '../features/shop/home_screen.dart';
import '../features/shop/catalog_screen.dart';
import '../features/cart/cart_screen.dart';
import '../features/orders/orders_screen.dart';
import '../features/profile/hachalu_profile_screen.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';

class HachaluAppShell extends StatefulWidget {
  const HachaluAppShell({super.key});

  @override
  State<HachaluAppShell> createState() => _HachaluAppShellState();
}

class _HachaluAppShellState extends State<HachaluAppShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [
          HachaluHomeScreen(),
          CatalogScreen(),
          CartScreen(),
          OrdersScreen(),
          HachaluProfileScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (index) => _onTap(context, index),
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.mutedForeground,
        selectedFontSize: 10,
        unselectedFontSize: 10,
        type: BottomNavigationBarType.fixed,
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.checkroom), label: 'Shop'),
          BottomNavigationBarItem(
            icon: _CartBadge(
                icon: Icons.shopping_cart_outlined, count: cart.count),
            label: 'Cart',
          ),
          const BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined), label: 'Orders'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }

  void _onTap(BuildContext context, int index) {
    final auth = context.read<AuthProvider>();
    if (!auth.isLoggedIn) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      return;
    }
    setState(() => _index = index);
  }
}

class _CartBadge extends StatelessWidget {
  const _CartBadge({required this.icon, required this.count});

  final IconData icon;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon, size: 24),
        if (count > 0)
          Positioned(
            right: -8,
            top: -6,
            child: Container(
              constraints: const BoxConstraints(minWidth: 16),
              padding: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                count > 99 ? '99+' : '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.bold),
              ),
            ),
          ),
      ],
    );
  }
}