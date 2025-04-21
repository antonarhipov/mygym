import { Logger } from './main';
import { videoDB } from './database';

// Constants for storage management
const STORAGE_WARNING_THRESHOLD = 0.8; // Show warning when 80% of storage is used
const ESTIMATED_QUOTA_MB = 500; // Estimated storage quota in MB (varies by browser)
const ESTIMATED_QUOTA_BYTES = ESTIMATED_QUOTA_MB * 1024 * 1024;

/**
 * Storage Manager Component
 * Handles storage limits and warnings
 */
export class StorageManagerComponent {
  private storageInfoContainer: HTMLElement | null = null;
  
  constructor() {
    // Create storage info container
    this.createStorageInfoContainer();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initial update of storage info
    this.updateStorageInfo();
  }
  
  /**
   * Create storage info container and add it to the DOM
   */
  private createStorageInfoContainer(): void {
    // Create container
    this.storageInfoContainer = document.createElement('div');
    this.storageInfoContainer.className = 'storage-info';
    
    // Create usage bar
    const usageBar = document.createElement('div');
    usageBar.className = 'usage-bar';
    
    const usageBarFill = document.createElement('div');
    usageBarFill.className = 'usage-bar-fill';
    usageBar.appendChild(usageBarFill);
    
    // Create usage text
    const usageText = document.createElement('div');
    usageText.className = 'usage-text';
    
    // Add elements to container
    this.storageInfoContainer.appendChild(usageBar);
    this.storageInfoContainer.appendChild(usageText);
    
    // Add container to the video library section
    const videoLibrary = document.querySelector('.video-library');
    if (videoLibrary) {
      videoLibrary.insertBefore(this.storageInfoContainer, videoLibrary.firstChild.nextSibling);
    } else {
      Logger.error('Video library section not found');
    }
  }
  
  /**
   * Set up event listeners for the component
   */
  private setupEventListeners(): void {
    // Listen for video-added event
    document.addEventListener('video-added', () => {
      this.updateStorageInfo();
    });
    
    // Listen for storage events
    window.addEventListener('storage', () => {
      this.updateStorageInfo();
    });
  }
  
  /**
   * Update storage info display
   */
  private async updateStorageInfo(): Promise<void> {
    try {
      // Get total storage used
      const storageUsed = await videoDB.getTotalStorageUsed();
      
      // Try to get actual quota from browser API if available
      let quota = ESTIMATED_QUOTA_BYTES;
      
      // Update UI
      this.updateStorageUI(storageUsed, quota);
      
    } catch (error) {
      Logger.error('Error updating storage info:', error);
    }
  }
  
  /**
   * Update storage UI elements
   * @param used Storage used in bytes
   * @param quota Storage quota in bytes
   */
  private updateStorageUI(used: number, quota: number): void {
    if (!this.storageInfoContainer) {
      return;
    }
    
    // Calculate usage percentage
    const usagePercentage = Math.min((used / quota) * 100, 100);
    
    // Update usage bar
    const usageBarFill = this.storageInfoContainer.querySelector('.usage-bar-fill');
    if (usageBarFill) {
      usageBarFill.style.width = `${usagePercentage}%`;
      
      // Change color based on usage
      if (usagePercentage > 90) {
        usageBarFill.classList.add('critical');
        usageBarFill.classList.remove('warning');
      } else if (usagePercentage > 70) {
        usageBarFill.classList.add('warning');
        usageBarFill.classList.remove('critical');
      } else {
        usageBarFill.classList.remove('warning', 'critical');
      }
    }
    
    // Update usage text
    const usageText = this.storageInfoContainer.querySelector('.usage-text');
    if (usageText) {
      const usedFormatted = this.formatFileSize(used);
      const quotaFormatted = this.formatFileSize(quota);
      usageText.textContent = `Storage: ${usedFormatted} of ${quotaFormatted} used (${usagePercentage.toFixed(1)}%)`;
    }
    
    // Show warning if approaching limit
    if (used / quota > STORAGE_WARNING_THRESHOLD) {
      this.showStorageWarning(used, quota);
    }
  }
  
  /**
   * Show storage warning
   * @param used Storage used in bytes
   * @param quota Storage quota in bytes
   */
  private showStorageWarning(used: number, quota: number): void {
    const remainingBytes = quota - used;
    const remainingFormatted = this.formatFileSize(remainingBytes);
    
    // Only show warning if not already shown recently (using sessionStorage)
    const lastWarningTime = sessionStorage.getItem('lastStorageWarningTime');
    const now = Date.now();
    
    if (!lastWarningTime || now - parseInt(lastWarningTime) > 1000 * 60 * 10) { // 10 minutes
      Logger.warn(`Storage space running low: ${remainingFormatted} remaining`);
      
      // Create warning element if it doesn't exist
      if (!document.querySelector('.storage-warning')) {
        const warning = document.createElement('div');
        warning.className = 'storage-warning';
        warning.textContent = `Storage space is running low (${remainingFormatted} remaining). Consider deleting some videos.`;
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.textContent = '×';
        closeButton.addEventListener('click', () => {
          warning.remove();
        });
        
        warning.appendChild(closeButton);
        
        // Add to page
        const videoLibrary = document.querySelector('.video-library');
        if (videoLibrary) {
          videoLibrary.insertBefore(warning, videoLibrary.firstChild);
        }
      }
      
      // Update last warning time
      sessionStorage.setItem('lastStorageWarningTime', now.toString());
    }
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
}

// Create and export a singleton instance
export const storageManager = new StorageManagerComponent();