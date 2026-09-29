import 'package:flutter/material.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF050505),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text('Terms & Conditions', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Last Updated: September 2026\n", style: TextStyle(color: const Color(0xFFD4AF37))),
            const Text("1. Acceptance of Terms", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("By registering for an account and accessing the Velocart Smart Supermarket ecosystem, you agree to be bound by these Terms of Service.\n", style: TextStyle(color: Colors.white70, height: 1.5)),
            const Text("2. Account Security", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("You are solely responsible for maintaining the confidentiality of your cryptographic login credentials. Velocart employs automated brute-force protection to lock accounts exhibiting suspicious activity.\n", style: TextStyle(color: Colors.white70, height: 1.5)),
            const Text("3. Orders & Deliveries", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("You are responsible for ensuring the active default address is accurate before initiating an order.", style: TextStyle(color: Colors.white70, height: 1.5)),
          ],
        ),
      ),
    );
  }
}