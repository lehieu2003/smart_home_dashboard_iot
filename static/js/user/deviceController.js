function handleDeviceControl(deviceId, action, value = null) {
  // Show loading indicator
  const controlButton = event.target;
  const originalText = controlButton.textContent;
  controlButton.disabled = true;
  controlButton.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';

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

        // Show success message
        alert(`Device ${data.device.name} successfully controlled!`);
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
