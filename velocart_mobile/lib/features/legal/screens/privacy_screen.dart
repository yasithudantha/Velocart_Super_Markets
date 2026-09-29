import 'package:flutter/material.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF050505),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text('Privacy Policy', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Last Updated: September 2026\n", style: TextStyle(color: const Color(0xFFD4AF37))),
            const Text("1. Data Collection", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("Velocart strictly limits data collection to what is necessary. We collect Identity Data, Authentication Data, and Logistics Data. We never store passwords in plain text.\n", style: TextStyle(color: Colors.white70, height: 1.5)),
            const Text("2. Use of Information", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("Your data is exclusively used to authenticate your sessions, process your grocery orders, and provide intelligent product recommendations.\n", style: TextStyle(color: Colors.white70, height: 1.5)),
            const Text("3. Third-Party OAuth", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("If you use 'Continue with Google', we receive your cryptographic ID token strictly for authentication purposes.", style: TextStyle(color: Colors.white70, height: 1.5)),
          ],
        ),
      ),
    );
  }
}