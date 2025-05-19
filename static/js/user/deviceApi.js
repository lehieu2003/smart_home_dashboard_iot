// Function to fetch all user devices
function fetchDevices() {
  return fetch('/api/devices')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }
      return response.json();
    })
    .then((data) => {
      return data.devices;
    });
}

// Function to control a device
function controlDevice(deviceId, action, value = null) {
  return fetch(`/api/devices/${deviceId}/control`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: action,
      value: value,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to control device');
      }
      return response.json();
    });
}

// Function to get device history/logs
function getDeviceLogs(deviceId) {
  return fetch(`/api/devices/${deviceId}/logs`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch device logs');
      }
      return response.json();
    });
}

// Function to get device sensor data
function getDeviceSensorData(deviceId) {
  return fetch(`/api/devices/${deviceId}/sensor-data`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch sensor data');
      }
      return response.json();
    });
}

// Function to get specific device type controls
function getDeviceTypeControls(deviceType) {
  return fetch(`/api/device-types/${deviceType}/controls`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch device type controls');
      }
      return response.json();
    });
}
