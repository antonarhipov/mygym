import { Logger } from './main';
import { videoDB } from './database';

// Constants for validation
const MAX_VIDEO_SIZE_MB = 100; // Maximum video size in MB
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024; // Convert to bytes
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']; // Allowed MIME types

/**
 * Video upload component
 * Handles file selection, validation, and storage
 */
export class VideoUploadComponent {
  private fileInput: HTMLInputElement;
  private uploadButton: HTMLElement | null;
  
  constructor() {
    // Create file input element
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'video/*';
    this.fileInput.style.display = 'none';
    this.fileInput.multiple = false;
    document.body.appendChild(this.fileInput);
    
    // Get upload button
    this.uploadButton = document.getElementById('upload-video');
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners for the component
   */
  private setupEventListeners(): void {
    // Click on upload button triggers file input
    if (this.uploadButton) {
      this.uploadButton.addEventListener('click', () => {
        this.fileInput.click();
      });
    }
    
    // Handle file selection
    this.fileInput.addEventListener('change', (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.handleFileSelection(files[0]);
      }
    });
  }
  
  /**
   * Handle file selection
   * @param file The selected file
   */
  private async handleFileSelection(file: File): Promise<void> {
    try {
      // Validate file type
      if (!this.validateFileType(file)) {
        this.showError(`Invalid file type. Allowed types: ${ALLOWED_VIDEO_TYPES.join(', ')}`);
        return;
      }
      
      // Validate file size
      if (!this.validateFileSize(file)) {
        this.showError(`File too large. Maximum size: ${MAX_VIDEO_SIZE_MB}MB`);
        return;
      }
      
      // Show loading state
      this.showLoading(true);
      
      // Store the video
      const videoId = await videoDB.addVideo(file);
      
      // Show success message
      this.showSuccess(`Video "${file.name}" uploaded successfully`);
      
      // Refresh video list
      this.refreshVideoList();
      
    } catch (error) {
      Logger.error('Error handling file selection:', error);
      this.showError('An error occurred while processing the video');
    } finally {
      // Reset file input
      this.fileInput.value = '';
      this.showLoading(false);
    }
  }
  
  /**
   * Validate file type
   * @param file The file to validate
   * @returns True if the file type is valid, false otherwise
   */
  private validateFileType(file: File): boolean {
    return ALLOWED_VIDEO_TYPES.includes(file.type);
  }
  
  /**
   * Validate file size
   * @param file The file to validate
   * @returns True if the file size is valid, false otherwise
   */
  private validateFileSize(file: File): boolean {
    return file.size <= MAX_VIDEO_SIZE_BYTES;
  }
  
  /**
   * Show error message
   * @param message The error message to show
   */
  private showError(message: string): void {
    alert(`Error: ${message}`);
    Logger.error(message);
  }
  
  /**
   * Show success message
   * @param message The success message to show
   */
  private showSuccess(message: string): void {
    alert(`Success: ${message}`);
    Logger.info(message);
  }
  
  /**
   * Show/hide loading state
   * @param isLoading Whether loading is in progress
   */
  private showLoading(isLoading: boolean): void {
    if (this.uploadButton) {
      if (isLoading) {
        this.uploadButton.textContent = 'Uploading...';
        this.uploadButton.setAttribute('disabled', 'true');
      } else {
        this.uploadButton.textContent = 'Upload Video';
        this.uploadButton.removeAttribute('disabled');
      }
    }
  }
  
  /**
   * Refresh the video list
   * This will be implemented in the VideoListComponent
   */
  private refreshVideoList(): void {
    // Dispatch a custom event that the video list component will listen for
    const event = new CustomEvent('video-added');
    document.dispatchEvent(event);
  }
}

// Create and export a singleton instance
export const videoUpload = new VideoUploadComponent();