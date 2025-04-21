/**
 * MyGym Application
 * Main entry point for the application
 */

// Import components
import { videoDB } from './database';
import { videoUpload } from './videoUpload';
import { videoList } from './videoList';
import { storageManager } from './storageManager';
import { poseDB } from './poseDatabase';
import { poseProcessor } from './poseProcessor';
import { keypointVisualizer } from './keypointVisualizer';
import { keypointVisualizerControls } from './keypointVisualizerControls';

// Logger utility for consistent logging
export class Logger {
  static log(message: string, data?: any): void {
    console.log(`[MyGym] ${message}`, data || '');
  }

  static error(message: string, error?: any): void {
    console.error(`[MyGym Error] ${message}`, error || '');
  }

  static warn(message: string, data?: any): void {
    console.warn(`[MyGym Warning] ${message}`, data || '');
  }

  static info(message: string, data?: any): void {
    console.info(`[MyGym Info] ${message}`, data || '');
  }
}

// Error handling
export const handleError = (error: Error, context: string): void => {
  Logger.error(`Error in ${context}:`, error);
  // In a production app, we might want to send errors to a monitoring service
};

// Global error handler
window.addEventListener('error', (event) => {
  handleError(event.error, 'window');
  // Prevent the default browser error handling
  event.preventDefault();
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  handleError(new Error(event.reason), 'promise');
  // Prevent the default browser error handling
  event.preventDefault();
});

// Application initialization
const initApp = (): void => {
  try {
    Logger.info('Application initializing');

    // Set up event listeners
    setupEventListeners();

    // Initialize components
    initializeComponents();

    Logger.info('Application initialized successfully');
  } catch (error) {
    handleError(error as Error, 'initialization');
  }
};

// Set up event listeners for the application
const setupEventListeners = (): void => {
  try {
    // Navigation links
    const navLinks = document.querySelectorAll('.main-nav a');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Remove active class from all links
        navLinks.forEach(l => l.classList.remove('active'));
        // Add active class to clicked link
        (e.target as HTMLElement).classList.add('active');

        Logger.log('Navigation link clicked', (e.target as HTMLElement).textContent);
      });
    });
  } catch (error) {
    handleError(error as Error, 'event listeners');
  }
};

// Initialize components
const initializeComponents = (): void => {
  try {
    // The component instances are created when imported
    // This ensures they're initialized in the correct order
    Logger.info('Database initialized:', videoDB !== undefined);
    Logger.info('Video upload component initialized:', videoUpload !== undefined);
    Logger.info('Video list component initialized:', videoList !== undefined);
    Logger.info('Storage manager initialized:', storageManager !== undefined);
    Logger.info('Pose database initialized:', poseDB !== undefined);
    Logger.info('Pose processor initialized:', poseProcessor !== undefined);
    Logger.info('Keypoint visualizer initialized:', keypointVisualizer !== undefined);
    Logger.info('Keypoint visualizer controls initialized:', keypointVisualizerControls !== undefined);
  } catch (error) {
    handleError(error as Error, 'component initialization');
  }
};

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
