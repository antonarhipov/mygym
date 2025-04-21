import { Logger } from './main';
import { videoDB, VideoMetadata } from './database';

/**
 * Video List Component
 * Displays the list of uploaded videos and provides functionality to retrieve and play them
 */
export class VideoListComponent {
  private videoGrid: HTMLElement | null;
  private emptyState: HTMLElement | null;

  constructor() {
    // Get elements
    this.videoGrid = document.querySelector('.video-grid');
    this.emptyState = document.querySelector('.video-grid .empty-state');

    // Set up event listeners
    this.setupEventListeners();

    // Initial load of videos
    this.loadVideos();
  }

  /**
   * Set up event listeners for the component
   */
  private setupEventListeners(): void {
    // Listen for video-added event
    document.addEventListener('video-added', () => {
      this.loadVideos();
    });
  }

  /**
   * Load videos from the database and display them
   */
  private async loadVideos(): Promise<void> {
    try {
      // Get all videos from the database
      const videos = await videoDB.getAllVideos();

      // Update the UI
      this.updateVideoList(videos);

    } catch (error) {
      Logger.error('Error loading videos:', error);
    }
  }

  /**
   * Update the video list in the UI
   * @param videos Array of video metadata
   */
  private updateVideoList(videos: VideoMetadata[]): void {
    if (!this.videoGrid) {
      Logger.error('Video grid element not found');
      return;
    }

    // Show/hide empty state
    if (videos.length === 0) {
      if (this.emptyState) {
        this.emptyState.style.display = 'block';
      }
      return;
    } else if (this.emptyState) {
      this.emptyState.style.display = 'none';
    }

    // Clear existing videos (except empty state)
    const children = Array.from(this.videoGrid.children);
    children.forEach(child => {
      if (!child.classList.contains('empty-state')) {
        this.videoGrid.removeChild(child);
      }
    });

    // Add video cards
    videos.forEach(video => {
      const videoCard = this.createVideoCard(video);
      this.videoGrid.appendChild(videoCard);
    });
  }

  /**
   * Create a video card element
   * @param video Video metadata
   * @returns HTML element for the video card
   */
  private createVideoCard(video: VideoMetadata): HTMLElement {
    // Create card container
    const card = document.createElement('div');
    card.className = 'video-card';
    card.dataset.videoId = video.id?.toString() || '';

    // Create thumbnail/placeholder
    const thumbnail = document.createElement('div');
    thumbnail.className = 'video-thumbnail';

    // If we have a thumbnail, use it, otherwise use a placeholder
    if (video.thumbnail) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(video.thumbnail);
      thumbnail.appendChild(img);
    } else {
      // Create a placeholder with video icon
      thumbnail.innerHTML = '<div class="placeholder-icon">🎬</div>';
    }

    // Create video info
    const info = document.createElement('div');
    info.className = 'video-info';

    // Video name
    const name = document.createElement('h3');
    name.textContent = video.name;
    info.appendChild(name);

    // Video details
    const details = document.createElement('p');
    details.textContent = this.formatVideoDetails(video);
    info.appendChild(details);

    // Add play button
    const playButton = document.createElement('button');
    playButton.className = 'play-button';
    playButton.textContent = 'Play';
    playButton.addEventListener('click', () => this.playVideo(video.id as number));

    // Add delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => this.deleteVideo(video.id as number));

    // Add buttons to a container
    const buttons = document.createElement('div');
    buttons.className = 'video-buttons';
    buttons.appendChild(playButton);
    buttons.appendChild(deleteButton);

    // Assemble card
    card.appendChild(thumbnail);
    card.appendChild(info);
    card.appendChild(buttons);

    return card;
  }

  /**
   * Format video details for display
   * @param video Video metadata
   * @returns Formatted string with video details
   */
  private formatVideoDetails(video: VideoMetadata): string {
    const size = this.formatFileSize(video.size);
    const date = new Date(video.dateAdded).toLocaleDateString();
    return `${size} • Added on ${date}`;
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
   * Play a video
   * @param videoId ID of the video to play
   */
  private async playVideo(videoId: number): Promise<void> {
    try {
      // Use the video player component to play the video
      // This will handle blob retrieval, metadata display, and playback
      import('./videoPlayer').then(({ videoPlayer }) => {
        videoPlayer.playVideo(videoId);

        // Scroll to the analysis section
        const analysisSection = document.getElementById('analysis');
        if (analysisSection) {
          analysisSection.scrollIntoView({ behavior: 'smooth' });
        }
      });

      Logger.info(`Requested playback of video ID: ${videoId}`);

    } catch (error) {
      Logger.error('Error playing video:', error);
      alert('Error playing video. Please try again.');
    }
  }

  /**
   * Delete a video
   * @param videoId ID of the video to delete
   */
  private async deleteVideo(videoId: number): Promise<void> {
    try {
      // Confirm deletion
      if (!confirm('Are you sure you want to delete this video?')) {
        return;
      }

      // Delete from database
      await videoDB.deleteVideo(videoId);

      // Reload videos
      this.loadVideos();

      Logger.info(`Deleted video with ID: ${videoId}`);

    } catch (error) {
      Logger.error('Error deleting video:', error);
      alert('Error deleting video. Please try again.');
    }
  }
}

// Create and export a singleton instance
export const videoList = new VideoListComponent();
