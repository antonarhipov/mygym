import Dexie, { Table } from 'dexie';
import { videoDB } from './database';
import { KeypointData } from './poseDetection';
import { Logger } from './main';

/**
 * Pose Database class
 * Extends the video database to include pose keypoint data
 */
export class PoseDB extends Dexie {
  // Table definitions
  keypointData!: Table<KeypointData, number>; // Table for pose keypoint data

  constructor() {
    super('MyGymPoseDB');
    
    // Define database schema
    this.version(1).stores({
      keypointData: '++id, videoId, timestamp'
    });
  }

  /**
   * Store keypoint data for a video
   * @param videoId ID of the video
   * @param keypointData Array of keypoint data to store
   * @returns Promise resolving to an array of stored keypoint data IDs
   */
  async storeKeypointData(videoId: number, keypointData: KeypointData[]): Promise<number[]> {
    try {
      // Verify that the video exists
      const videoExists = await videoDB.videos.get(videoId);
      if (!videoExists) {
        throw new Error(`Video with ID ${videoId} not found`);
      }

      // Set videoId for all keypoint data
      const dataToStore = keypointData.map(data => ({
        ...data,
        videoId
      }));

      // Store keypoint data in a transaction
      const ids = await this.transaction('rw', this.keypointData, async () => {
        // Delete any existing keypoint data for this video
        await this.keypointData.where({ videoId }).delete();
        
        // Add new keypoint data
        return await Promise.all(dataToStore.map(data => this.keypointData.add(data)));
      });

      Logger.info(`Stored ${ids.length} keypoint data entries for video ${videoId}`);
      return ids;
    } catch (error) {
      Logger.error('Error storing keypoint data:', error);
      throw error;
    }
  }

  /**
   * Get keypoint data for a video
   * @param videoId ID of the video
   * @returns Promise resolving to an array of keypoint data
   */
  async getKeypointData(videoId: number): Promise<KeypointData[]> {
    try {
      return await this.keypointData.where({ videoId }).toArray();
    } catch (error) {
      Logger.error('Error getting keypoint data:', error);
      throw error;
    }
  }

  /**
   * Get keypoint data for a video at a specific timestamp
   * @param videoId ID of the video
   * @param timestamp Timestamp in seconds
   * @param tolerance Tolerance in seconds (default: 0.1)
   * @returns Promise resolving to the closest keypoint data or undefined if not found
   */
  async getKeypointDataAtTime(videoId: number, timestamp: number, tolerance = 0.1): Promise<KeypointData | undefined> {
    try {
      // Get all keypoint data for the video
      const allData = await this.keypointData.where({ videoId }).toArray();
      
      // Find the closest keypoint data to the timestamp
      let closestData: KeypointData | undefined;
      let minDiff = Number.MAX_VALUE;
      
      for (const data of allData) {
        const diff = Math.abs(data.timestamp - timestamp);
        if (diff < minDiff) {
          minDiff = diff;
          closestData = data;
        }
      }
      
      // Return the closest data if within tolerance
      if (closestData && minDiff <= tolerance) {
        return closestData;
      }
      
      return undefined;
    } catch (error) {
      Logger.error('Error getting keypoint data at time:', error);
      throw error;
    }
  }

  /**
   * Delete keypoint data for a video
   * @param videoId ID of the video
   * @returns Promise resolving to the number of deleted entries
   */
  async deleteKeypointData(videoId: number): Promise<number> {
    try {
      const count = await this.keypointData.where({ videoId }).delete();
      Logger.info(`Deleted ${count} keypoint data entries for video ${videoId}`);
      return count;
    } catch (error) {
      Logger.error('Error deleting keypoint data:', error);
      throw error;
    }
  }

  /**
   * Check if a video has keypoint data
   * @param videoId ID of the video
   * @returns Promise resolving to true if the video has keypoint data
   */
  async hasKeypointData(videoId: number): Promise<boolean> {
    try {
      const count = await this.keypointData.where({ videoId }).count();
      return count > 0;
    } catch (error) {
      Logger.error('Error checking for keypoint data:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const poseDB = new PoseDB();