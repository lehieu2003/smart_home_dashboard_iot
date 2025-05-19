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
            ${getDeviceControls(device)}
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

function getDeviceControls(device) {
  // Get device data (or initialize an empty object)
  const deviceData = device.data || {};
  
  // Default toggle control for all devices
  let controls = `
    <button class="btn btn-sm btn-primary" onclick="handleDeviceControl('${device.device_id}', 'toggle')">
      ${device.status === 'online' ? 'Turn Off' : 'Turn On'}
    </button>
  `;
  
  // Add specific controls based on device type
  switch(device.type) {
    case 'Light':
      controls += `
        <div class="mt-2">
          <label for="brightness-${device.device_id}" class="form-label">Brightness</label>
          <input type="range" class="form-range" min="1" max="100" value="${deviceData.brightness || 50}" id="brightness-${device.device_id}"
            onchange="handleDeviceControl('${device.device_id}', 'brightness', this.value)">
        </div>
        <div class="mt-2 d-flex gap-2">
          <button class="btn btn-sm btn-outline-warning ${deviceData.color === 'warm' ? 'active' : ''}" onclick="handleDeviceControl('${device.device_id}', 'color', 'warm')">Warm</button>
          <button class="btn btn-sm btn-outline-primary ${deviceData.color === 'cool' ? 'active' : ''}" onclick="handleDeviceControl('${device.device_id}', 'color', 'cool')">Cool</button>
          <button class="btn btn-sm btn-outline-success ${deviceData.color === 'natural' ? 'active' : ''}" onclick="handleDeviceControl('${device.device_id}', 'color', 'natural')">Natural</button>
        </div>
      `;
      break;
    case 'Thermostat':
      controls += `
        <div class="mt-2">
          <div class="d-flex align-items-center">
            <button class="btn btn-sm btn-outline-primary" onclick="handleDeviceControl('${device.device_id}', 'temperature', '-1')">-</button>
            <input type="number" class="form-control form-control-sm mx-2" id="temp-${device.device_id}" value="${deviceData.temperature || 22}" min="16" max="30"
              onchange="handleDeviceControl('${device.device_id}', 'temperature', this.value)">
            <button class="btn btn-sm btn-outline-danger" onclick="handleDeviceControl('${device.device_id}', 'temperature', '+1')">+</button>
          </div>
        </div>
        <div class="mt-2 btn-group w-100">
          <button class="btn btn-sm btn-outline-secondary ${deviceData.mode === 'cool' ? 'active' : ''}" onclick="handleDeviceControl('${device.device_id}', 'mode', 'cool')">Cool</button>
          <button class="btn btn-sm btn-outline-secondary ${deviceData.mode === 'heat' ? 'active' : ''}" onclick="handleDeviceControl('${device.device_id}', 'mode', 'heat')">Heat</button>
          <button class="btn btn-sm btn-outline-secondary ${deviceData.mode === 'auto' ? 'active' : ''}" onclick="handleDeviceControl('${device.device_id}', 'mode', 'auto')">Auto</button>
        </div>
      `;
      break;
    case 'Fan':
      controls += `
        <div class="mt-2">
          <label for="speed-${device.device_id}" class="form-label">Fan Speed</label>
          <div class="btn-group w-100">
            <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'speed', 'low')">Low</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'speed', 'medium')">Medium</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'speed', 'high')">High</button>
          </div>
        </div>
        <div class="mt-2">
          <button class="btn btn-sm btn-outline-secondary w-100" onclick="handleDeviceControl('${device.device_id}', 'oscillate')">
            Toggle Oscillation
          </button>
        </div>
      `;
      break;
    case 'Smart TV':
      controls += `
        <div class="mt-2 d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'channel', '-1')">Ch-</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'volume', '-5')">Vol-</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'volume', '+5')">Vol+</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'channel', '+1')">Ch+</button>
        </div>
        <div class="mt-2">
          <select class="form-select form-select-sm" onchange="handleDeviceControl('${device.device_id}', 'source', this.value)">
            <option value="">Select Source</option>
            <option value="hdmi1">HDMI 1</option>
            <option value="hdmi2">HDMI 2</option>
            <option value="usb">USB</option>
            <option value="netflix">Netflix</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
      `;
      break;
    case 'Camera':
      controls += `
        <div class="mt-2 d-flex gap-2">
          <button class="btn btn-sm btn-outline-danger" onclick="handleDeviceControl('${device.device_id}', 'record', 'start')">Record</button>
          <button class="btn btn-sm btn-outline-primary" onclick="handleDeviceControl('${device.device_id}', 'snapshot')">Snapshot</button>
        </div>
        <div class="mt-2">
          <div class="btn-group w-100">
            <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'pan', 'left')">←</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'tilt', 'up')">↑</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'tilt', 'down')">↓</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'pan', 'right')">→</button>
          </div>
        </div>
      `;
      break;
    case 'Speaker':
      controls += `
        <div class="mt-2">
          <label for="volume-${device.device_id}" class="form-label">Volume</label>
          <input type="range" class="form-range" min="0" max="100" value="30" id="volume-${device.device_id}"
            onchange="handleDeviceControl('${device.device_id}', 'volume', this.value)">
        </div>
        <div class="mt-2 btn-group w-100">
          <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'prev')">⏮</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'play')">▶</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'pause')">⏸</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'next')">⏭</button>
        </div>
      `;
      break;
    case 'Door Lock':
      controls += `
        <div class="mt-2">
          <button class="btn w-100 ${device.status === 'online' ? 'btn-danger' : 'btn-success'}" 
            onclick="handleDeviceControl('${device.device_id}', 'lock')">
            ${device.status === 'online' ? 'Lock Door' : 'Unlock Door'}
          </button>
        </div>
        <div class="mt-2">
          <button class="btn btn-sm btn-outline-secondary w-100" onclick="handleDeviceControl('${device.device_id}', 'accessLogs')">
            Access Logs
          </button>
        </div>
      `;
      break;
    case 'Window Shade':
      controls += `
        <div class="mt-2">
          <label for="position-${device.device_id}" class="form-label">Shade Position</label>
          <input type="range" class="form-range" min="0" max="100" value="50" id="position-${device.device_id}"
            onchange="handleDeviceControl('${device.device_id}', 'position', this.value)">
        </div>
        <div class="mt-2 d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary flex-grow-1" onclick="handleDeviceControl('${device.device_id}', 'position', '0')">Fully Open</button>
          <button class="btn btn-sm btn-outline-secondary flex-grow-1" onclick="handleDeviceControl('${device.device_id}', 'position', '100')">Fully Closed</button>
        </div>
      `;
      break;
    case 'Vacuum':
      controls += `
        <div class="mt-2">
          <div class="btn-group w-100">
            <button class="btn btn-sm btn-outline-primary" onclick="handleDeviceControl('${device.device_id}', 'clean', 'start')">Start</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="handleDeviceControl('${device.device_id}', 'clean', 'pause')">Pause</button>
            <button class="btn btn-sm btn-outline-danger" onclick="handleDeviceControl('${device.device_id}', 'clean', 'stop')">Stop</button>
          </div>
        </div>
        <div class="mt-2">
          <select class="form-select form-select-sm" onchange="handleDeviceControl('${device.device_id}', 'mode', this.value)">
            <option value="auto">Auto Clean</option>
            <option value="spot">Spot Clean</option>
            <option value="edge">Edge Clean</option>
            <option value="custom">Custom Path</option>
          </select>
        </div>
      `;
      break;
    case 'Water Heater':
      controls += `
        <div class="mt-2">
          <div class="d-flex align-items-center">
            <button class="btn btn-sm btn-outline-primary" onclick="handleDeviceControl('${device.device_id}', 'temperature', '-1')">-</button>
            <input type="number" class="form-control form-control-sm mx-2" id="waterTemp-${device.device_id}" value="50" min="30" max="80"
              onchange="handleDeviceControl('${device.device_id}', 'temperature', this.value)">
            <button class="btn btn-sm btn-outline-danger" onclick="handleDeviceControl('${device.device_id}', 'temperature', '+1')">+</button>
          </div>
        </div>
        <div class="mt-2">
          <button class="btn btn-sm btn-outline-warning w-100" onclick="handleDeviceControl('${device.device_id}', 'boost')">
            Boost (30 min)
          </button>
        </div>
      `;
      break;
    default:
      controls += `
        <a href="#" class="btn btn-sm btn-outline-secondary ml-2">Details</a>
      `;
  }
  
  return controls;
}
