import { Logger } from './main';
import { poseDetectionManager } from './poseDetection';
import { poseDB } from './poseDatabase';
import { videoDB } from './database';

/**
 * Pose Processor Component
 * Handles on-demand processing of videos for pose detection
 */
export class PoseProcessorComponent {
  private processingContainer: HTMLElement | null = null;
  private isProcessing = false;
  
  constructor() {
    // Create processing container
    this.createProcessingContainer();
  }
  
  /**
   * Create processing container and add it to the DOM
   */
  private createProcessingContainer(): void {
    // Create container
    this.processingContainer = document.createElement('div');
    this.processingContainer.className = 'pose-processing-container';
    this.processingContainer.style.display = 'none';
    
    // Add to analysis section
    const analysisContainer = document.querySelector('.analysis-container');
    if (analysisContainer) {
      analysisContainer.appendChild(this.processingContainer);
    } else {
      Logger.error('Analysis container not found');
    }
  }
  
  /**
   * Process a video for pose detection
   * @param videoId ID of the video to process
   * @returns Promise resolving when processing is complete
   */
  public async processVideo(videoId: number): Promise<void> {
    if (this.isProcessing) {
      Logger.warn('Already processing a video');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Show processing UI
      this.showProcessingUI(videoId);
      
      // Check if video already has keypoint data
      const hasData = await poseDB.hasKeypointData(videoId);
      if (hasData) {
        const shouldReprocess = confirm('This video has already been processed. Do you want to process it again?');
        if (!shouldReprocess) {
          this.isProcessing = false;
          this.hideProcessingUI();
          return;
        }
      }
      
      // Get video blob
      const blob = await videoDB.getVideoBlob(videoId);
      if (!blob) {
        throw new Error(`Video with ID ${videoId} not found`);
      }
      
      // Create video element for processing
      const video = document.createElement('video');
      video.style.display = 'none';
      document.body.appendChild(video);
      
      // Create object URL for the blob
      const url = URL.createObjectURL(blob);
      video.src = url;
      
      // Wait for video to load metadata
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Error loading video'));
        video.load();
      });
      
      // Update progress UI
      this.updateProgressUI(0, 'Initializing pose detection...');
      
      // Initialize pose detection
      await poseDetectionManager.initialize();
      
      // Process video frames
      this.updateProgressUI(0, 'Processing video frames...');
      
      // Extract frames and detect poses
      const keypointData = await poseDetectionManager.extractFramesAndDetectPoses(
        video,
        0, // Start from beginning
        undefined, // Process entire video
        5, // 5 frames per second
        (progress) => {
          this.updateProgressUI(progress * 0.9, `Processing video: ${Math.round(progress * 100)}%`);
        }
      );
      
      // Store keypoint data
      this.updateProgressUI(0.9, 'Storing keypoint data...');
      await poseDB.storeKeypointData(videoId, keypointData);
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(video);
      
      // Show success message
      this.updateProgressUI(1, 'Processing complete!');
      setTimeout(() => {
        this.hideProcessingUI();
        this.showSuccessMessage(keypointData.length);
      }, 1000);
      
      Logger.info(`Processed video ${videoId}: ${keypointData.length} keypoints detected`);
      
    } catch (error) {
      Logger.error('Error processing video:', error);
      this.showErrorMessage(error as Error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Show processing UI
   * @param videoId ID of the video being processed
   */
  private showProcessingUI(videoId: number): void {
    if (!this.processingContainer) return;
    
    // Clear previous content
    this.processingContainer.innerHTML = '';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = 'Processing Video for Pose Detection';
    this.processingContainer.appendChild(header);
    
    // Create progress container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    
    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = '0%';
    progressContainer.appendChild(progressBar);
    
    // Create progress text
    const progressText = document.createElement('div');
    progressText.className = 'progress-text';
    progressText.textContent = 'Initializing...';
    
    // Create cancel button
    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel processing?')) {
        this.hideProcessingUI();
        this.isProcessing = false;
      }
    });
    
    // Add elements to container
    this.processingContainer.appendChild(progressContainer);
    this.processingContainer.appendChild(progressText);
    this.processingContainer.appendChild(cancelButton);
    
    // Show container
    this.processingContainer.style.display = 'block';
    
    // Hide video player if visible
    const videoPlayer = document.querySelector('.video-player-container');
    if (videoPlayer) {
      videoPlayer.style.display = 'none';
    }
    
    // Hide empty state if visible
    const emptyState = document.querySelector('.analysis-container .empty-state');
    if (emptyState) {
      emptyState.style.display = 'none';
    }
  }
  
  /**
   * Update progress UI
   * @param progress Progress value (0-1)
   * @param message Progress message
   */
  private updateProgressUI(progress: number, message: string): void {
    if (!this.processingContainer) return;
    
    // Update progress bar
    const progressBar = this.processingContainer.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.style.width = `${Math.round(progress * 100)}%`;
    }
    
    // Update progress text
    const progressText = this.processingContainer.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = message;
    }
  }
  
  /**
   * Hide processing UI
   */
  private hideProcessingUI(): void {
    if (!this.processingContainer) return;
    
    // Hide container
    this.processingContainer.style.display = 'none';
  }
  
  /**
   * Show success message
   * @param keypointCount Number of keypoints detected
   */
  private showSuccessMessage(keypointCount: number): void {
    alert(`Processing complete! Detected ${keypointCount} keypoints.`);
  }
  
  /**
   * Show error message
   * @param error Error object
   */
  private showErrorMessage(error: Error): void {
    alert(`Error processing video: ${error.message}`);
    this.hideProcessingUI();
  }
}

// Create and export a singleton instance
export const poseProcessor = new PoseProcessorComponent();