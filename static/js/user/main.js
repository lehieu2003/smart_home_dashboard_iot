document.addEventListener('DOMContentLoaded', function() {
  // Only load devices if the user is logged in
  const devicesContainer = document.getElementById('devices-container');
  if (devicesContainer) {
    loadDevices();
  }
});

// Function to load and display devices
function loadDevices() {
  fetchDevices()
    .then((devices) => {
      displayDevices(devices);
    })
    .catch((error) => {
      const container = document.getElementById('devices-container');
      container.innerHTML = `
        <div class="col-12 text-center">
          <p class="text-danger">Error loading devices: ${error.message}</p>
          <button class="btn btn-primary" onclick="loadDevices()">Retry</button>
        </div>
      `;
    });
}

// Function to refresh devices data
function refreshDevices() {
  const container = document.getElementById('devices-container');
  container.innerHTML = `
    <div class="col-12 text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p>Refreshing devices...</p>
    </div>
  `;
  
  loadDevices();
}
