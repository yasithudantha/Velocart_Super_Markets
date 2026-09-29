import 'package:flutter/material.dart';
import '../services/loyalty_api_service.dart';

class LoyaltyDashboardScreen extends StatefulWidget {
  const LoyaltyDashboardScreen({super.key});

  @override
  State<LoyaltyDashboardScreen> createState() => _LoyaltyDashboardScreenState();
}

class _LoyaltyDashboardScreenState extends State<LoyaltyDashboardScreen> {
  Map<String, dynamic>? dashboard;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchDashboard();
  }

  Future<void> _fetchDashboard() async {
    try {
      final data = await LoyaltyApiService.getDashboard();
      setState(() {
        dashboard = data;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    }
  }

  List<Color> _getCardColors(String tier) {
    if (tier.toLowerCase() == 'gold') return [const Color(0xFFD4AF37), const Color(0xFFAA7C11)];
    if (tier.toLowerCase() == 'platinum') return [const Color(0xFFE5E4E2), const Color(0xFFA0A0A0)];
    return [const Color(0xFF757F9A), const Color(0xFFD7DDE8)]; // Silver
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF050505),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text("VelocityFamily Hub", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFD4AF37)))
          : dashboard == null
              ? const Center(child: Text("Could not load loyalty data.", style: TextStyle(color: Colors.white54)))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // DIGITAL CREDIT CARD (SRS 6.1.1)
                      Container(
                        width: double.infinity,
                        height: 220,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: _getCardColors(dashboard!['currentTier']),
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(color: _getCardColors(dashboard!['currentTier'])[0].withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 10))
                          ]
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.star, color: Colors.white, size: 18),
                                    SizedBox(width: 5),
                                    Text("VelocityFamily", style: TextStyle(color: Colors.white, letterSpacing: 2, fontSize: 12, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                Text(dashboard!['currentTier'].toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1)),
                              ],
                            ),
                            Text(
                              dashboard!['loyaltyIdNumber'].toString().replaceAllMapped(RegExp(r".{4}"), (match) => "${match.group(0)} "),
                              style: const TextStyle(color: Colors.white, fontSize: 24, letterSpacing: 3, fontFamily: 'monospace', fontWeight: FontWeight.bold)
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("CARDHOLDER", style: TextStyle(color: Colors.white70, fontSize: 10, letterSpacing: 1)),
                                    Text(dashboard!['customerName'].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    const Text("VALID THRU", style: TextStyle(color: Colors.white70, fontSize: 10, letterSpacing: 1)),
                                    Text(DateTime.parse(dashboard!['expiryDate']).toLocal().toString().substring(2, 7).replaceAll('-', '/'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ],
                            )
                          ],
                        ),
                      ),

                      const SizedBox(height: 30),

                      // POINTS BALANCE (SRS 6.1.2)
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(color: const Color(0xFF121212), borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white10)),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text("Available Balance".toUpperCase(), style: const TextStyle(color: Colors.white54, fontSize: 12)),
                                const SizedBox(height: 5),
                                Text("${dashboard!['currentPointsBalance']}", style: const TextStyle(color: Color(0xFFD4AF37), fontSize: 32, fontWeight: FontWeight.w900)),
                              ],
                            ),
                            const Icon(Icons.stars_rounded, color: Color(0xFFD4AF37), size: 48)
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // TIER PROGRESS (SRS 6.1.11)
                      if (dashboard!['nextTier'] != "Maximum Tier Reached")
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(color: const Color(0xFF121212), borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white10)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(dashboard!['currentTier'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                  Text(dashboard!['nextTier'], style: const TextStyle(color: Color(0xFFD4AF37), fontWeight: FontWeight.bold)),
                                ],
                              ),
                              const SizedBox(height: 10),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: LinearProgressIndicator(
                                  value: dashboard!['progressPercentage'] / 100,
                                  minHeight: 8,
                                  backgroundColor: Colors.white10,
                                  color: const Color(0xFFD4AF37),
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text("Earn ${dashboard!['pointsRequiredForNextTier']} more points to reach ${dashboard!['nextTier']}.", style: const TextStyle(color: Colors.white54, fontSize: 12)),
                            ],
                          ),
                        )
                      else
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(color: const Color(0xFFD4AF37).withOpacity(0.1), borderRadius: BorderRadius.circular(15), border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.5))),
                          child: const Column(
                            children: [
                              Text("👑", style: TextStyle(fontSize: 32)),
                              SizedBox(height: 10),
                              Text("Maximum Tier Reached!", style: TextStyle(color: Color(0xFFD4AF37), fontWeight: FontWeight.bold, fontSize: 16)),
                              Text("You are enjoying the highest level of benefits.", style: TextStyle(color: Colors.white54, fontSize: 12)),
                            ],
                          ),
                        ),

                      const SizedBox(height: 20),

                      // METRICS
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(color: const Color(0xFF121212), borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white10)),
                              child: Column(
                                children: [
                                  const Text("Lifetime Earned", style: TextStyle(color: Colors.white54, fontSize: 10)),
                                  const SizedBox(height: 5),
                                  Text("${dashboard!['totalPointsEarned']}", style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 15),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(color: const Color(0xFF121212), borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white10)),
                              child: Column(
                                children: [
                                  const Text("Lifetime Spent", style: TextStyle(color: Colors.white54, fontSize: 10)),
                                  const SizedBox(height: 5),
                                  Text("${dashboard!['totalPointsRedeemed']}", style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
    );
  }
}