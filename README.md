# MyGym - AI-Powered Workout Analysis

## Overview

MyGym is a web-based application for video upload, pose detection, and exercise repetition counting. The application allows users to upload workout videos, analyze them for proper form, and count repetitions of exercises like squats, with extensibility for other movements.

## Features

- **Video Upload and Storage**: Upload workout videos and store them locally in your browser
- **Video Playback**: Watch your workout videos with custom playback controls
- **Pose Detection**: Analyze videos to detect body poses using MediaPipe Pose
- **Keypoint Visualization**: View detected body keypoints overlaid on your videos
- **Exercise Repetition Counting**: Automatically count squat repetitions (with more exercises coming soon)
- **Privacy-Focused**: All processing happens locally in your browser - no videos are uploaded to any server

## Technologies Used

- **Frontend**: TypeScript, HTML5, CSS3, Canvas API
- **Libraries**:
  - MediaPipe Pose for pose detection
  - Dexie.js for IndexedDB interaction
- **Build Tools**: Vite, TypeScript

## Current Status

The project is currently in active development:

- ✅ Project setup and basic UI
- ✅ Video upload and storage
- ✅ Video playback
- ✅ Pose detection integration
- ✅ Keypoint visualization
- 🔄 Squat repetition counting (in progress)
- 📅 Extensibility framework (planned)
- 📅 Testing and optimization (planned)
- 📅 Final polishing and documentation (planned)

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari)
- Node.js and npm for development

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/mygym.git
   cd mygym
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Build for production:
   ```
   npm run build
   ```

5. Preview the production build:
   ```
   npm run preview
   ```

## Usage

1. **Upload a Video**: Click the upload button to select a workout video from your device
2. **View Your Videos**: Browse your uploaded videos in the library
3. **Analyze a Video**: Select a video and click "Analyze" to detect poses
4. **View Analysis**: Watch the video with pose keypoints overlaid and exercise repetitions counted

## Privacy

MyGym processes all videos locally in your browser. No video data is sent to any server, ensuring your workout videos remain private.

## Browser Storage

Videos are stored in your browser's IndexedDB storage. Storage limits vary by browser (typically 50% of free disk space). The application includes storage management features to help you manage your videos.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- MediaPipe team for their excellent pose detection library
- Dexie.js team for their IndexedDB wrapper