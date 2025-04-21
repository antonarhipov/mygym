import Dexie, { Table } from 'dexie';

/**
 * Video metadata interface
 * Contains information about a stored video
 */
export interface VideoMetadata {
  id?: number; // Auto-incremented primary key
  name: string; // Original filename
  type: string; // MIME type (e.g., 'video/mp4')
  size: number; // File size in bytes
  duration?: number; // Video duration in seconds (if available)
  width?: number; // Video width (if available)
  height?: number; // Video height (if available)
  dateAdded: Date; // Date when the video was added
  thumbnail?: Blob; // Thumbnail image for the video (if generated)
}

/**
 * Video database class
 * Handles all IndexedDB operations for video storage
 */
export class VideoDB extends Dexie {
  // Table definitions
  videos!: Table<VideoMetadata, number>; // Table for video metadata
  videoBlobs!: Table<{ id: number; blob: Blob }, number>; // Table for video blobs

  constructor() {
    super('MyGymVideoDB');
    
    // Define database schema
    this.version(1).stores({
      videos: '++id, name, type, size, dateAdded',
      videoBlobs: 'id'
    });
  }

  /**
   * Add a new video to the database
   * @param file The video file to store
   * @returns Promise resolving to the ID of the stored video
   */
  async addVideo(file: File): Promise<number> {
    try {
      // Create metadata object
      const metadata: VideoMetadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        dateAdded: new Date()
      };
      
      // Store metadata and get ID
      const id = await this.videos.add(metadata);
      
      // Store the video blob with the same ID
      await this.videoBlobs.add({ id, blob: file });
      
      return id;
    } catch (error) {
      console.error('Error adding video to database:', error);
      throw error;
    }
  }

  /**
   * Get all stored videos metadata
   * @returns Promise resolving to an array of video metadata
   */
  async getAllVideos(): Promise<VideoMetadata[]> {
    return this.videos.toArray();
  }

  /**
   * Get a video blob by ID
   * @param id The ID of the video to retrieve
   * @returns Promise resolving to the video blob or undefined if not found
   */
  async getVideoBlob(id: number): Promise<Blob | undefined> {
    const record = await this.videoBlobs.get(id);
    return record?.blob;
  }

  /**
   * Delete a video by ID
   * @param id The ID of the video to delete
   * @returns Promise resolving when the video is deleted
   */
  async deleteVideo(id: number): Promise<void> {
    // Delete both metadata and blob
    await this.transaction('rw', this.videos, this.videoBlobs, async () => {
      await this.videos.delete(id);
      await this.videoBlobs.delete(id);
    });
  }

  /**
   * Get the total storage used by videos
   * @returns Promise resolving to the total size in bytes
   */
  async getTotalStorageUsed(): Promise<number> {
    const videos = await this.videos.toArray();
    return videos.reduce((total, video) => total + video.size, 0);
  }
}

// Create and export a singleton instance
export const videoDB = new VideoDB();