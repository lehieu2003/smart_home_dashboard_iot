function fetchDevices() {
  return fetch('/api/devices')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    });
}

function controlDevice(deviceId, action, value = null) {
  // Prepare request data
  const requestData = {
    action: action,
  };

  if (value !== null) {
    requestData.value = value;
  }

  // Make API call
  return fetch(`/api/devices/${deviceId}/control`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    });
}
