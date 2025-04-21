import { Logger } from './main';
import { videoDB, VideoMetadata } from './database';
import { poseProcessor } from './poseProcessor';
import { keypointVisualizer } from './keypointVisualizer';
import { keypointVisualizerControls } from './keypointVisualizerControls';
import { poseDB } from './poseDatabase';

/**
 * Video Player Component
 * Handles video playback with custom controls and metadata display
 */
export class VideoPlayerComponent {
  private container: HTMLElement | null;
  private videoElement: HTMLVideoElement | null = null;
  private controlsContainer: HTMLElement | null = null;
  private metadataContainer: HTMLElement | null = null;
  private currentVideoId: number | null = null;
  private currentVideoMetadata: VideoMetadata | null = null;

  // Control elements
  private playPauseButton: HTMLButtonElement | null = null;
  private seekBar: HTMLInputElement | null = null;
  private volumeControl: HTMLInputElement | null = null;
  private muteButton: HTMLButtonElement | null = null;
  private fullscreenButton: HTMLButtonElement | null = null;
  private playbackSpeedSelect: HTMLSelectElement | null = null;
  private currentTimeDisplay: HTMLElement | null = null;
  private durationDisplay: HTMLElement | null = null;

  constructor() {
    // Get container element
    this.container = document.querySelector('.analysis-container');

    // Create player elements
    this.createPlayerElements();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Create player elements
   */
  private createPlayerElements(): void {
    if (!this.container) {
      Logger.error('Video player container not found');
      return;
    }

    // Create player container
    const playerContainer = document.createElement('div');
    playerContainer.className = 'video-player-container';
    playerContainer.style.display = 'none'; // Hide initially

    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.className = 'video-player';
    this.videoElement.playsInline = true;

    // Create controls container
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'video-controls';

    // Create play/pause button
    this.playPauseButton = document.createElement('button');
    this.playPauseButton.className = 'control-button play-pause-button';
    this.playPauseButton.innerHTML = '&#9658;'; // Play icon
    this.controlsContainer.appendChild(this.playPauseButton);

    // Create time display
    this.currentTimeDisplay = document.createElement('span');
    this.currentTimeDisplay.className = 'time-display current-time';
    this.currentTimeDisplay.textContent = '0:00';
    this.controlsContainer.appendChild(this.currentTimeDisplay);

    // Create seek bar
    this.seekBar = document.createElement('input');
    this.seekBar.type = 'range';
    this.seekBar.className = 'seek-bar';
    this.seekBar.min = '0';
    this.seekBar.max = '100';
    this.seekBar.value = '0';
    this.seekBar.step = '0.1';
    this.controlsContainer.appendChild(this.seekBar);

    // Create duration display
    this.durationDisplay = document.createElement('span');
    this.durationDisplay.className = 'time-display duration';
    this.durationDisplay.textContent = '0:00';
    this.controlsContainer.appendChild(this.durationDisplay);

    // Create volume control
    const volumeContainer = document.createElement('div');
    volumeContainer.className = 'volume-container';

    this.muteButton = document.createElement('button');
    this.muteButton.className = 'control-button mute-button';
    this.muteButton.innerHTML = '&#128266;'; // Speaker icon
    volumeContainer.appendChild(this.muteButton);

    this.volumeControl = document.createElement('input');
    this.volumeControl.type = 'range';
    this.volumeControl.className = 'volume-control';
    this.volumeControl.min = '0';
    this.volumeControl.max = '1';
    this.volumeControl.value = '1';
    this.volumeControl.step = '0.1';
    volumeContainer.appendChild(this.volumeControl);

    this.controlsContainer.appendChild(volumeContainer);

    // Create playback speed control
    this.playbackSpeedSelect = document.createElement('select');
    this.playbackSpeedSelect.className = 'playback-speed';

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    speeds.forEach(speed => {
      const option = document.createElement('option');
      option.value = speed.toString();
      option.textContent = `${speed}x`;
      if (speed === 1) {
        option.selected = true;
      }
      this.playbackSpeedSelect?.appendChild(option);
    });

    this.controlsContainer.appendChild(this.playbackSpeedSelect);

    // Create fullscreen button
    this.fullscreenButton = document.createElement('button');
    this.fullscreenButton.className = 'control-button fullscreen-button';
    this.fullscreenButton.innerHTML = '&#x26F6;'; // Fullscreen icon
    this.controlsContainer.appendChild(this.fullscreenButton);

    // Create metadata container
    this.metadataContainer = document.createElement('div');
    this.metadataContainer.className = 'video-metadata';

    // Assemble player
    playerContainer.appendChild(this.videoElement);
    playerContainer.appendChild(this.controlsContainer);
    playerContainer.appendChild(this.metadataContainer);

    // Add to container
    this.container.appendChild(playerContainer);
  }

  /**
   * Set up event listeners for the player
   */
  private setupEventListeners(): void {
    if (!this.videoElement) return;

    // Play/pause button
    this.playPauseButton?.addEventListener('click', () => {
      this.togglePlayPause();
    });

    // Video element events
    this.videoElement.addEventListener('click', () => {
      this.togglePlayPause();
    });

    this.videoElement.addEventListener('play', () => {
      if (this.playPauseButton) {
        this.playPauseButton.innerHTML = '&#10074;&#10074;'; // Pause icon
      }
    });

    this.videoElement.addEventListener('pause', () => {
      if (this.playPauseButton) {
        this.playPauseButton.innerHTML = '&#9658;'; // Play icon
      }
    });

    this.videoElement.addEventListener('timeupdate', () => {
      this.updateTimeDisplay();
      this.updateSeekBar();
    });

    this.videoElement.addEventListener('loadedmetadata', () => {
      this.updateDuration();
      this.extractVideoMetadata();
    });

    this.videoElement.addEventListener('ended', () => {
      if (this.playPauseButton) {
        this.playPauseButton.innerHTML = '&#9658;'; // Play icon
      }
    });

    // Seek bar
    this.seekBar?.addEventListener('input', () => {
      this.seek();
    });

    // Volume control
    this.volumeControl?.addEventListener('input', () => {
      this.updateVolume();
    });

    // Mute button
    this.muteButton?.addEventListener('click', () => {
      this.toggleMute();
    });

    // Playback speed
    this.playbackSpeedSelect?.addEventListener('change', () => {
      this.updatePlaybackSpeed();
    });

    // Fullscreen button
    this.fullscreenButton?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Error handling
    this.videoElement.addEventListener('error', (e) => {
      this.handleVideoError(e);
    });
  }

  /**
   * Play a video
   * @param videoId ID of the video to play
   */
  public async playVideo(videoId: number): Promise<void> {
    try {
      // Clean up any existing keypoint visualizer
      this.cleanupKeypointVisualizer();

      // Get video blob
      const blob = await videoDB.getVideoBlob(videoId);
      if (!blob) {
        throw new Error(`Video with ID ${videoId} not found`);
      }

      // Get video metadata
      const videos = await videoDB.getAllVideos();
      const metadata = videos.find(v => v.id === videoId);
      if (!metadata) {
        throw new Error(`Video metadata with ID ${videoId} not found`);
      }

      // Store current video info
      this.currentVideoId = videoId;
      this.currentVideoMetadata = metadata;

      // Create URL for the blob
      const url = URL.createObjectURL(blob);

      // Set video source
      if (this.videoElement) {
        this.videoElement.src = url;

        // Show player container
        const playerContainer = this.videoElement.parentElement;
        if (playerContainer) {
          playerContainer.style.display = 'block';
        }

        // Hide empty state
        const emptyState = this.container?.querySelector('.empty-state');
        if (emptyState) {
          emptyState.style.display = 'none';
        }

        // Display video name and basic info
        this.displayVideoInfo(metadata);

        // Check if video has keypoint data and initialize visualizer if it does
        this.initializeKeypointVisualizer(videoId);

        // Auto-play
        this.videoElement.play().catch(error => {
          Logger.warn('Auto-play prevented:', error);
          // This is often due to browser autoplay policies
        });
      }

      Logger.info(`Playing video: ${metadata.name}`);

    } catch (error) {
      Logger.error('Error playing video:', error);
      alert('Error playing video. Please try again.');
    }
  }

  /**
   * Initialize keypoint visualizer for a video
   * @param videoId ID of the video
   */
  private async initializeKeypointVisualizer(videoId: number): Promise<void> {
    try {
      // Check if video has keypoint data
      const hasData = await poseDB.hasKeypointData(videoId);
      if (!hasData) {
        Logger.info(`No keypoint data found for video ${videoId}, skipping visualizer initialization`);
        return;
      }

      // Initialize keypoint visualizer
      if (this.videoElement && this.container) {
        const playerContainer = this.videoElement.parentElement;
        if (playerContainer) {
          await keypointVisualizer.initialize(this.videoElement, playerContainer, videoId);

          // Initialize controls
          keypointVisualizerControls.initialize(this.metadataContainer || this.container);

          Logger.info(`Keypoint visualizer initialized for video ${videoId}`);
        }
      }
    } catch (error) {
      Logger.error('Error initializing keypoint visualizer:', error);
    }
  }

  /**
   * Clean up keypoint visualizer resources
   */
  private cleanupKeypointVisualizer(): void {
    try {
      keypointVisualizer.dispose();
      keypointVisualizerControls.dispose();
      Logger.info('Keypoint visualizer resources cleaned up');
    } catch (error) {
      Logger.error('Error cleaning up keypoint visualizer:', error);
    }
  }

  /**
   * Toggle play/pause
   */
  private togglePlayPause(): void {
    if (!this.videoElement) return;

    if (this.videoElement.paused) {
      this.videoElement.play().catch(error => {
        Logger.error('Error playing video:', error);
      });
    } else {
      this.videoElement.pause();
    }
  }

  /**
   * Update time display
   */
  private updateTimeDisplay(): void {
    if (!this.videoElement || !this.currentTimeDisplay) return;

    const currentTime = this.videoElement.currentTime;
    this.currentTimeDisplay.textContent = this.formatTime(currentTime);
  }

  /**
   * Update duration display
   */
  private updateDuration(): void {
    if (!this.videoElement || !this.durationDisplay) return;

    const duration = this.videoElement.duration;
    this.durationDisplay.textContent = this.formatTime(duration);

    // Update seek bar max value
    if (this.seekBar) {
      this.seekBar.max = duration.toString();
    }
  }

  /**
   * Update seek bar position
   */
  private updateSeekBar(): void {
    if (!this.videoElement || !this.seekBar) return;

    const currentTime = this.videoElement.currentTime;
    this.seekBar.value = currentTime.toString();
  }

  /**
   * Seek to position
   */
  private seek(): void {
    if (!this.videoElement || !this.seekBar) return;

    const seekTime = parseFloat(this.seekBar.value);
    this.videoElement.currentTime = seekTime;
  }

  /**
   * Update volume
   */
  private updateVolume(): void {
    if (!this.videoElement || !this.volumeControl) return;

    const volume = parseFloat(this.volumeControl.value);
    this.videoElement.volume = volume;

    // Update mute button icon
    if (this.muteButton) {
      this.muteButton.innerHTML = volume === 0 ? '&#128263;' : '&#128266;';
    }
  }

  /**
   * Toggle mute
   */
  private toggleMute(): void {
    if (!this.videoElement || !this.volumeControl || !this.muteButton) return;

    this.videoElement.muted = !this.videoElement.muted;

    // Update mute button icon
    this.muteButton.innerHTML = this.videoElement.muted ? '&#128263;' : '&#128266;';
  }

  /**
   * Update playback speed
   */
  private updatePlaybackSpeed(): void {
    if (!this.videoElement || !this.playbackSpeedSelect) return;

    const speed = parseFloat(this.playbackSpeedSelect.value);
    this.videoElement.playbackRate = speed;
  }

  /**
   * Toggle fullscreen
   */
  private toggleFullscreen(): void {
    if (!this.videoElement) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(error => {
        Logger.error('Error exiting fullscreen:', error);
      });
    } else {
      this.videoElement.requestFullscreen().catch(error => {
        Logger.error('Error entering fullscreen:', error);
      });
    }
  }

