import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_api_service.dart';
import '../../catalog/api/catalog_api.dart'; // Import Catalog API
import '../../catalog/screens/catalog_screen.dart'; // Import Catalog Screen
import 'register_screen.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  
  final Color bgDark = const Color(0xFF050505);
  final Color surfaceDark = const Color(0xFF121212);
  final Color primaryGold = const Color(0xFFD4AF37);

  String email = '', password = '';
  bool isLoading = false;

  Future<void> _injectToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('velocart_token');
    CatalogApi.jwtToken = token; // Inject string securely
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();
      setState(() => isLoading = true);
      
      try {
        final msg = await AuthApiService.loginUser({'email': email, 'password': password});
        await _injectToken(); // Fetch and set the string token
        
        _showSnackBar(msg, Colors.green);
        
        if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const CatalogScreen()));
      } catch (e) {
        _showSnackBar(e.toString(), Colors.redAccent);
      } finally {
        if (mounted) setState(() => isLoading = false);
      }
    }
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() => isLoading = true);
    try {
      await AuthApiService.ensureGoogleInitialized();
      final GoogleSignInAccount? googleUser = await AuthApiService.googleSignInInstance.authenticate();
      
      if (googleUser == null) {
        setState(() => isLoading = false);
        return; 
      }

      final GoogleSignInAuthentication googleAuth = googleUser.authentication;
      
      if (googleAuth.idToken != null) {
        final msg = await AuthApiService.googleAuth(googleAuth.idToken!);
        await _injectToken(); // Fetch and set the string token
        
        _showSnackBar(msg, Colors.green);
        
        if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const CatalogScreen()));
      } else {
        throw "Failed to securely retrieve Google Token.";
      }
    } catch (e) {
      _showSnackBar(e.toString(), Colors.redAccent);
      if (mounted) setState(() => isLoading = false);
    }
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message, style: const TextStyle(color: Colors.white)), backgroundColor: color));
  }

  InputDecoration _glassInput(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint, hintStyle: const TextStyle(color: Colors.white38),
      prefixIcon: Icon(icon, color: Colors.white38),
      filled: true, fillColor: surfaceDark,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: primaryGold)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgDark,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  RichText(
                    text: TextSpan(
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                      children: [const TextSpan(text: 'Welcome to '), TextSpan(text: 'Velocart', style: TextStyle(color: primaryGold))],
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text('Sign in to your intelligent workspace.', style: TextStyle(color: Colors.white54)),
                  const SizedBox(height: 40),

                  TextFormField(
                    style: const TextStyle(color: Colors.white),
                    decoration: _glassInput('Email Address', Icons.mail_outline),
                    keyboardType: TextInputType.emailAddress,
                    validator: (val) => val!.isEmpty ? 'Required' : null,
                    onSaved: (val) => email = val!,
                  ),
                  const SizedBox(height: 16),

                  TextFormField(
                    style: const TextStyle(color: Colors.white),
                    decoration: _glassInput('Password', Icons.lock_outline),
                    obscureText: true,
                    validator: (val) => val!.isEmpty ? 'Required' : null,
                    onSaved: (val) => password = val!,
                  ),

                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const ForgotPasswordScreen())),
                      child: Text('Forgot Password?', style: TextStyle(color: primaryGold)),
                    ),
                  ),

                  SizedBox(
                    width: double.infinity, height: 55,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: primaryGold, foregroundColor: Colors.black, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      onPressed: isLoading ? null : _submit,
                      child: isLoading ? const CircularProgressIndicator(color: Colors.black) : const Text('Secure Login', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24.0),
                    child: Row(
                      children: [
                        const Expanded(child: Divider(color: Colors.white10)),
                        Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text("OR", style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 12))),
                        const Expanded(child: Divider(color: Colors.white10)),
                      ],
                    ),
                  ),

                  SizedBox(
                    width: double.infinity, height: 55,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.black, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      onPressed: isLoading ? null : _handleGoogleSignIn,
                      icon: const Icon(Icons.g_mobiledata, size: 32),
                      label: const Text('Continue with Google', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const RegisterScreen())),
                    child: const Text("Don't have an account? Create one", style: TextStyle(color: Colors.white54)),
                  )
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}