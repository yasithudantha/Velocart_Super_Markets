import 'package:flutter/material.dart';
import '../services/auth_api_service.dart';
import 'reset_password_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  
  final Color bgDark = const Color(0xFF050505);
  final Color surfaceDark = const Color(0xFF121212);
  final Color primaryGold = const Color(0xFFD4AF37);

  String email = '';
  bool isLoading = false;

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();
      setState(() => isLoading = true);
      
      try {
        String msg = await AuthApiService.requestPasswordReset(email);
        _showSnackBar(msg, Colors.green);
        
        // Navigate to the manual reset screen for testing purposes
        if (mounted) {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const ResetPasswordScreen()));
        }
      } catch (e) {
        _showSnackBar(e.toString(), Colors.redAccent);
      } finally {
        if (mounted) setState(() => isLoading = false);
      }
    }
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message, style: const TextStyle(color: Colors.white)), backgroundColor: color),
    );
  }

  InputDecoration _glassInputDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Colors.white38),
      prefixIcon: Icon(icon, color: Colors.white38),
      filled: true,
      fillColor: surfaceDark,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: primaryGold)),
      contentPadding: const EdgeInsets.symmetric(vertical: 16),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Account Recovery', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  const Text('Enter your email to receive a secure reset link.', style: TextStyle(color: Colors.white54), textAlign: TextAlign.center),
                  const SizedBox(height: 40),

                  TextFormField(
                    style: const TextStyle(color: Colors.white),
                    decoration: _glassInputDecoration('Email Address', Icons.mail_outline),
                    keyboardType: TextInputType.emailAddress,
                    validator: (val) => val!.isEmpty || !val.contains('@') ? 'Enter a valid email' : null,
                    onSaved: (val) => email = val!,
                  ),
                  const SizedBox(height: 32),

                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryGold,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 5,
                      ),
                      onPressed: isLoading ? null : _submit,
                      child: isLoading 
                          ? const CircularProgressIndicator(color: Colors.black)
                          : const Text('Send Recovery Link', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}