  /**
   * Format time in seconds to MM:SS format
   * @param seconds Time in seconds
   * @returns Formatted time string
   */
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Extract video metadata
   */
  private extractVideoMetadata(): void {
    if (!this.videoElement || !this.currentVideoId || !this.currentVideoMetadata) return;

    // Extract metadata from video element
    const duration = this.videoElement.duration;
    const width = this.videoElement.videoWidth;
    const height = this.videoElement.videoHeight;

    // Update metadata in memory
    this.currentVideoMetadata.duration = duration;
    this.currentVideoMetadata.width = width;
    this.currentVideoMetadata.height = height;

    // Update metadata in database
    this.updateVideoMetadata();

    // Generate thumbnail if not already present
    if (!this.currentVideoMetadata.thumbnail) {
      this.generateThumbnail();
    }
  }

  /**
   * Update video metadata in database
   */
  private async updateVideoMetadata(): Promise<void> {
    if (!this.currentVideoId || !this.currentVideoMetadata) return;

    try {
      // Update metadata in database
      await videoDB.videos.update(this.currentVideoId, {
        duration: this.currentVideoMetadata.duration,
        width: this.currentVideoMetadata.width,
        height: this.currentVideoMetadata.height
      });

      Logger.info('Updated video metadata in database');

    } catch (error) {
      Logger.error('Error updating video metadata:', error);
    }
  }

