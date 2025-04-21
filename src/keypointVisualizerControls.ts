import { Logger } from './main';
import { keypointVisualizer } from './keypointVisualizer';

/**
 * Keypoint Visualizer Controls Component
 * Provides UI controls for keypoint visualization options
 */
export class KeypointVisualizerControlsComponent {
  private container: HTMLElement | null = null;
  private controlsContainer: HTMLElement | null = null;
  
  constructor() {
    // Initialize when needed
  }
  
  /**
   * Initialize the controls with a container
   * @param container The container element
   */
  public initialize(container: HTMLElement): void {
    this.container = container;
    
    // Create controls
    this.createControls();
    
    Logger.info('Keypoint visualizer controls initialized');
  }
  
  /**
   * Create control elements
   */
  private createControls(): void {
    if (!this.container) return;
    
    // Create controls container
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'keypoint-controls';
    this.controlsContainer.style.marginTop = '1rem';
    this.controlsContainer.style.padding = '1rem';
    this.controlsContainer.style.backgroundColor = '#f5f5f5';
    this.controlsContainer.style.borderRadius = '4px';
    
    // Create title
    const title = document.createElement('h4');
    title.textContent = 'Keypoint Visualization Options';
    title.style.marginTop = '0';
    title.style.marginBottom = '1rem';
    this.controlsContainer.appendChild(title);
    
    // Create toggle for enabling/disabling visualization
    this.createToggleControl(
      'Enable Keypoint Visualization',
      true,
      (isChecked) => {
        keypointVisualizer.setOptions({ isEnabled: isChecked });
      }
    );
    
    // Create body part visibility toggles
    this.createToggleControl(
      'Show Face Keypoints',
      true,
      (isChecked) => {
        keypointVisualizer.toggleBodyPart('face', isChecked);
      }
    );
    
    this.createToggleControl(
      'Show Torso Keypoints',
      true,
      (isChecked) => {
        keypointVisualizer.toggleBodyPart('torso', isChecked);
      }
    );
    
    this.createToggleControl(
      'Show Arm Keypoints',
      true,
      (isChecked) => {
        keypointVisualizer.toggleBodyPart('arms', isChecked);
      }
    );
    
    this.createToggleControl(
      'Show Leg Keypoints',
      true,
      (isChecked) => {
        keypointVisualizer.toggleBodyPart('legs', isChecked);
      }
    );
    
    // Create color pickers
    this.createColorPicker(
      'Keypoint Color',
      '#4a90e2',
      (color) => {
        keypointVisualizer.setOptions({ keypointColor: color });
      }
    );
    
    this.createColorPicker(
      'Skeleton Color',
      '#4a90e2',
      (color) => {
        keypointVisualizer.setOptions({ skeletonColor: color });
      }
    );
    
    // Create size controls
    this.createRangeControl(
      'Keypoint Size',
      1, 10, 6, 1,
      (value) => {
        keypointVisualizer.setOptions({ keypointSize: value });
      }
    );
    
    this.createRangeControl(
      'Skeleton Width',
      1, 5, 2, 0.5,
      (value) => {
        keypointVisualizer.setOptions({ skeletonWidth: value });
      }
    );
    
    // Add controls to container
    this.container.appendChild(this.controlsContainer);
  }
  
  /**
   * Create a toggle control
   * @param label Label text
   * @param initialValue Initial value
   * @param onChange Callback for change event
   */
  private createToggleControl(
    label: string,
    initialValue: boolean,
    onChange: (isChecked: boolean) => void
  ): void {
    if (!this.controlsContainer) return;
    
    // Create container
    const container = document.createElement('div');
    container.style.marginBottom = '0.5rem';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initialValue;
    checkbox.style.marginRight = '0.5rem';
    
    // Create label
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    
    // Add event listener
    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
    });
    
    // Assemble control
    container.appendChild(checkbox);
    container.appendChild(labelElement);
    
    // Add to controls container
    this.controlsContainer.appendChild(container);
  }
  
  /**
   * Create a color picker control
   * @param label Label text
   * @param initialValue Initial value
   * @param onChange Callback for change event
   */
  private createColorPicker(
    label: string,
    initialValue: string,
    onChange: (color: string) => void
  ): void {
    if (!this.controlsContainer) return;
    
    // Create container
    const container = document.createElement('div');
    container.style.marginBottom = '0.5rem';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    
    // Create label
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.marginRight = '0.5rem';
    labelElement.style.flex = '1';
    
    // Create color picker
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = initialValue;
    
    // Add event listener
    colorPicker.addEventListener('input', () => {
      onChange(colorPicker.value);
    });
    
    // Assemble control
    container.appendChild(labelElement);
    container.appendChild(colorPicker);
    
    // Add to controls container
    this.controlsContainer.appendChild(container);
  }
  
  /**
   * Create a range control
   * @param label Label text
   * @param min Minimum value
   * @param max Maximum value
   * @param initialValue Initial value
   * @param step Step value
   * @param onChange Callback for change event
   */
  private createRangeControl(
    label: string,
    min: number,
    max: number,
    initialValue: number,
    step: number,
    onChange: (value: number) => void
  ): void {
    if (!this.controlsContainer) return;
    
    // Create container
    const container = document.createElement('div');
    container.style.marginBottom = '0.5rem';
    
    // Create label
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.display = 'block';
    labelElement.style.marginBottom = '0.25rem';
    
    // Create range input
    const rangeInput = document.createElement('input');
    rangeInput.type = 'range';
    rangeInput.min = min.toString();
    rangeInput.max = max.toString();
    rangeInput.step = step.toString();
    rangeInput.value = initialValue.toString();
    rangeInput.style.width = '100%';
    
    // Create value display
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = initialValue.toString();
    valueDisplay.style.marginLeft = '0.5rem';
    valueDisplay.style.fontSize = '0.9rem';
    valueDisplay.style.color = '#666';
    
    // Add event listener
    rangeInput.addEventListener('input', () => {
      const value = parseFloat(rangeInput.value);
      valueDisplay.textContent = value.toString();
      onChange(value);
    });
    
    // Assemble control
    container.appendChild(labelElement);
    const rangeContainer = document.createElement('div');
    rangeContainer.style.display = 'flex';
    rangeContainer.style.alignItems = 'center';
    rangeContainer.appendChild(rangeInput);
    rangeContainer.appendChild(valueDisplay);
    container.appendChild(rangeContainer);
    
    // Add to controls container
    this.controlsContainer.appendChild(container);
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove controls from DOM
    if (this.controlsContainer && this.controlsContainer.parentElement) {
      this.controlsContainer.parentElement.removeChild(this.controlsContainer);
    }
    
    // Clear references
    this.container = null;
    this.controlsContainer = null;
  }
}

// Create and export a singleton instance
export const keypointVisualizerControls = new KeypointVisualizerControlsComponent();