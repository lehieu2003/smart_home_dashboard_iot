function handleDeviceControl(deviceId, action, value = null) {
  // Show loading indicator
  const controlButton = event.target;
  const originalText = controlButton.textContent;
  controlButton.disabled = true;
  controlButton.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';

  // Get the feedback message based on the device type and action
  const deviceCard = controlButton.closest('.card');
  const deviceType = deviceCard.querySelector('.card-body p:first-child').textContent.split(':')[1].trim();
  const feedbackMessage = getActionFeedback(deviceType, action, value);

  controlDevice(deviceId, action, value)
    .then((data) => {
      if (data.success) {
        // Update device status in UI without refreshing
        const deviceElement = controlButton.closest('.card');
        const statusElement = deviceElement.querySelector(
          '.card-header .device-status-online, .card-header .device-status-offline'
        );

        if (statusElement) {
          statusElement.textContent = data.device.status;
          statusElement.className = `device-status-${data.device.status.toLowerCase()}`;
        }
        
        // Update input fields based on action type
        updateUIAfterAction(deviceElement, deviceId, action, value);

        // Show success message
        alert(`${feedbackMessage}`);
      } else {
        alert(`Error: ${data.message}`);
      }
    })
    .catch((error) => {
      alert(`Error controlling device: ${error.message}`);
    })
    .finally(() => {
      // Restore button state
      controlButton.disabled = false;
      controlButton.textContent = originalText;
    });
}

function updateUIAfterAction(deviceElement, deviceId, action, value) {
  // Update input fields based on action and value
  if (action === 'temperature') {
    const tempInput = deviceElement.querySelector(`#temp-${deviceId}, #waterTemp-${deviceId}`);
    if (tempInput) {
      if (value === '+1') {
        tempInput.value = parseInt(tempInput.value) + 1;
      } else if (value === '-1') {
        tempInput.value = parseInt(tempInput.value) - 1;
      } else {
        tempInput.value = value;
      }
    }
  }
  
  if (action === 'brightness') {
    const brightnessInput = deviceElement.querySelector(`#brightness-${deviceId}`);
    if (brightnessInput) {
      brightnessInput.value = value;
    }
  }
  
  if (action === 'volume') {
    const volumeInput = deviceElement.querySelector(`#volume-${deviceId}`);
    if (volumeInput) {
      if (value === '+5') {
        volumeInput.value = Math.min(100, parseInt(volumeInput.value || 0) + 5);
      } else if (value === '-5') {
        volumeInput.value = Math.max(0, parseInt(volumeInput.value || 0) - 5);
      } else {
        volumeInput.value = value;
      }
    }
  }
  
  if (action === 'position') {
    const positionInput = deviceElement.querySelector(`#position-${deviceId}`);
    if (positionInput) {
      positionInput.value = value;
    }
  }
}

function getActionFeedback(deviceType, action, value) {
  // Return appropriate feedback message based on device type and action
  switch(deviceType) {
    case 'Light':
      if (action === 'toggle') return `Light turned ${value === 'on' ? 'on' : 'off'}`;
      if (action === 'brightness') return `Brightness set to ${value}%`;
      if (action === 'color') return `Light color changed to ${value}`;
      break;
      
    case 'Thermostat':
      if (action === 'toggle') return `Thermostat turned ${value === 'on' ? 'on' : 'off'}`;
      if (action === 'temperature') return `Temperature set to ${value}°C`;
      if (action === 'mode') return `Mode set to ${value}`;
      break;
      
    case 'Fan':
      if (action === 'toggle') return `Fan turned ${value === 'on' ? 'on' : 'off'}`;
      if (action === 'speed') return `Fan speed set to ${value}`;
      if (action === 'oscillate') return `Oscillation toggled`;
      break;
      
    case 'Smart TV':
      if (action === 'toggle') return `TV turned ${value === 'on' ? 'on' : 'off'}`;
      if (action === 'channel') return `Channel ${value.startsWith('+') ? 'increased' : 'decreased'}`;
      if (action === 'volume') return `Volume ${value.startsWith('+') ? 'increased' : 'decreased'}`;
      if (action === 'source') return `Source changed to ${value}`;
      break;
      
    case 'Camera':
      if (action === 'toggle') return `Camera turned ${value === 'on' ? 'on' : 'off'}`;
      if (action === 'record') return `Recording ${value}ed`;
      if (action === 'snapshot') return `Snapshot taken`;
      if (action === 'pan' || action === 'tilt') return `Camera ${action}ned ${value}`;
      break;
      
    case 'Speaker':
      if (action === 'toggle') return `Speaker turned ${value === 'on' ? 'on' : 'off'}`;
      if (action === 'volume') return `Volume set to ${value}%`;
      if (action === 'play') return `Playback started`;
      if (action === 'pause') return `Playback paused`;
      if (action === 'next' || action === 'prev') return `Playing ${action === 'next' ? 'next' : 'previous'} track`;
      break;
      
    case 'Door Lock':
      if (action === 'toggle' || action === 'lock') return `Door ${value === 'on' || value === true ? 'locked' : 'unlocked'}`;
      if (action === 'accessLogs') return `Access logs retrieved`;
      break;
      
    case 'Window Shade':
      if (action === 'toggle') return `Shade turned ${value === 'on' ? 'on' : 'off'}`;
      if (action === 'position') return `Shade position set to ${value}%`;
      break;
      
    case 'Vacuum':
      if (action === 'toggle') return `Vacuum turned ${value === 'on' ? 'on' : 'off'}`;
      if (action === 'clean') return `Cleaning ${value}ed`;
      if (action === 'mode') return `Cleaning mode set to ${value}`;
      break;
      
    case 'Water Heater':
      if (action === 'toggle') return `Water heater turned ${value === 'on' ? 'on' : 'off'}`;
      if (action === 'temperature') return `Temperature set to ${value}°C`;
      if (action === 'boost') return `Boost mode activated for 30 minutes`;
      break;
      
    default:
      return `Device successfully controlled!`;
  }
  
  return `Device successfully controlled!`;
}