  /**
   * Generate thumbnail from video
   */
  private async generateThumbnail(): Promise<void> {
    if (!this.videoElement || !this.currentVideoId || !this.currentVideoMetadata) return;

    try {
      // Set video to 25% of duration for thumbnail
      const thumbnailTime = this.videoElement.duration * 0.25;
      this.videoElement.currentTime = thumbnailTime;

      // Wait for seek to complete
      await new Promise<void>(resolve => {
        const seeked = () => {
          this.videoElement?.removeEventListener('seeked', seeked);
          resolve();
        };
        this.videoElement?.addEventListener('seeked', seeked);
      });

      // Create canvas and draw video frame
      const canvas = document.createElement('canvas');
      canvas.width = 250; // Thumbnail width
      canvas.height = 150; // Thumbnail height

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Draw video frame to canvas
      ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not create thumbnail blob'));
          }
        }, 'image/jpeg', 0.7); // JPEG with 70% quality
      });

      // Update metadata with thumbnail
      this.currentVideoMetadata.thumbnail = blob;

      // Update in database
      await videoDB.videos.update(this.currentVideoId, {
        thumbnail: blob
      });

      Logger.info('Generated and stored thumbnail');

      // Dispatch event to refresh video list
      document.dispatchEvent(new CustomEvent('video-updated'));

    } catch (error) {
      Logger.error('Error generating thumbnail:', error);
    }
  }

  /**
   * Display video information
   * @param metadata Video metadata
   */
  private displayVideoInfo(metadata: VideoMetadata): void {
    if (!this.metadataContainer) return;

    // Clear previous content
    this.metadataContainer.innerHTML = '';

    // Create title
    const title = document.createElement('h3');
    title.textContent = metadata.name;
    this.metadataContainer.appendChild(title);

    // Create info list
    const infoList = document.createElement('ul');
    infoList.className = 'metadata-list';

    // Add file info
    const fileInfo = document.createElement('li');
    fileInfo.textContent = `File: ${metadata.type}, ${this.formatFileSize(metadata.size)}`;
    infoList.appendChild(fileInfo);

    // Add date info
    const dateInfo = document.createElement('li');
    dateInfo.textContent = `Added: ${new Date(metadata.dateAdded).toLocaleDateString()}`;
    infoList.appendChild(dateInfo);

    // Add resolution info if available
    if (metadata.width && metadata.height) {
      const resolutionInfo = document.createElement('li');
      resolutionInfo.textContent = `Resolution: ${metadata.width}×${metadata.height}`;
      infoList.appendChild(resolutionInfo);
    }

    this.metadataContainer.appendChild(infoList);

    // Add process button for pose detection
    const processButton = document.createElement('button');
    processButton.className = 'process-button';
    processButton.textContent = 'Process for Pose Detection';
    processButton.addEventListener('click', () => {
      if (this.currentVideoId) {
        poseProcessor.processVideo(this.currentVideoId);
      }
    });

    this.metadataContainer.appendChild(processButton);
  }

  /**
   * Format file size for display
   * @param bytes Size in bytes
   * @returns Formatted string (e.g., "1.5 MB")
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
  }

  /**
   * Handle video errors
   * @param event Error event
   */
  private handleVideoError(event: Event): void {
    if (!this.videoElement) return;

    let errorMessage = 'An error occurred during video playback.';

    // Get specific error if available
    if (this.videoElement.error) {
      switch (this.videoElement.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video playback was aborted.';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'A network error caused the video download to fail.';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'The video format is not supported by your browser.';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'The video format is not supported.';
          break;
      }
    }

    Logger.error('Video playback error:', errorMessage);
    alert(`Error: ${errorMessage}`);
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    // Clean up keypoint visualizer
    this.cleanupKeypointVisualizer();

    // Clean up video resources
    if (this.videoElement && this.videoElement.src) {
      URL.revokeObjectURL(this.videoElement.src);
      this.videoElement.src = '';
    }

    // Remove event listeners
    if (this.playPauseButton) {
      this.playPauseButton.removeEventListener('click', this.togglePlayPause);
    }

    // Clear references
    this.videoElement = null;
    this.controlsContainer = null;
    this.metadataContainer = null;
    this.currentVideoId = null;
    this.currentVideoMetadata = null;

    Logger.info('Video player resources disposed');
  }
}

// Create and export a singleton instance
export const videoPlayer = new VideoPlayerComponent();
