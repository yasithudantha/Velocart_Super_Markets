import 'package:flutter/material.dart';
import '../services/address_api_service.dart';

class AddressManagerScreen extends StatefulWidget {
  const AddressManagerScreen({super.key});

  @override
  State<AddressManagerScreen> createState() => _AddressManagerScreenState();
}

class _AddressManagerScreenState extends State<AddressManagerScreen> {
  final Color bgDark = const Color(0xFF050505);
  final Color surfaceDark = const Color(0xFF121212);
  final Color primaryGold = const Color(0xFFD4AF37);

  List<dynamic> addresses = [];
  bool isLoading = true;
  bool isFormOpen = false;
  bool isSaving = false;

  int? editingId;
  String addressType = 'Home';
  bool isDefault = false;

  final _formKey = GlobalKey<FormState>();
  final _street1Ctrl = TextEditingController();
  final _street2Ctrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _postalCtrl = TextEditingController();
  final _countryCtrl = TextEditingController(text: 'Sri Lanka');

  @override
  void initState() {
    super.initState();
    _fetchAddresses();
  }

  Future<void> _fetchAddresses() async {
    setState(() => isLoading = true);
    try {
      final data = await AddressApiService.getAddresses();
      setState(() => addresses = data);
    } catch (e) {
      _showSnackBar(e.toString(), Colors.redAccent);
    } finally {
      setState(() => isLoading = false);
    }
  }

  void _openForm([Map<String, dynamic>? addr]) {
    setState(() {
      if (addr != null) {
        editingId = addr['id'];
        addressType = addr['addressType'];
        _street1Ctrl.text = addr['streetLine1'];
        _street2Ctrl.text = addr['streetLine2'] ?? '';
        _cityCtrl.text = addr['city'];
        _postalCtrl.text = addr['postalCode'];
        _countryCtrl.text = addr['country'];
        isDefault = addr['isDefault'];
      } else {
        editingId = null;
        addressType = 'Home';
        _street1Ctrl.clear();
        _street2Ctrl.clear();
        _cityCtrl.clear();
        _postalCtrl.clear();
        _countryCtrl.text = 'Sri Lanka';
        isDefault = addresses.isEmpty; // Force default if it's their first address
      }
      isFormOpen = true;
    });
  }

