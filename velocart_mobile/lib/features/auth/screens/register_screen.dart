import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../services/auth_api_service.dart';
import '../../legal/screens/terms_screen.dart';
import '../../legal/screens/privacy_screen.dart';
import 'profile_screen.dart';
import 'verify_email_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  
  final Color bgDark = const Color(0xFF050505);
  final Color surfaceDark = const Color(0xFF121212);
  final Color primaryGold = const Color(0xFFD4AF37);

  String fullName = '', email = '', phoneNumber = '', password = '', confirmPassword = '';
  bool agreed = false;
  bool isLoading = false;

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!agreed) {
      _showSnackBar("You must agree to the Terms & Privacy Policy.", Colors.redAccent);
      return;
    }

    _formKey.currentState!.save();
    setState(() => isLoading = true);
    
    try {
      String msg = await AuthApiService.registerUser({
        'fullName': fullName, 'email': email, 'phoneNumber': phoneNumber.replaceAll(RegExp(r'\s+'), ''),
        'password': password, 'agreeToTerms': agreed, 'agreeToPrivacyPolicy': agreed,
      });
      _showSnackBar(msg, Colors.green);
      
      // FIXED: Route to Verify Email Screen instead of popping back to login
      if (mounted) {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => VerifyEmailScreen(email: email)));
      }
    } catch (e) {
      _showSnackBar(e.toString(), Colors.redAccent);
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  // NEW: Google OAuth Logic (Updated for v7 API)
  // NEW: Google OAuth Logic (Updated for v7 API)
  Future<void> _handleGoogleSignUp() async {
    setState(() => isLoading = true);
    try {
      // 1. Ensure initialization is called exactly once
      await AuthApiService.ensureGoogleInitialized();
      
      // 2. Use authenticate() instead of signIn() for v7
      final GoogleSignInAccount? googleUser = await AuthApiService.googleSignInInstance.authenticate();
      
      if (googleUser == null) { 
        setState(() => isLoading = false); 
        return; 
      }

      // 3. Extract tokens (This is now synchronous in v7, no await needed!)
      final GoogleSignInAuthentication googleAuth = googleUser.authentication;
      
      if (googleAuth.idToken != null) {
        await AuthApiService.googleAuth(googleAuth.idToken!);
        _showSnackBar("Account linked successfully.", Colors.green);
        if (mounted) Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (context) => const ProfileScreen()), (route) => false);
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
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0, iconTheme: const IconThemeData(color: Colors.white)),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  const Text('Create Account', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  const Text('Join the Velocart ecosystem.', style: TextStyle(color: Colors.white54)),
                  const SizedBox(height: 40),

                  TextFormField(
                    style: const TextStyle(color: Colors.white), decoration: _glassInput('Full Name', Icons.person_outline),
                    validator: (val) => val!.isEmpty ? 'Required' : null, onSaved: (val) => fullName = val!,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    style: const TextStyle(color: Colors.white), decoration: _glassInput('Email Address', Icons.mail_outline),
                    keyboardType: TextInputType.emailAddress, validator: (val) => val!.isEmpty ? 'Required' : null, onSaved: (val) => email = val!,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    style: const TextStyle(color: Colors.white), decoration: _glassInput('Phone Number (e.g. +94)', Icons.phone_outlined),
                    keyboardType: TextInputType.phone, validator: (val) => val!.isEmpty ? 'Required' : null, onSaved: (val) => phoneNumber = val!,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    style: const TextStyle(color: Colors.white), decoration: _glassInput('Password', Icons.lock_outline),
                    obscureText: true, onChanged: (val) => password = val, validator: (val) => val!.length < 8 ? 'Min 8 chars' : null, onSaved: (val) => password = val!,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    style: const TextStyle(color: Colors.white), decoration: _glassInput('Confirm Password', Icons.lock_outline),
                    obscureText: true, validator: (val) => val != password ? 'Passwords do not match' : null,
                  ),
                  const SizedBox(height: 16),

                  // LEGAL CHECKBOX
                  Row(
                    children: [
                      Checkbox(value: agreed, onChanged: (val) => setState(() => agreed = val!), activeColor: primaryGold, checkColor: Colors.black),
                      Expanded(
                        child: RichText(
                          text: TextSpan(
                            style: const TextStyle(color: Colors.white54, fontSize: 12),
                            children: [
                              const TextSpan(text: 'I agree to the '),
                              TextSpan(text: 'Terms & Conditions', style: TextStyle(color: primaryGold, decoration: TextDecoration.underline), recognizer: TapGestureRecognizer()..onTap = () => Navigator.push(context, MaterialPageRoute(builder: (context) => const TermsScreen()))),
                              const TextSpan(text: ' and '),
                              TextSpan(text: 'Privacy Policy', style: TextStyle(color: primaryGold, decoration: TextDecoration.underline), recognizer: TapGestureRecognizer()..onTap = () => Navigator.push(context, MaterialPageRoute(builder: (context) => const PrivacyScreen()))),
                              const TextSpan(text: '.'),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity, height: 55,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: primaryGold, foregroundColor: Colors.black, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      onPressed: isLoading ? null : _submit,
                      child: isLoading ? const CircularProgressIndicator(color: Colors.black) : const Text('Register Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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
                      onPressed: isLoading ? null : _handleGoogleSignUp,
                      icon: const Icon(Icons.g_mobiledata, size: 32),
                      label: const Text('Sign up with Google', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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