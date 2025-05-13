document.addEventListener('DOMContentLoaded', function () {
  // Fetch devices from API
  fetchDevices()
    .then((data) => {
      displayDevices(data.devices);
    })
    .catch((error) => {
      document.getElementById('devices-container').innerHTML = `
        <div class="col-12 text-center">
          <div class="alert alert-danger">
            Error loading devices: ${error.message}
          </div>
        </div>
      `;
    });
});