  Future<void> _saveAddress() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => isSaving = true);
    
    final payload = {
      'addressType': addressType,
      'streetLine1': _street1Ctrl.text.trim(),
      'streetLine2': _street2Ctrl.text.trim(),
      'city': _cityCtrl.text.trim(),
      'postalCode': _postalCtrl.text.trim(),
      'country': _countryCtrl.text.trim(),
      'isDefault': isDefault,
    };

    try {
      if (editingId != null) {
        await AddressApiService.updateAddress(editingId!, payload);
      } else {
        await AddressApiService.addAddress(payload);
      }
      setState(() => isFormOpen = false);
      _fetchAddresses();
    } catch (e) {
      _showSnackBar(e.toString(), Colors.redAccent);
    } finally {
      setState(() => isSaving = false);
    }
  }

  Future<void> _deleteAddress(int id) async {
    try {
      await AddressApiService.deleteAddress(id);
      _fetchAddresses();
    } catch (e) {
      _showSnackBar(e.toString(), Colors.redAccent);
    }
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message, style: const TextStyle(color: Colors.white)), backgroundColor: color),
    );
  }

  InputDecoration _glassInput(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.white54, fontSize: 12),
      filled: true,
      fillColor: surfaceDark,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: primaryGold)),
    );
  }

  IconData _getIcon(String type) {
    if (type.toLowerCase() == 'home') return Icons.home_outlined;
    if (type.toLowerCase() == 'office') return Icons.work_outline;
    return Icons.location_on_outlined;
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: addressType,
                  dropdownColor: surfaceDark,
                  style: const TextStyle(color: Colors.white),
                  decoration: _glassInput('Address Type'),
                  items: ['Home', 'Office', 'Other'].map((String val) {
                    return DropdownMenuItem(value: val, child: Text(val));
                  }).toList(),
                  onChanged: (val) => setState(() => addressType = val!),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SwitchListTile(
            title: const Text('Set as Default Delivery Address', style: TextStyle(color: Colors.white, fontSize: 14)),
            activeColor: primaryGold,
            contentPadding: EdgeInsets.zero,
            value: isDefault,
            onChanged: (val) => setState(() => isDefault = val),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _street1Ctrl,
            style: const TextStyle(color: Colors.white),
            decoration: _glassInput('Street Line 1 *'),
            validator: (val) => val!.isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _street2Ctrl,
            style: const TextStyle(color: Colors.white),
            decoration: _glassInput('Street Line 2 (Optional)'),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _cityCtrl,
                  style: const TextStyle(color: Colors.white),
                  decoration: _glassInput('City *'),
                  validator: (val) => val!.isEmpty ? 'Required' : null,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: TextFormField(
                  controller: _postalCtrl,
                  style: const TextStyle(color: Colors.white),
                  decoration: _glassInput('Postal Code *'),
                  validator: (val) => val!.isEmpty ? 'Required' : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _countryCtrl,
            style: const TextStyle(color: Colors.white),
            decoration: _glassInput('Country *'),
            validator: (val) => val!.isEmpty ? 'Required' : null,
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
              ),
              onPressed: isSaving ? null : _saveAddress,
              child: isSaving 
                  ? const CircularProgressIndicator(color: Colors.black)
                  : Text(editingId != null ? 'Update Address' : 'Save Address', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (addresses.isEmpty) {
      return Center(
        child: Text("No addresses found.\nAdd one for delivery.", textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withOpacity(0.5))),
      );
    }
    return ListView.builder(
      itemCount: addresses.length,
      itemBuilder: (context, index) {
        final addr = addresses[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: addr['isDefault'] ? primaryGold.withOpacity(0.05) : surfaceDark,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: addr['isDefault'] ? primaryGold.withOpacity(0.5) : Colors.white10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(_getIcon(addr['addressType']), color: addr['isDefault'] ? primaryGold : Colors.white54, size: 20),
                      const SizedBox(width: 8),
                      Text(addr['addressType'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                  if (addr['isDefault'])
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: primaryGold, borderRadius: BorderRadius.circular(20)),
                      child: const Text('DEFAULT', style: TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                "${addr['streetLine1']}\n"
                "${addr['streetLine2'] != null && addr['streetLine2'].isNotEmpty ? addr['streetLine2'] + '\n' : ''}"
                "${addr['city']}, ${addr['postalCode']}\n"
                "${addr['country']}",
                style: const TextStyle(color: Colors.white70, height: 1.5),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () => _openForm(addr),
                    icon: const Icon(Icons.edit, size: 16, color: Colors.white54),
                    label: const Text('Edit', style: TextStyle(color: Colors.white54)),
                  ),
                  TextButton.icon(
                    onPressed: () => _deleteAddress(addr['id']),
                    icon: const Icon(Icons.delete_outline, size: 16, color: Colors.redAccent),
                    label: const Text('Delete', style: TextStyle(color: Colors.redAccent)),
                  ),
                ],
              )
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgDark,
      appBar: AppBar(
        backgroundColor: bgDark,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(isFormOpen ? (editingId != null ? 'Edit Address' : 'New Address') : 'Delivery Addresses', style: const TextStyle(color: Colors.white, fontSize: 18)),
        leading: isFormOpen 
            ? IconButton(icon: const Icon(Icons.close), onPressed: () => setState(() => isFormOpen = false))
            : const BackButton(),
      ),
      body: isLoading
          ? Center(child: CircularProgressIndicator(color: primaryGold))
          : Padding(
              padding: const EdgeInsets.all(20.0),
              child: isFormOpen ? SingleChildScrollView(child: _buildForm()) : _buildList(),
            ),
      floatingActionButton: !isFormOpen && !isLoading
          ? FloatingActionButton(
              backgroundColor: primaryGold,
              foregroundColor: Colors.black,
              onPressed: () => _openForm(),
              child: const Icon(Icons.add),
            )
          : null,
    );
  }
}