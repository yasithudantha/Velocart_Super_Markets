import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/user_api_service.dart';
import 'login_screen.dart';
import 'address_manager_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final Color bgDark = const Color(0xFF050505);
  final Color surfaceDark = const Color(0xFF121212);
  final Color primaryGold = const Color(0xFFD4AF37);

  Map<String, dynamic>? profileData;
  bool isLoading = true;
  bool isEditing = false;
  bool isSaving = false;

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  // NEW: Security Zone States
  bool isSecuritySaving = false;
  String newEmail = '', emailCurrentPassword = '';
  String newPassword = '', passwordCurrentPassword = '';
  String deleteCurrentPassword = '';

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    try {
      final data = await UserApiService.getUserProfile();
      setState(() {
        profileData = data;
        _nameController.text = data['fullName'] ?? '';
        _phoneController.text = data['phoneNumber'] ?? '';
        isLoading = false;
      });
    } catch (e) {
      if (e.toString().contains("Unauthorized")) {
        _logout(); // Kick user out if token is invalid/expired
      } else {
        _showSnackBar(e.toString(), Colors.redAccent);
        setState(() => isLoading = false);
      }
    }
  }

  Future<void> _saveProfile() async {
    if (_nameController.text.trim().isEmpty || _phoneController.text.trim().isEmpty) {
      _showSnackBar("Name and Phone cannot be empty.", Colors.redAccent);
      return;
    }

    setState(() => isSaving = true);
    try {
      final cleanedPhone = _phoneController.text.replaceAll(RegExp(r'\s+'), '');
      
      final msg = await UserApiService.updateUserProfile({
        'fullName': _nameController.text.trim(),
        'phoneNumber': cleanedPhone,
      });

      setState(() {
        profileData!['fullName'] = _nameController.text.trim();
        profileData!['phoneNumber'] = cleanedPhone;
        isEditing = false;
      });
      _showSnackBar(msg, Colors.green);
    } catch (e) {
      _showSnackBar(e.toString(), Colors.redAccent);
    } finally {
      setState(() => isSaving = false);
    }
  }

  // NEW: Handle Security Actions
  Future<void> _handleSecurityAction(String action) async {
    setState(() => isSecuritySaving = true);
    try {
      if (action == 'email') {
        if (newEmail.isEmpty || emailCurrentPassword.isEmpty) throw "Please fill all email change fields.";
        final msg = await UserApiService.requestEmailChange({'newEmail': newEmail, 'currentPassword': emailCurrentPassword});
        _showSnackBar(msg, Colors.green);
      } else if (action == 'password') {
        if (newPassword.isEmpty || passwordCurrentPassword.isEmpty) throw "Please fill all password fields.";
        final msg = await UserApiService.changePassword({'newPassword': newPassword, 'currentPassword': passwordCurrentPassword});
        _showSnackBar(msg, Colors.green);
      } else if (action == 'delete') {
        if (deleteCurrentPassword.isEmpty) throw "Password required to delete account.";
        final confirm = await _showDeleteConfirmation();
        if (confirm == true) {
          final msg = await UserApiService.deleteAccount({'currentPassword': deleteCurrentPassword});
          _showSnackBar(msg, Colors.green);
          _logout();
          return;
        }
      }
    } catch (e) {
      _showSnackBar(e.toString().replaceAll('Exception: ', ''), Colors.redAccent);
    } finally {
      setState(() => isSecuritySaving = false);
    }
  }

  Future<bool?> _showDeleteConfirmation() {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
        title: const Text("Delete Account?", style: TextStyle(color: Colors.redAccent)),
        content: const Text("This action is permanent and cannot be undone. All data and loyalty points will be lost.", style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel", style: TextStyle(color: Colors.white54))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text("Yes, Delete", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('velocart_token');
    await prefs.remove('velocart_user');
    
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message, style: const TextStyle(color: Colors.white)), backgroundColor: color),
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon, TextEditingController? controller) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surfaceDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: primaryGold.withOpacity(0.1), shape: BoxShape.circle),
            child: Icon(icon, color: primaryGold, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label.toUpperCase(), style: const TextStyle(color: Colors.white54, fontSize: 10, letterSpacing: 1)),
                const SizedBox(height: 4),
                if (isEditing && controller != null)
                  TextField(
                    controller: controller,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    decoration: InputDecoration(
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 4),
                      enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: primaryGold.withOpacity(0.5))),
                      focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: primaryGold)),
                    ),
                  )
                else
                  Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _securityInputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
      filled: true,
      fillColor: Colors.black45,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: primaryGold)),
      contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      isDense: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    bool isGoogleUser = profileData != null && (profileData!['authProvider'] == 'GOOGLE' || (profileData!['passwordHash'] == null && profileData!['profilePictureUrl'] != null));

    return Scaffold(
      backgroundColor: bgDark,
      appBar: AppBar(
        backgroundColor: bgDark,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text('My Workspace', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            onPressed: _logout,
          )
        ],
      ),
      body: isLoading
          ? Center(child: CircularProgressIndicator(color: primaryGold))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildInfoRow('Full Name', profileData!['fullName'] ?? '', Icons.person_outline, _nameController),
                  _buildInfoRow('Phone Number', profileData!['phoneNumber'] ?? '', Icons.phone_outlined, _phoneController),
                  _buildInfoRow('Email Address', profileData!['email'] ?? '', Icons.mail_outline, null),
                  _buildInfoRow('Account Status', profileData!['accountStatus'] ?? '', Icons.verified_user_outlined, null),

                  const SizedBox(height: 32),

                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: primaryGold,
                        side: BorderSide(color: primaryGold.withOpacity(0.5)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (context) => const AddressManagerScreen()));
                      },
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.map_outlined),
                          SizedBox(width: 8),
                          Text('Manage Delivery Addresses', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: isEditing
                        ? Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    side: const BorderSide(color: Colors.white24),
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      isEditing = false;
                                      _nameController.text = profileData!['fullName'];
                                      _phoneController.text = profileData!['phoneNumber'];
                                    });
                                  },
                                  child: const Text('Cancel'),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: primaryGold,
                                    foregroundColor: Colors.black,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  onPressed: isSaving ? null : _saveProfile,
                                  child: isSaving 
                                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                                      : const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ],
                          )
                        : ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white10,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            onPressed: () => setState(() => isEditing = true),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.edit, size: 18),
                                SizedBox(width: 8),
                                Text('Edit Profile', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                  ),

                  // ==========================================
                  // NEW: SECURITY ZONE (SRS 6.1 / Profile Sec)
                  // ==========================================
                  const SizedBox(height: 40),
                  const Divider(color: Colors.white10),
                  const SizedBox(height: 20),
                  const Row(
                    children: [
                      Icon(Icons.security, color: Color(0xFFD4AF37), size: 24),
                      SizedBox(width: 10),
                      Text('Security & Privacy', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                  const SizedBox(height: 20),

                  if (isGoogleUser)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(color: surfaceDark, borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white10)),
                      child: const Column(
                        children: [
                          Icon(Icons.g_mobiledata, size: 48, color: Colors.white),
                          SizedBox(height: 10),
                          Text("Secured by Google", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                          SizedBox(height: 5),
                          Text("Your account authentication and email are managed securely by Google. Passwords cannot be changed here.", textAlign: TextAlign.center, style: TextStyle(color: Colors.white54, fontSize: 12)),
                        ],
                      ),
                    )
                  else ...[
                    // Update Email Form
                    Container(
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(color: surfaceDark, borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white10)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Change Email Address", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          TextField(
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            decoration: _securityInputDecoration('New Email Address'),
                            onChanged: (val) => newEmail = val,
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            obscureText: true,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            decoration: _securityInputDecoration('Current Password (Required)'),
                            onChanged: (val) => emailCurrentPassword = val,
                          ),
                          const SizedBox(height: 12),
                          Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.white10, foregroundColor: Colors.white, elevation: 0),
                              onPressed: isSecuritySaving ? null : () => _handleSecurityAction('email'),
                              child: const Text("Request Change", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            ),
                          )
                        ],
                      ),
                    ),

                    // Update Password Form
                    Container(
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.only(bottom: 24),
                      decoration: BoxDecoration(color: surfaceDark, borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white10)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Change Password", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          TextField(
                            obscureText: true,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            decoration: _securityInputDecoration('Current Password'),
                            onChanged: (val) => passwordCurrentPassword = val,
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            obscureText: true,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            decoration: _securityInputDecoration('New Password'),
                            onChanged: (val) => newPassword = val,
                          ),
                          const SizedBox(height: 12),
                          Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.white10, foregroundColor: Colors.white, elevation: 0),
                              onPressed: isSecuritySaving ? null : () => _handleSecurityAction('password'),
                              child: const Text("Update Password", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            ),
                          )
                        ],
                      ),
                    ),
                  ],

                  // Danger Zone (Delete Account) - Available to all users
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.red.withOpacity(0.05), borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.red.withOpacity(0.2))),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 18),
                            SizedBox(width: 8),
                            Text("Danger Zone", style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text("Deleting your account is permanent and cannot be undone.", style: TextStyle(color: Colors.redAccent, fontSize: 12)),
                        const SizedBox(height: 12),
                        if (!isGoogleUser) ...[
                          TextField(
                            obscureText: true,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            decoration: _securityInputDecoration('Enter password to confirm'),
                            onChanged: (val) => deleteCurrentPassword = val,
                          ),
                          const SizedBox(height: 12),
                        ],
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white, elevation: 0),
                            onPressed: isSecuritySaving ? null : () {
                              if (isGoogleUser) {
                                deleteCurrentPassword = "GOOGLE_USER_BYPASS"; // Backend normally bypasses pass check for OAuth users
                              }
                              _handleSecurityAction('delete');
                            },
                            child: const Text("Delete Account", style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }
}