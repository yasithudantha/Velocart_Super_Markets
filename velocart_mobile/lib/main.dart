import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/catalog/screens/catalog_screen.dart';
import 'features/catalog/api/catalog_api.dart';
import 'features/splash/screens/splash_screen.dart';

void main() {
  runApp(const VelocartApp());
}

class VelocartApp extends StatefulWidget {
  const VelocartApp({super.key});

  @override
  State<VelocartApp> createState() => _VelocartAppState();
}

class _VelocartAppState extends State<VelocartApp> {
  Widget _initialScreen = const Scaffold(body: Center(child: CircularProgressIndicator(color: Color(0xFFD4AF37))));

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('velocart_token');

    if (token != null && token.isNotEmpty) {
      CatalogApi.jwtToken = token; // Inject token globally
      setState(() => _initialScreen = const CatalogScreen());
    } else {
      setState(() => _initialScreen = const LoginScreen());
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Velocart SmartMart',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: 'Inter', 
        useMaterial3: true,
      ),
      home: VideoSplashScreen(),
    );
  }
}