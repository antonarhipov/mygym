import { Logger } from './main';
import { poseDB } from './poseDatabase';
import { KeypointData } from './poseDetection';

/**
 * Keypoint Visualizer Component
 * Handles visualization of pose keypoints on a canvas overlay
 */
export class KeypointVisualizerComponent {
  private container: HTMLElement | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private currentVideoId: number | null = null;
  private keypointData: KeypointData[] = [];
  private isVisualizationEnabled = true;
  
  // Visualization options
  private keypointSize = 6;
  private keypointColor = '#4a90e2';
  private skeletonColor = '#4a90e2';
  private skeletonWidth = 2;
  private visibleBodyParts: { [key: string]: boolean } = {
    face: true,
    torso: true,
    arms: true,
    legs: true
  };
  
  // Caching
  private cachedFrames: Map<number, ImageData> = new Map();
  private maxCachedFrames = 100;
  
  constructor() {
    // Initialize when needed
  }
  
  /**
   * Initialize the visualizer with a video element and container
   * @param videoElement The video element to overlay
   * @param container The container element
   * @param videoId The ID of the current video
   */
  public async initialize(videoElement: HTMLVideoElement, container: HTMLElement, videoId: number): Promise<void> {
    this.videoElement = videoElement;
    this.container = container;
    this.currentVideoId = videoId;
    
    // Create canvas element
    this.createCanvasOverlay();
    
    // Load keypoint data for the video
    await this.loadKeypointData(videoId);
    
    // Set up event listeners
    this.setupEventListeners();
    
    Logger.info('Keypoint visualizer initialized');
  }
  
  /**
   * Create canvas overlay for the video
   */
  private createCanvasOverlay(): void {
    if (!this.videoElement || !this.container) return;
    
    // Create canvas element
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.className = 'keypoint-canvas';
    this.canvasElement.style.position = 'absolute';
    this.canvasElement.style.top = '0';
    this.canvasElement.style.left = '0';
    this.canvasElement.style.pointerEvents = 'none'; // Allow clicks to pass through to video
    
    // Set canvas size to match video
    this.resizeCanvas();
    
    // Get canvas context
    this.ctx = this.canvasElement.getContext('2d');
    
    // Add canvas to container
    const videoContainer = this.videoElement.parentElement;
    if (videoContainer) {
      videoContainer.style.position = 'relative'; // Ensure positioning context
      videoContainer.appendChild(this.canvasElement);
    }
  }
  
  /**
   * Resize canvas to match video dimensions
   */
  private resizeCanvas(): void {
    if (!this.videoElement || !this.canvasElement) return;
    
    const videoRect = this.videoElement.getBoundingClientRect();
    this.canvasElement.width = videoRect.width;
    this.canvasElement.height = videoRect.height;
    
    // Clear cache when resizing
    this.cachedFrames.clear();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.videoElement) return;
    
    // Update visualization on timeupdate
    this.videoElement.addEventListener('timeupdate', () => {
      this.updateVisualization();
    });
    
    // Resize canvas when video dimensions change
    this.videoElement.addEventListener('loadedmetadata', () => {
      this.resizeCanvas();
    });
    
    // Resize canvas when window is resized
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
    
    // Clear canvas when video is paused
    this.videoElement.addEventListener('pause', () => {
      this.updateVisualization();
    });
    
    // Clear canvas when video is ended
    this.videoElement.addEventListener('ended', () => {
      this.clearCanvas();
    });
    
    // Clear canvas when video is seeking
    this.videoElement.addEventListener('seeking', () => {
      this.clearCanvas();
    });
    
