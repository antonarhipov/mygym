import { Logger } from './main';
import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

/**
 * Keypoint data interface
 * Contains pose keypoints with timestamp
 */
export interface KeypointData {
  id?: number; // Auto-incremented primary key
  videoId: number; // Reference to the video
  timestamp: number; // Timestamp in seconds
  landmarks: any[]; // Pose landmarks
  worldLandmarks?: any[]; // 3D world landmarks (if available)
  segmentationMask?: ImageBitmap; // Segmentation mask (if enabled)
}

/**
 * Pose Detection Manager
 * Handles pose detection using MediaPipe Pose Landmarker
 */
export class PoseDetectionManager {
  private poseLandmarker: PoseLandmarker | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private processingQueue: Array<{
    videoFrame: HTMLCanvasElement | HTMLVideoElement | ImageBitmap;
    timestamp: number;
    resolve: (result: PoseLandmarkerResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;

  // Configuration
  private modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  private numPoses = 1; // Default to detecting one person
  private minPoseDetectionConfidence = 0.5;
  private minPosePresenceConfidence = 0.5;
  private minTrackingConfidence = 0.5;
  private enableSegmentation = false;
  private runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO'; // Default to VIDEO mode

  constructor() {
    // Initialize the pose landmarker when needed
  }

  /**
   * Initialize the pose landmarker
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.isInitializing) {
      // Wait for initialization to complete
      return new Promise<void>((resolve, reject) => {
        const checkInitialized = () => {
          if (this.isInitialized) {
            resolve();
          } else if (!this.isInitializing) {
            reject(new Error('Initialization failed'));
          } else {
            setTimeout(checkInitialized, 100);
          }
        };
        setTimeout(checkInitialized, 100);
      });
    }

    this.isInitializing = true;

    try {
      Logger.info('Initializing PoseLandmarker...');

      // Initialize the Pose Landmarker
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: this.modelAssetPath,
          delegate: 'GPU'
        },
        runningMode: this.runningMode,
        numPoses: this.numPoses,
        minPoseDetectionConfidence: this.minPoseDetectionConfidence,
        minPosePresenceConfidence: this.minPosePresenceConfidence,
        minTrackingConfidence: this.minTrackingConfidence,
        outputSegmentationMasks: this.enableSegmentation
      });

      this.isInitialized = true;
      this.isInitializing = false;
      Logger.info('PoseLandmarker initialized successfully');

    } catch (error) {
      this.isInitializing = false;
      Logger.error('Error initializing PoseLandmarker:', error);
      throw error;
    }
  }

  /**
   * Detect poses in a single frame
   * @param frame Video frame to process
   * @param timestamp Timestamp in seconds
   * @returns Promise resolving to pose detection result
   */
  public async detectPose(
    frame: HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
    timestamp: number
  ): Promise<PoseLandmarkerResult> {
    // Ensure the pose landmarker is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.poseLandmarker) {
      throw new Error('PoseLandmarker not initialized');
    }

    // Add to processing queue and process
    return new Promise<PoseLandmarkerResult>((resolve, reject) => {
      this.processingQueue.push({ videoFrame: frame, timestamp, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the queue of frames
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const { videoFrame, timestamp, resolve, reject } = this.processingQueue.shift()!;

      if (!this.poseLandmarker) {
        reject(new Error('PoseLandmarker not initialized'));
        return;
      }

      // Process the frame
      // Ensure timestamp is at least 1 to avoid MediaPipe timestamp mismatch errors
      const adjustedTimestamp = Math.max(1, timestamp * 1000);
      const result = this.poseLandmarker.detectForVideo(videoFrame, adjustedTimestamp);
      resolve(result);

    } catch (error) {
      Logger.error('Error processing frame:', error);
    } finally {
      this.isProcessing = false;

      // Process next item in queue if any
      if (this.processingQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Extract frames from a video for processing
   * @param video Video element to extract frames from
   * @param startTime Start time in seconds
   * @param endTime End time in seconds (optional, defaults to video duration)
   * @param frameRate Number of frames per second to extract (optional, defaults to 5)
   * @param progressCallback Callback for progress updates
   * @returns Promise resolving to an array of keypoint data
   */
  public async extractFramesAndDetectPoses(
    video: HTMLVideoElement,
    startTime: number,
    endTime?: number,
    frameRate = 5,
    progressCallback?: (progress: number) => void
  ): Promise<KeypointData[]> {
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Video not loaded');
    }

    // Ensure the pose landmarker is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Set default end time to video duration if not provided
    const videoEndTime = endTime || video.duration;

    // Calculate frame interval based on frame rate
    const frameInterval = 1 / frameRate;

    // Create canvas for frame extraction
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Array to store keypoint data
    const keypointDataArray: KeypointData[] = [];

    // Calculate total number of frames to process
    const totalFrames = Math.ceil((videoEndTime - startTime) / frameInterval);
    let processedFrames = 0;

    // Process frames
    for (let time = startTime; time < videoEndTime; time += frameInterval) {
      // Set video to current time
      video.currentTime = time;

      // Wait for seeked event
      await new Promise<void>(resolve => {
        const seeked = () => {
          video.removeEventListener('seeked', seeked);
          resolve();
        };
        video.addEventListener('seeked', seeked);
      });

      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect pose in current frame
      try {
        // Use a non-zero timestamp to avoid MediaPipe timestamp mismatch errors
        // We still store the original time in the keypoint data for accurate playback sync
        const result = await this.detectPose(canvas, Math.max(0.001, time));

        // Store keypoint data if poses were detected
        if (result.landmarks.length > 0) {
          keypointDataArray.push({
            videoId: -1, // This will be set by the caller
            timestamp: time, // Store original time for playback sync
            landmarks: JSON.parse(JSON.stringify(result.landmarks)),
            worldLandmarks: result.worldLandmarks ? JSON.parse(JSON.stringify(result.worldLandmarks)) : undefined,
            segmentationMask: result.segmentationMasks && result.segmentationMasks.length > 0 
              ? await createImageBitmap(result.segmentationMasks[0]) 
              : undefined
          });
        }

        // Update progress
        processedFrames++;
        if (progressCallback) {
          progressCallback(processedFrames / totalFrames);
        }

      } catch (error) {
        Logger.error(`Error detecting pose at time ${time}:`, error);
        // Continue with next frame
      }
    }

    return keypointDataArray;
  }

  /**
   * Configure the pose landmarker
   * @param config Configuration options
   */
  public configure(config: {
    modelAssetPath?: string;
    numPoses?: number;
    minPoseDetectionConfidence?: number;
    minPosePresenceConfidence?: number;
    minTrackingConfidence?: number;
    enableSegmentation?: boolean;
    runningMode?: 'IMAGE' | 'VIDEO';
  }): void {
    // Update configuration
    if (config.modelAssetPath !== undefined) {
      this.modelAssetPath = config.modelAssetPath;
    }
    if (config.numPoses !== undefined) {
      this.numPoses = config.numPoses;
    }
    if (config.minPoseDetectionConfidence !== undefined) {
      this.minPoseDetectionConfidence = config.minPoseDetectionConfidence;
    }
    if (config.minPosePresenceConfidence !== undefined) {
      this.minPosePresenceConfidence = config.minPosePresenceConfidence;
    }
    if (config.minTrackingConfidence !== undefined) {
      this.minTrackingConfidence = config.minTrackingConfidence;
    }
    if (config.enableSegmentation !== undefined) {
      this.enableSegmentation = config.enableSegmentation;
    }
    if (config.runningMode !== undefined) {
      this.runningMode = config.runningMode;
    }

    // Reset initialization if already initialized
    if (this.isInitialized) {
      this.isInitialized = false;
      this.poseLandmarker = null;
    }
  }
}

// Create and export a singleton instance
export const poseDetectionManager = new PoseDetectionManager();
