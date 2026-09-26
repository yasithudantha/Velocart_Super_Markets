import 'package:flutter/material.dart';
import '../services/auth_api_service.dart';
import 'login_screen.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  
  final Color bgDark = const Color(0xFF050505);
  final Color surfaceDark = const Color(0xFF121212);
  final Color primaryGold = const Color(0xFFD4AF37);

  String token = '', newPassword = '', confirmPassword = '';
  bool isLoading = false;

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();
      setState(() => isLoading = true);
      
      try {
        String msg = await AuthApiService.resetPassword({
          'token': token,
          'newPassword': newPassword,
          'confirmNewPassword': confirmPassword,
        });
        
        _showSnackBar(msg, Colors.green);
        
        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context, 
            MaterialPageRoute(builder: (context) => const LoginScreen()), 
            (route) => false
          );
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
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0, iconTheme: const IconThemeData(color: Colors.white)),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Create New Password', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  const Text('Paste your secure token and choose a new password.', style: TextStyle(color: Colors.white54), textAlign: TextAlign.center),
                  const SizedBox(height: 40),

                  TextFormField(
                    style: const TextStyle(color: Colors.white),
                    decoration: _glassInputDecoration('Reset Token (from Database/Swagger)', Icons.vpn_key_outlined),
                    validator: (val) => val!.isEmpty ? 'Enter the reset token' : null,
                    onSaved: (val) => token = val!,
                  ),
                  const SizedBox(height: 16),

                  TextFormField(
                    style: const TextStyle(color: Colors.white),
                    decoration: _glassInputDecoration('New Password', Icons.lock_outline),
                    obscureText: true,
                    onChanged: (val) => newPassword = val,
                    validator: (val) {
                      if (val!.length < 8) return 'Minimum 8 characters';
                      if (!RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$').hasMatch(val)) return 'Requires Upper, Lower, Number & Special';
                      return null;
                    },
                    onSaved: (val) => newPassword = val!,
                  ),
                  const SizedBox(height: 16),

                  TextFormField(
                    style: const TextStyle(color: Colors.white),
                    decoration: _glassInputDecoration('Confirm New Password', Icons.verified_user_outlined),
                    obscureText: true,
                    validator: (val) => val != newPassword ? 'Passwords do not match' : null,
                    onSaved: (val) => confirmPassword = val!,
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
                          : const Text('Secure My Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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