    // Update visualization when video is seeked
    this.videoElement.addEventListener('seeked', () => {
      this.updateVisualization();
    });
  }
  
  /**
   * Load keypoint data for a video
   * @param videoId ID of the video
   */
  private async loadKeypointData(videoId: number): Promise<void> {
    try {
      // Check if video has keypoint data
      const hasData = await poseDB.hasKeypointData(videoId);
      if (!hasData) {
        Logger.warn(`No keypoint data found for video ${videoId}`);
        return;
      }
      
      // Load keypoint data
      this.keypointData = await poseDB.getKeypointData(videoId);
      Logger.info(`Loaded ${this.keypointData.length} keypoint data entries for video ${videoId}`);
      
      // Sort by timestamp
      this.keypointData.sort((a, b) => a.timestamp - b.timestamp);
      
    } catch (error) {
      Logger.error('Error loading keypoint data:', error);
    }
  }
  
  /**
   * Update visualization based on current video time
   */
  private updateVisualization(): void {
    if (!this.videoElement || !this.ctx || !this.canvasElement || !this.isVisualizationEnabled) {
      return;
    }
    
    const currentTime = this.videoElement.currentTime;
    
    // Check if we have a cached frame for this time
    const cachedFrame = this.getCachedFrame(currentTime);
    if (cachedFrame) {
      this.ctx.putImageData(cachedFrame, 0, 0);
      return;
    }
    
    // Clear canvas
    this.clearCanvas();
    
    // Find the closest keypoint data to the current time
    const keypoint = this.findClosestKeypointData(currentTime);
    if (!keypoint) {
      return;
    }
    
    // Draw keypoints and skeleton
    this.drawKeypoints(keypoint);
    
    // Cache the frame
    this.cacheFrame(currentTime);
  }
  
  /**
   * Find the closest keypoint data to a given time
   * @param time Time in seconds
   * @returns The closest keypoint data or undefined if not found
   */
  private findClosestKeypointData(time: number): KeypointData | undefined {
    if (this.keypointData.length === 0) {
      return undefined;
    }
    
    // Find the closest keypoint data to the current time
    let closestData: KeypointData | undefined;
    let minDiff = Number.MAX_VALUE;
    
    for (const data of this.keypointData) {
      const diff = Math.abs(data.timestamp - time);
      if (diff < minDiff) {
        minDiff = diff;
        closestData = data;
      }
    }
    
    // Return the closest data if within tolerance (0.2 seconds)
    if (closestData && minDiff <= 0.2) {
      return closestData;
    }
    
    return undefined;
  }
  
  /**
   * Draw keypoints and skeleton on the canvas
   * @param keypointData Keypoint data to draw
   */
  private drawKeypoints(keypointData: KeypointData): void {
    if (!this.ctx || !this.canvasElement) return;
    
    const { width, height } = this.canvasElement;
    
    // Draw each pose
    keypointData.landmarks.forEach(pose => {
      // Draw skeleton lines first (so they appear behind the points)
      this.drawSkeleton(pose, width, height);
      
      // Draw keypoints
      pose.forEach((keypoint: any, index: number) => {
        // Skip if keypoint is not visible or if the body part is hidden
        if (keypoint.visibility < 0.5 || !this.isBodyPartVisible(index)) {
          return;
        }
        
        const x = keypoint.x * width;
        const y = keypoint.y * height;
        
        // Draw keypoint
        this.ctx!.beginPath();
        this.ctx!.arc(x, y, this.keypointSize, 0, 2 * Math.PI);
        this.ctx!.fillStyle = this.keypointColor;
        this.ctx!.fill();
      });
    });
  }
  
  /**
   * Draw skeleton lines connecting keypoints
   * @param pose Array of keypoints
   * @param width Canvas width
   * @param height Canvas height
   */
  private drawSkeleton(pose: any[], width: number, height: number): void {
    if (!this.ctx) return;
    
    // Define connections between keypoints
    // These are the standard connections for MediaPipe Pose
    const connections = [
      // Face
      [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
      // Torso
      [9, 10], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      // Arms
      [11, 23], [12, 24], [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
      // Legs
      [15, 17], [17, 19], [19, 21], [16, 18], [18, 20], [20, 22]
    ];
    
    // Set line style
    this.ctx.strokeStyle = this.skeletonColor;
    this.ctx.lineWidth = this.skeletonWidth;
    
    // Draw connections
    connections.forEach(([i, j]) => {
      // Skip if either keypoint is not visible or if the body part is hidden
      if (!this.isBodyPartVisible(i) || !this.isBodyPartVisible(j)) {
        return;
      }
      
      const kp1 = pose[i];
      const kp2 = pose[j];
      
      // Skip if either keypoint has low visibility
      if (kp1.visibility < 0.5 || kp2.visibility < 0.5) {
        return;
      }
      
      // Draw line
      this.ctx!.beginPath();
      this.ctx!.moveTo(kp1.x * width, kp1.y * height);
      this.ctx!.lineTo(kp2.x * width, kp2.y * height);
      this.ctx!.stroke();
    });
  }
  
  /**
   * Check if a body part is visible based on keypoint index
   * @param index Keypoint index
   * @returns True if the body part is visible
   */
  private isBodyPartVisible(index: number): boolean {
    // Face: 0-10
    if (index >= 0 && index <= 10) {
      return this.visibleBodyParts.face;
    }
    // Torso: 11-16
    else if (index >= 11 && index <= 16) {
      return this.visibleBodyParts.torso;
    }
    // Arms: 17-22
    else if ((index >= 17 && index <= 22) || (index >= 23 && index <= 32)) {
      return this.visibleBodyParts.arms;
    }
    // Legs: 23-32
    else if (index >= 23 && index <= 32) {
      return this.visibleBodyParts.legs;
    }
    
    return true;
  }
  
  /**
   * Clear the canvas
   */
  private clearCanvas(): void {
    if (!this.ctx || !this.canvasElement) return;
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
  }
  
  /**
   * Cache the current frame
   * @param time Time in seconds
   */
  private cacheFrame(time: number): void {
    if (!this.ctx || !this.canvasElement) return;
    
    // Limit cache size
    if (this.cachedFrames.size >= this.maxCachedFrames) {
      // Remove oldest entry
      const oldestTime = this.cachedFrames.keys().next().value;
      this.cachedFrames.delete(oldestTime);
    }
    
    // Cache current frame
    const imageData = this.ctx.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);
    this.cachedFrames.set(time, imageData);
  }
  
  /**
   * Get cached frame for a given time
   * @param time Time in seconds
   * @returns Cached frame or undefined if not found
   */
  private getCachedFrame(time: number): ImageData | undefined {
    // Find the closest cached frame within tolerance
    const tolerance = 0.05; // 50ms tolerance
    
    for (const [cachedTime, imageData] of this.cachedFrames.entries()) {
      if (Math.abs(cachedTime - time) <= tolerance) {
        return imageData;
      }
    }
    
    return undefined;
  }
  
  /**
   * Set keypoint visualization options
   * @param options Visualization options
   */
  public setOptions(options: {
    keypointSize?: number;
    keypointColor?: string;
    skeletonColor?: string;
    skeletonWidth?: number;
    visibleBodyParts?: { [key: string]: boolean };
    isEnabled?: boolean;
  }): void {
    if (options.keypointSize !== undefined) {
      this.keypointSize = options.keypointSize;
    }
    if (options.keypointColor !== undefined) {
      this.keypointColor = options.keypointColor;
    }
    if (options.skeletonColor !== undefined) {
      this.skeletonColor = options.skeletonColor;
    }
    if (options.skeletonWidth !== undefined) {
      this.skeletonWidth = options.skeletonWidth;
    }
    if (options.visibleBodyParts !== undefined) {
      this.visibleBodyParts = { ...this.visibleBodyParts, ...options.visibleBodyParts };
    }
    if (options.isEnabled !== undefined) {
      this.isVisualizationEnabled = options.isEnabled;
      if (!this.isVisualizationEnabled) {
        this.clearCanvas();
      } else {
        this.updateVisualization();
      }
    }
    
    // Clear cache when options change
    this.cachedFrames.clear();
    
    // Update visualization with new options
    this.updateVisualization();
  }
  
  /**
   * Toggle visibility of a body part
   * @param bodyPart Body part to toggle
   * @param isVisible Whether the body part should be visible
   */
  public toggleBodyPart(bodyPart: string, isVisible: boolean): void {
    if (this.visibleBodyParts.hasOwnProperty(bodyPart)) {
      this.visibleBodyParts[bodyPart] = isVisible;
      
      // Clear cache and update visualization
      this.cachedFrames.clear();
      this.updateVisualization();
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    if (!this.videoElement) return;
    
    // Remove event listeners
    this.videoElement.removeEventListener('timeupdate', this.updateVisualization);
    this.videoElement.removeEventListener('loadedmetadata', this.resizeCanvas);
    this.videoElement.removeEventListener('pause', this.updateVisualization);
    this.videoElement.removeEventListener('ended', this.clearCanvas);
    this.videoElement.removeEventListener('seeking', this.clearCanvas);
    this.videoElement.removeEventListener('seeked', this.updateVisualization);
    
    // Remove canvas from DOM
    if (this.canvasElement && this.canvasElement.parentElement) {
      this.canvasElement.parentElement.removeChild(this.canvasElement);
    }
    
    // Clear references
    this.videoElement = null;
    this.canvasElement = null;
    this.ctx = null;
    this.keypointData = [];
    this.cachedFrames.clear();
  }
}

// Create and export a singleton instance
export const keypointVisualizer = new KeypointVisualizerComponent();