import 'package:flutter/material.dart';
import '../services/notification_api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> notifications = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    try {
      final data = await NotificationApiService.getNotifications();
      setState(() {
        notifications = data;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  Future<void> _markAsRead(int id, bool isRead) async {
    if (isRead) return;
    try {
      await NotificationApiService.markAsRead(id);
      setState(() {
        final index = notifications.indexWhere((n) => n['id'] == id);
        if (index != -1) notifications[index]['isRead'] = true;
      });
    } catch (e) {
      debugPrint(e.toString());
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await NotificationApiService.markAllAsRead();
      setState(() {
        for (var n in notifications) { n['isRead'] = true; }
      });
    } catch (e) {
      debugPrint(e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = notifications.where((n) => n['isRead'] == false).length;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: const Text("Notifications", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text("Mark all read", style: TextStyle(color: Color(0xFFD4AF37), fontWeight: FontWeight.bold)),
            )
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFD4AF37)))
          : notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_off_outlined, size: 80, color: Colors.grey[300]),
                      const SizedBox(height: 16),
                      const Text("No new notifications", style: TextStyle(fontSize: 18, color: Colors.grey, fontWeight: FontWeight.bold)),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: notifications.length,
                  itemBuilder: (context, index) {
                    final notif = notifications[index];
                    final bool isRead = notif['isRead'];
                    final isLoyalty = notif['type'] == 'LOYALTY';

                    return ListTile(
                      onTap: () => _markAsRead(notif['id'], isRead),
                      tileColor: isRead ? Colors.white : const Color(0xFFD4AF37).withOpacity(0.05),
                      leading: CircleAvatar(
                        backgroundColor: isLoyalty ? const Color(0xFFD4AF37).withOpacity(0.2) : Colors.blue.withOpacity(0.2),
                        child: Icon(isLoyalty ? Icons.star : Icons.info, color: isLoyalty ? const Color(0xFFD4AF37) : Colors.blue, size: 20),
                      ),
                      title: Text(notif['title'], style: TextStyle(fontWeight: isRead ? FontWeight.normal : FontWeight.bold, color: Colors.black87)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Text(notif['message'], style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                          const SizedBox(height: 4),
                          Text(DateTime.parse(notif['createdAt']).toLocal().toString().split('.')[0], style: const TextStyle(color: Colors.grey, fontSize: 10)),
                        ],
                      ),
                      trailing: isRead ? null : Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFFD4AF37), shape: BoxShape.circle)),
                    );
                  },
                ),
    );
  }
}