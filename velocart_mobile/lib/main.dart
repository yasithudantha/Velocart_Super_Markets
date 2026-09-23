import 'package:flutter/material.dart';

void main() {
  runApp(const VelocartApp());
}

class VelocartApp extends StatelessWidget {
  const VelocartApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Velocart',
      home: Scaffold(
        appBar: AppBar(title: const Text('Velocart Mobile')),
        body: const Center(child: Text('Welcome to Velocart!')),
      ),
    );
  }
}
