function displayDevices(devices) {
  const container = document.getElementById('devices-container');

  if (devices.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center">
        <p>No devices found.</p>
      </div>
    `;
    return;
  }

  let html = '';
  devices.forEach((device) => {
    html += `
      <div class="col-md-4 mb-3">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>${device.name}</span>
            <span class="device-status-${device.status.toLowerCase()}">${device.status}</span>
          </div>
          <div class="card-body">
            <p><strong>Type:</strong> ${device.type}</p>
            <p><strong>Last Seen:</strong> ${formatDateTime(device.last_seen)}</p>
            <p><strong>ID:</strong> ${device.device_id}</p>
          </div>
          <div class="card-footer">
            <button class="btn btn-sm btn-primary" onclick="handleDeviceControl('${device.device_id}', 'toggle')">
              Toggle
            </button>
            <a href="#" class="btn btn-sm btn-outline-secondary">Details</a>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return 'Never';
  const date = new Date(dateTimeStr);
  return date.toLocaleString();
}
