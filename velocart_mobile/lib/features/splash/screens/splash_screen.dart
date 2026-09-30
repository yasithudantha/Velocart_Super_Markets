import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
// TODO: Import your actual next screen here (e.g., LoginScreen or AuthWrapper)
import '../../auth/screens/login_screen.dart'; 

class VideoSplashScreen extends StatefulWidget {
  const VideoSplashScreen({Key? key}) : super(key: key);

  @override
  _VideoSplashScreenState createState() => _VideoSplashScreenState();
}

class _VideoSplashScreenState extends State<VideoSplashScreen> {
  late VideoPlayerController _controller;
  bool _isVideoInitialized = false;

  @override
  void initState() {
    super.initState();
    
    // Initialize the video
    _controller = VideoPlayerController.asset('assets/videos/Landing-video.mp4')
      ..initialize().then((_) {
        setState(() {
          _isVideoInitialized = true;
        });
        _controller.setVolume(1.0); // Play audio if your video has it
        _controller.play();
      });

    // Listen for when the 10-second video finishes
    _controller.addListener(() {
      if (_controller.value.isInitialized && 
          !_controller.value.isPlaying && 
          _controller.value.position >= _controller.value.duration) {
        _navigateToNextScreen();
      }
    });
  }

  void _navigateToNextScreen() {
    // Navigate to your Login or Home screen and remove the splash screen from history
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 800),
        pageBuilder: (_, __, ___) => const LoginScreen(), // <-- CHANGE TO YOUR NEXT SCREEN
        transitionsBuilder: (_, animation, __, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // Dark background for cinematic feel
      body: Center(
        child: _isVideoInitialized
            ? SizedBox.expand(
                child: FittedBox(
                  fit: BoxFit.cover, // Makes the video fill the entire screen
                  child: SizedBox(
                    width: _controller.value.size.width,
                    height: _controller.value.size.height,
                    child: VideoPlayer(_controller),
                  ),
                ),
              )
            : const CircularProgressIndicator(color: Color(0xFFD4AF37)), // Gold loading spinner just in case
      ),
    );
  }
}