import 'package:flutter/material.dart';
import '../api/ai_agent_api.dart';

class ChatMessage {
  final String id;
  final String sender; // 'USER' or 'AI'
  final String text;
  final List<dynamic>? proposedCart;
  bool isApproved;

  ChatMessage({
    required this.id,
    required this.sender,
    required this.text,
    this.proposedCart,
    this.isApproved = false,
  });
}

class StorefrontAssistantScreen extends StatefulWidget {
  const StorefrontAssistantScreen({Key? key}) : super(key: key);

  @override
  _StorefrontAssistantScreenState createState() => _StorefrontAssistantScreenState();
}

class _StorefrontAssistantScreenState extends State<StorefrontAssistantScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  List<ChatMessage> messages = [
    ChatMessage(
      id: 'welcome',
      sender: 'AI',
      text: "Hi! I'm your VeloCart AI Assistant. I can help you find products, check your points, or build a cart to fit your budget. What are you looking for today?",
    )
  ];
  
  bool isLoading = false;
  String? actionLoadingId;

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    if (_textController.text.trim().isEmpty) return;

    final userText = _textController.text.trim();
    _textController.clear();

    setState(() {
      messages.add(ChatMessage(id: DateTime.now().toString(), sender: 'USER', text: userText));
      isLoading = true;
    });
    _scrollToBottom();

    try {
      final response = await AiAgentApi.sendChatMessage(userText);
      
      setState(() {
        messages.add(ChatMessage(
          id: DateTime.now().toString(),
          sender: 'AI',
          text: response['reply'] ?? "I couldn't process that request.",
          proposedCart: response['proposedCart'] != null && (response['proposedCart'] as List).isNotEmpty 
              ? response['proposedCart'] 
              : null,
        ));
      });
    } catch (e) {
      setState(() {
        messages.add(ChatMessage(
          id: DateTime.now().toString(),
          sender: 'AI',
          text: "Sorry, I'm having trouble connecting to VeloCart systems. Please try again.",
        ));
      });
    } finally {
      setState(() { isLoading = false; });
      _scrollToBottom();
    }
  }

  Future<void> _approveCart(String messageId, List<dynamic> items) async {
    setState(() => actionLoadingId = messageId);
    try {
      for (var item in items) {
        await AiAgentApi.approveAndAddToCart(
          item['ProductVariantId'], 
          item['Quantity']
        );
      }
      
      setState(() {
        final msgIndex = messages.indexWhere((m) => m.id == messageId);
        if (msgIndex != -1) messages[msgIndex].isApproved = true;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Items successfully added to cart!"), backgroundColor: Colors.green),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to add items: $e"), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => actionLoadingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF050505),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A1A1A),
        title: Row(
          children: [
            const Icon(Icons.smart_toy, color: Color(0xFFD4AF37)),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text("VeloCart Assistant", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                Text("Agentic AI Powered", style: TextStyle(color: Color(0xFFD4AF37), fontSize: 12)),
              ],
            ),
          ],
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final msg = messages[index];
                final isUser = msg.sender == 'USER';

                return Column(
                  crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(bottom: 8, top: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                      decoration: BoxDecoration(
                        color: isUser ? const Color(0xFFD4AF37) : const Color(0xFF1A1A1A),
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(16),
                          topRight: const Radius.circular(16),
                          bottomLeft: isUser ? const Radius.circular(16) : const Radius.circular(4),
                          bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(16),
                        ),
                        border: isUser ? null : Border.all(color: Colors.white10),
                      ),
                      child: Text(
                        msg.text,
                        style: TextStyle(color: isUser ? Colors.black : Colors.white, fontSize: 14),
                      ),
                    ),
                    
                    // AI Proposed Cart UI
                    if (!isUser && msg.proposedCart != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 16, top: 4),
                        width: MediaQuery.of(context).size.width * 0.85,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.black45,
                          border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.3)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: const [
                                Icon(Icons.shopping_cart, color: Color(0xFFD4AF37), size: 16),
                                SizedBox(width: 8),
                                Text("AI PROPOSED CART", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const Divider(color: Colors.white10, height: 16),
                            ...msg.proposedCart!.map((item) => Padding(
                              padding: const EdgeInsets.only(bottom: 8.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(child: Text(item['ProductName'] ?? 'Product ID: ${item['ProductVariantId']}', style: const TextStyle(color: Colors.white70, fontSize: 13), overflow: TextOverflow.ellipsis)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: const Color(0xFFD4AF37).withOpacity(0.2), borderRadius: BorderRadius.circular(4)),
                                    child: Text("Qty: ${item['Quantity']}", style: const TextStyle(color: Color(0xFFD4AF37), fontSize: 12, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            )).toList(),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: msg.isApproved ? Colors.green.withOpacity(0.2) : const Color(0xFFD4AF37),
                                  foregroundColor: msg.isApproved ? Colors.green : Colors.black,
                                  elevation: 0,
                                  side: msg.isApproved ? const BorderSide(color: Colors.green) : BorderSide.none,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                onPressed: msg.isApproved || actionLoadingId == msg.id ? null : () => _approveCart(msg.id, msg.proposedCart!),
                                icon: actionLoadingId == msg.id 
                                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                                    : const Icon(Icons.check_circle, size: 18),
                                label: Text(msg.isApproved ? "Added to Cart" : "Approve & Update Cart", style: const TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            )
                          ],
                        ),
                      )
                  ],
                );
              },
            ),
          ),
          if (isLoading)
            Padding(
              padding: const EdgeInsets.only(left: 16.0, bottom: 8.0),
              child: Row(
                children: const [
                  SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFD4AF37))),
                  SizedBox(width: 8),
                  Text("AI is thinking...", style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF1A1A1A),
              border: Border(top: BorderSide(color: Colors.white10)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: "e.g. Find me a cheap rice brand...",
                      hintStyle: const TextStyle(color: Colors.grey),
                      filled: true,
                      fillColor: Colors.black54,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: const Color(0xFFD4AF37),
                  radius: 24,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.black, size: 20),
                    onPressed: isLoading ? null : _sendMessage,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}