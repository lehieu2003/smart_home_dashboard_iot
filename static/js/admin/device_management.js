// Load devices
function loadDevices() {
  fetch('/api/admin/devices')
    .then((response) => response.json())
    .then((data) => {
      const tbody = document.querySelector('#devices-table tbody');
      tbody.innerHTML = '';

      data.devices.forEach((device) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${device.id}</td>
          <td>${device.name}</td>
          <td>${device.device_type}</td>
          <td>
              <span class="badge bg-${device.status === 'online' ? 'success' : 'secondary'}">
                  ${device.status}
              </span>
          </td>
          <td>${device.room_id}</td>
          <td>${device.last_seen || 'Never'}</td>
          <td>
              <button class="btn btn-sm btn-outline-primary edit-device" data-id="${device.id}">
                  <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger delete-device" data-id="${device.id}">
                  <i class="bi bi-trash"></i>
              </button>
          </td>
        `;
        tbody.appendChild(row);
      });
      
      // Setup device buttons
      setupDeviceButtons();
    })
    .catch((error) => console.error('Error loading devices:', error));
}

// Setup device buttons
function setupDeviceButtons() {
  // Edit device button
  document.querySelectorAll('.edit-device').forEach((button) => {
    button.addEventListener('click', function() {
      const deviceId = this.getAttribute('data-id');
      openDeviceModal(deviceId);
    });
  });

  // Delete device button
  document.querySelectorAll('.delete-device').forEach((button) => {
    button.addEventListener('click', function() {
      const deviceId = this.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this device?')) {
        deleteDevice(deviceId);
      }
    });
  });
}

// Open device modal for add/edit
function openDeviceModal(deviceId = null) {
  const modal = new bootstrap.Modal(document.getElementById('deviceModal'));
  const modalTitle = document.getElementById('deviceModalTitle');
  const deviceForm = document.getElementById('deviceForm');
  
  // Reset form
  deviceForm.reset();
  document.getElementById('deviceId').value = '';
  
  if (deviceId) {
    // Edit mode - fetch device details
    modalTitle.textContent = 'Edit Device';
    fetch(`/api/admin/devices/${deviceId}`)
      .then(response => response.json())
      .then(data => {
        if (data.device) {
          document.getElementById('deviceId').value = data.device.id;
          document.getElementById('deviceName').value = data.device.name;
          document.getElementById('deviceType').value = data.device.device_type;
          document.getElementById('deviceRoom').value = data.device.room_id;
          document.getElementById('deviceStatus').value = data.device.status;
          document.getElementById('deviceManufacturer').value = data.device.manufacturer || '';
          document.getElementById('deviceModel').value = data.device.model || '';
          document.getElementById('deviceSerialNumber').value = data.device.serial_number || '';
        } else {
          console.error('Device not found');
        }
      })
      .catch(error => console.error('Error fetching device:', error));
  } else {
    // Add mode
    modalTitle.textContent = 'Add New Device';
  }
  
  // Show the modal
  modal.show();
}

// Save device (create or update)
function saveDevice() {
  const deviceId = document.getElementById('deviceId').value;
  
  const deviceData = {
    name: document.getElementById('deviceName').value,
    type: document.getElementById('deviceType').value,
    room_id: document.getElementById('deviceRoom').value,
    status: document.getElementById('deviceStatus').value,
    manufacturer: document.getElementById('deviceManufacturer').value,
    model: document.getElementById('deviceModel').value,
    serial_number: document.getElementById('deviceSerialNumber').value
  };
  
  let url = '/api/admin/devices';
  let method = 'POST';
  
  if (deviceId) {
    // Update existing device
    url = `/api/admin/devices/${deviceId}`;
    method = 'PUT';
  }
  
  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(deviceData)
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Close the modal
        const modalElement = document.getElementById('deviceModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        
        // Reload the devices list
        loadDevices();
      } else {
        alert('Error: ' + (data.message || 'Failed to save device'));
      }
    })
    .catch(error => {
      console.error('Error saving device:', error);
      alert('An error occurred while saving the device.');
    });
}

// Delete device
function deleteDevice(deviceId) {
  fetch(`/api/admin/devices/${deviceId}`, {
    method: 'DELETE',
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        loadDevices();
      } else {
        alert('Error: ' + data.message);
      }
    })
    .catch((error) => {
      console.error('Error deleting device:', error);
      alert('An error occurred while deleting the device.');
    });
}

// Initialize device form
function initDeviceForm() {
  // Setup rooms dropdown
  fetch('/api/admin/rooms')
    .then(response => response.json())
    .then(data => {
      if (data.rooms) {
        const roomSelect = document.getElementById('deviceRoom');
        roomSelect.innerHTML = '<option value="">Select Room</option>';
        
        data.rooms.forEach(room => {
          const option = document.createElement('option');
          option.value = room.id;
          option.textContent = `${room.name} (${room.home_name})`;
          roomSelect.appendChild(option);
        });
      }
    })
    .catch(error => console.error('Error loading rooms:', error));
    
  // Device type dropdown options
  const deviceTypeSelect = document.getElementById('deviceType');
  const deviceTypes = ['Light', 'Thermostat', 'Lock', 'Camera', 'Speaker', 'TV', 'Vacuum', 'Other'];
  
  deviceTypeSelect.innerHTML = '<option value="">Select Type</option>';
  deviceTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type.toLowerCase();
    option.textContent = type;
    deviceTypeSelect.appendChild(option);
  });
  
  // Add event listener to save button
  document.getElementById('saveDeviceBtn').addEventListener('click', saveDevice);
  
  // Add event listener to create device button
  document.getElementById('create-device-btn').addEventListener('click', function() {
    openDeviceModal();
  });
}

// Export functions to be used in main admin.js
window.DeviceManagement = {
  loadDevices,
  openDeviceModal,
  saveDevice,
  setupDeviceButtons,
  initDeviceForm
};
