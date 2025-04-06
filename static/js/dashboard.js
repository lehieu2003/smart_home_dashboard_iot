// Ensure we're using the global deviceData store
window.smartHome = window.smartHome || {};
window.smartHome.deviceData = window.smartHome.deviceData || {};
// Remove the incorrect variable declaration and reference the global namespace instead
let charts = {};

// Document ready function
document.addEventListener("DOMContentLoaded", function () {
  console.log("Dashboard page loaded");

  // Initialize device controls
  initializeDeviceControls();

  // Load device statistics
  loadDeviceStatistics();

  // Verify device counts and update UI if needed
  verifyDeviceContent();

  // Make sure dashboard stats are visible if devices exist
  ensureDashboardStatsVisibility();

  // Initialize any charts on the page
  initializeCharts();

  // Setup refresh button if it exists
  const refreshBtn = document.getElementById("refreshDataBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      loadDeviceStatistics();
      refreshChartData();
    });
  }
});

// Format timestamp for consistent display
function formatTimestamp(timestamp) {
  if (!timestamp) return "unknown";

  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;

    if (isNaN(diffMs)) return "unknown";

    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) {
      return "just now";
    } else if (diffSec < 3600) {
      const minutes = Math.floor(diffSec / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffSec < 86400) {
      // 24 hours
      const hours = Math.floor(diffSec / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleString();
    }
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return "unknown";
  }
}

// Update device UI with new data
function updateDeviceUI(deviceId, data) {
  if (!deviceId || !data) return;

  try {
    // Update value displays
    const valueDisplays = document.querySelectorAll(
      `.value-display[data-device-id="${deviceId}"]`
    );
    if (data.value !== undefined && valueDisplays.length > 0) {
      const valueStr =
        typeof data.value === "number" ? data.value.toFixed(1) : data.value;
      valueDisplays.forEach((display) => {
        display.textContent = valueStr;
      });
    }

    // Update last seen timestamps
    const timestamp = data.timestamp || new Date().toISOString();
    const lastSeenElements = document.querySelectorAll(
      `.last-updated-time[data-device-id="${deviceId}"]`
    );
    lastSeenElements.forEach((element) => {
      element.textContent = formatTimestamp(timestamp);
    });
  } catch (e) {
    console.error("Error updating device UI:", e);
  }
}

function updateDeviceStatus(deviceId, status) {
  if (!deviceId || !status) return;

  try {
    // Update status indicators
    const statusIndicators = document.querySelectorAll(
      `.device-status[data-device-id="${deviceId}"]`
    );
    statusIndicators.forEach((indicator) => {
      indicator.className = `device-status ${status.toLowerCase()}`;
      indicator.setAttribute("data-status", status);
    });
  } catch (e) {
    console.error("Error updating device status:", e);
  }
}

// Initialize device controls
function initializeDeviceControls() {
  // Setup toggle switches
  const toggleSwitches = document.querySelectorAll(".device-toggle");
  toggleSwitches.forEach((toggle) => {
    toggle.addEventListener("change", function () {
      const deviceId = this.getAttribute("data-device-id");
      const action = this.checked ? "on" : "off";

      controlDevice(deviceId, action);
    });
  });

  // Setup control buttons (like thermostats, dimmers, etc)
  const controlButtons = document.querySelectorAll(".device-control-btn");
  controlButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const deviceId = this.getAttribute("data-device-id");
      const action = this.getAttribute("data-action");
      const valueInput = document.querySelector(
        `input[data-device-id="${deviceId}"]`
      );

      let value = null;
      if (valueInput) {
        value = valueInput.value;
      }

      controlDevice(deviceId, action, value);
    });
  });
}

// Update controlDevice to use the existing '/api/devices/{deviceId}/control' endpoint
function controlDevice(deviceId, action, value = null) {
  if (!deviceId || !action) return;

  // Use the existing API endpoint
  const payload = {
    action: action,
    value: value,
  };

  fetch(`/api/devices/${deviceId}/control`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        console.log(`Device ${deviceId} control success:`, data.message);
      } else {
        console.error(`Device ${deviceId} control failed:`, data.message);
      }
    })
    .catch((error) => {
      console.error(`Error controlling device ${deviceId}:`, error);
    });
}

// Replace the loadDeviceStatistics function to better handle the "no devices" message
function loadDeviceStatistics() {
  console.log("Loading device statistics");

  // Use the existing '/api/user/devices' endpoint that already exists in app.py
  fetch("/api/user/devices", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        const deviceCount = data.devices?.length || 0;
        console.log(`API retrieved ${deviceCount} devices`);

        // IMMEDIATE ACTION: If we have devices, hide the "no devices" message
        if (deviceCount > 0) {
          hideNoDevicesMessage();
        }

        // Update all device counters with the correct count from API
        updateDeviceCountsDisplay(deviceCount);

        // Update API device counter (NEW)
        const apiDeviceCountEl = document.getElementById("api-device-count");
        if (apiDeviceCountEl && deviceCount > 0) {
          apiDeviceCountEl.textContent = deviceCount;
          if (typeof window.apiDevicesLoaded === "function") {
            window.apiDevicesLoaded(deviceCount);
          }

          // Ensure floor navigation works properly
          ensureFloorNavigationExists(data.devices);
        }

        // If we have devices in the API, always hide the "no devices" message
        if (deviceCount > 0) {
          // More aggressively hide all variations of "no devices" messages
          hideNoDevicesMessage();

          // Show dashboard stats container if it exists
          let dashboardStats = document.querySelector(".dashboard-stats");
          if (dashboardStats) {
            dashboardStats.style.display = "flex";
            console.log("Making dashboard stats visible");
          }

          // Make sure all floor containers are visible
          const floorContainers = document.querySelectorAll(".floor-container");
          if (floorContainers.length > 0) {
            // Make sure at least one is active
            let hasActiveFloor = false;
            floorContainers.forEach((container) => {
              if (container.classList.contains("active")) {
                container.style.display = "block";
                hasActiveFloor = true;
              }
            });

            // If no floor is active, activate the first one
            if (!hasActiveFloor && floorContainers.length > 0) {
              floorContainers[0].classList.add("active");
              floorContainers[0].style.display = "block";

              // Also activate the corresponding button
              const firstFloorNumber = floorContainers[0].id.replace(
                "floor-",
                ""
              );
              const floorButton = document.querySelector(
                `.floor-button[data-floor="${firstFloorNumber}"]`
              );
              if (floorButton) {
                floorButton.classList.add("active");
              }
            }
          }
        }

        // Make sure we update device stats with the real data
        updateDeviceStatistics(data.devices);

        // Verify DOM vs API device counts
        const domDevices = document.querySelectorAll(".device-card");
        if (deviceCount > 0 && domDevices.length !== deviceCount) {
          console.warn(
            `Mismatch between API (${deviceCount}) and DOM (${domDevices.length}) device counts`
          );

          // Try to force UI to show correct count
          const totalDevicesEl = document.getElementById("totalDevices");
          if (totalDevicesEl) {
            totalDevicesEl.textContent = deviceCount;
          }

          // Add a visual indicator of the mismatch if it's significant
          if (Math.abs(domDevices.length - deviceCount) > 5) {
            const tempAlert = document.createElement("div");
            tempAlert.className =
              "alert alert-warning w-100 mt-3 count-mismatch-alert";
            tempAlert.innerHTML = `
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Count Mismatch:</strong> API shows ${deviceCount} devices but UI is displaying ${domDevices.length}.
                        <button class="btn btn-sm btn-outline-dark ms-3" onclick="window.location.reload()">Refresh Page</button>
                    `;

            // Only add if not already present
            if (!document.querySelector(".count-mismatch-alert")) {
              const dashboardStats = document.querySelector(".dashboard-stats");
              if (dashboardStats && dashboardStats.parentNode) {
                dashboardStats.parentNode.insertBefore(
                  tempAlert,
                  dashboardStats.nextSibling
                );
              }
            }
          }
        }

        // Trigger HomeAccess check
        checkHomeAccess();
      } else {
        console.error(
          "Error loading device statistics:",
          data.message || "Unknown error"
        );
      }
    })
    .catch((error) => {
      console.error("Error fetching device data:", error);
    });

  // The following conditional blocks should be inside the .then() callback above,
  // moving them to a function that will be called with the API data
  function processApiVsDomDevices(apiDevices, domDevices) {
    if (apiDevices.length === 0 && domDevices.length > 0) {
      console.warn("UI shows devices but API returned none!");
    } else if (apiDevices.length > 0 && domDevices.length > 0) {
      console.log("Both API and DOM have devices, checking if counts match");

      // Even if DOM has some devices, check if the counts match
      if (apiDevices.length !== domDevices.length) {
        console.warn(
          `Count mismatch: API has ${apiDevices.length} devices but DOM shows ${domDevices.length}`
        );
        if (window.showToast) {
          window.showToast(
            `Device count mismatch: API shows ${apiDevices.length} but UI displays ${domDevices.length}. Some devices may be missing.`,
            "warning"
          );
        }
      }
    }
  }
}

// Enhanced function to hide the "no devices" message more reliably
function hideNoDevicesMessage() {
  // Target all alert messages that could contain the "no devices" message
  const noDevicesMessages = document.querySelectorAll(".alert");

  noDevicesMessages.forEach((message) => {
    // Check if the message contains any of these phrases
    const messageText = message.textContent.toLowerCase();
    if (
      messageText.includes("doesn't have any devices registered") ||
      messageText.includes("no devices") ||
      messageText.includes("contact the administrator to set up") ||
      messageText.includes("doesn't have any devices") ||
      messageText.includes("no devices found")
    ) {
      console.log(
        'Found and hiding "no devices" message:',
        messageText.substring(0, 30) + "..."
      );
      message.style.display = "none";

      // Add more aggressive CSS to ensure it stays hidden
      message.style.cssText =
        "display: none !important; visibility: hidden !important;";

      // Also add a special class to mark it as hidden
      message.classList.add("no-devices-hidden");
    }
  });

  // Specifically target the element with ID "no-devices-message"
  const specificNoDevicesMsg = document.getElementById("no-devices-message");
  if (specificNoDevicesMsg) {
    specificNoDevicesMsg.style.display = "none";
    specificNoDevicesMsg.style.cssText =
      "display: none !important; visibility: hidden !important;";
    console.log('Explicitly hiding element with ID "no-devices-message"');
  }

  // Add a style tag to ensure the message stays hidden
  if (!document.getElementById("hide-no-devices-style")) {
    const style = document.createElement("style");
    style.id = "hide-no-devices-style";
    style.textContent = `
            #no-devices-message, 
            .alert.no-devices-hidden,
            .alert:contains("doesn't have any devices registered") {
                display: none !important;
                visibility: hidden !important;
            }
        `;
    document.head.appendChild(style);
  }
}

// Enhanced function to ensure dashboard stats visibility with better debugging and dynamic creation
function ensureDashboardStatsVisibility() {
  // First check if we are on a dashboard with device data
  const deviceCards = document.querySelectorAll(".device-card");
  const deviceCardContainers = document.querySelectorAll(
    ".device-card-container"
  );
  const floorContainers = document.querySelectorAll(".floor-container");

  // Get dashboard stats element
  let dashboardStats = document.querySelector(".dashboard-stats");

  // Get the no devices alert if it exists
  const noDevicesAlert = document.querySelector(".alert.alert-info");
  if (noDevicesAlert) {
    console.log(
      `Found "no devices" message: "${noDevicesAlert.textContent.trim()}"`
    );
    console.log(
      `No devices alert display state: ${
        window.getComputedStyle(noDevicesAlert).display
      }`
    );
  } else {
    console.log('No "no devices" alert found in DOM');
  }

  // Multiple ways to detect if we have devices
  const totalDevices = deviceCards.length;
  let hasDevices = totalDevices > 0;

  // Also check total_devices from server-side rendered variable
  const totalDeviceValue = document.getElementById("totalDevices");
  if (totalDeviceValue && parseInt(totalDeviceValue.textContent) > 0) {
    hasDevices = true;
    console.log(
      `Detected devices from counter element: ${totalDeviceValue.textContent}`
    );
  }

  // Check if device containers exist even if cards aren't properly rendered
  const containerCount = deviceCardContainers.length;
  if (containerCount > 0) {
    console.log(`Found ${containerCount} device container elements`);
    hasDevices = true;
  }

  // Check total_devices from debug script
  let scriptDeviceCount = 0;
  try {
    const scriptContents = Array.from(document.querySelectorAll("script"))
      .map((s) => s.textContent)
      .find((text) => text && text.includes("Total devices:"));

    if (scriptContents) {
      const match = scriptContents.match(/Total devices: (\d+)/);
      if (match && parseInt(match[1]) > 0) {
        scriptDeviceCount = parseInt(match[1]);
        hasDevices = true;
        console.log(
          `Verified from debug script: ${scriptDeviceCount} devices exist`
        );
      } else {
        console.log("Debug script found but no device count matched");
      }
    } else {
      console.log("No debug script with device count found");
    }
  } catch (e) {
    console.error("Error checking debug info:", e);
  }

  // Try to get device count from API if we haven't determined we have devices yet
  if (!hasDevices && !window.deviceApiChecked) {
    console.log("No devices found in DOM, checking API directly");
    window.deviceApiChecked = true;

    // Fetch device data directly from API
    fetch("/api/user/devices", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.devices && data.devices.length > 0) {
          console.log(
            `API confirms ${data.devices.length} devices exist, forcing display fix`
          );
          forceShowDevicesUI(data.devices.length);
        } else {
          console.log("API confirms no devices exist");
        }
      })
      .catch((error) => {
        console.error("Error checking device API:", error);
      });
  }

  console.log(
    `Device visibility check summary: hasDevices=${hasDevices}, totalDevices=${totalDevices}, scriptDeviceCount=${scriptDeviceCount}`
  );

  if (hasDevices && dashboardStats) {
    // Force the dashboard stats to be visible
    dashboardStats.style.display = "flex";
    console.log("Forced dashboard stats to be visible");

    // Hide the no devices message if it exists
    if (
      noDevicesAlert &&
      (noDevicesAlert.textContent.includes(
        "doesn't have any devices registered yet"
      ) ||
        noDevicesAlert.textContent.includes("No devices found") ||
        noDevicesAlert.textContent.includes("no devices"))
    ) {
      noDevicesAlert.style.display = "none";
      console.log('Hidden incorrect "no devices" message');
    }

    // Make sure all floor containers are visible
    floorContainers.forEach((container) => {
      if (
        container.classList.contains("active") &&
        container.style.display === "none"
      ) {
        container.style.display = "block";
        console.log("Fixed visibility of floor container:", container.id);
      }
    });

    // Update device count stats if needed
    const displayCount = Math.max(
      totalDevices,
      parseInt(totalDeviceValue?.textContent || "0"),
      scriptDeviceCount
    );
    updateDeviceCountsDisplay(displayCount);

    // Show toast notification if we fixed a visibility issue
    if (
      window.showToast &&
      noDevicesAlert &&
      window.getComputedStyle(noDevicesAlert).display !== "none"
    ) {
      window.showToast(
        "Fixed UI display issue - devices exist but were not being shown",
        "success"
      );
    }
  } else if (noDevicesAlert) {
    // We really don't have devices, make sure the message is visible
    noDevicesAlert.style.display = "block";
    if (dashboardStats) {
      dashboardStats.style.display = "none";
    }
  }
}

// New function to force show the UI when devices exist according to API
function forceShowDevicesUI(deviceCount) {
  console.log(`Forcing UI to show ${deviceCount} devices`);

  // First and most importantly - hide all no devices messages
  hideNoDevicesMessage();

  // Get key UI elements
  const dashboardStats = document.querySelector(".dashboard-stats");
  const noDevicesAlert = document.querySelector(".alert.alert-info");
  const floorContainers = document.querySelectorAll(".floor-container");

  // Hide the "no devices" message
  if (noDevicesAlert) {
    noDevicesAlert.style.display = "none";
    console.log('Hidden "no devices" message');
  }

  // Show the dashboard stats
  if (dashboardStats) {
    dashboardStats.style.display = "flex";
    console.log("Forced dashboard stats visible");

    // Update total devices count
    const totalDevicesEl = document.getElementById("totalDevices");
    if (totalDevicesEl) {
      totalDevicesEl.textContent = deviceCount;
    }

    // Update online devices count (estimate)
    const onlineDevicesEl = document.getElementById("onlineDevices");
    if (onlineDevicesEl) {
      onlineDevicesEl.textContent = Math.ceil(deviceCount * 0.8); // Assume 80% online
    }
  }

  // Show floor containers
  if (floorContainers.length > 0) {
    floorContainers.forEach((container) => {
      if (container.classList.contains("active")) {
        container.style.display = "block";
        container.style.opacity = "1";
      }
    });
    console.log("Made floor containers visible");
  } else {
    console.log("No floor containers found - creating floor navigation");
    createFloorStructure();
    ensureFloorNavigationExists([
      {
        floor: 1,
        floor_name: "Ground Floor",
        device_id: "temp1",
        type: "generic",
      },
    ]);
  }

  // Force filter button to show if it exists
  const showFilterBtn = document.getElementById("showFilterBtn");
  if (showFilterBtn) {
    showFilterBtn.style.display = "block";
  }

  // Try to create floor navigation if missing
  ensureFloorNavigationExists([
    { floor: 1, floor_name: "Ground Floor", count: deviceCount },
  ]);

  // Show toast with refresh suggestion
  if (window.showToast) {
    window.showToast(
      `API shows ${deviceCount} devices exist. UI updated to show device information.`,
      "success"
    );
  }

  // Add MutationObserver to keep no devices message hidden
  const observer = new MutationObserver(function (mutations) {
    hideNoDevicesMessage();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  // Set a flag to indicate we've already forced UI
  window.deviceUIForced = true;
}

// Add new function to specifically target and hide any "no devices" message
function hideNoDevicesMessage() {
  // Target all alert messages that could contain the "no devices" message
  const noDevicesMessages = document.querySelectorAll(".alert");

  noDevicesMessages.forEach((message) => {
    // Check if the message contains any of these phrases
    const messageText = message.textContent.toLowerCase();
    if (
      messageText.includes("doesn't have any devices registered") ||
      messageText.includes("no devices") ||
      messageText.includes("contact the administrator to set up") ||
      messageText.includes("doesn't have any devices") ||
      messageText.includes("no devices found")
    ) {
      console.log(
        'Found and hiding "no devices" message:',
        messageText.substring(0, 30) + "..."
      );
      message.style.display = "none";

      // Also add a special class to mark it as hidden
      message.classList.add("no-devices-hidden");
    }
  });

  // Specifically target the element with ID "no-devices-message"
  const specificNoDevicesMsg = document.getElementById("no-devices-message");
  if (specificNoDevicesMsg) {
    specificNoDevicesMsg.style.display = "none";
    console.log('Explicitly hiding element with ID "no-devices-message"');
  }
}

// Enhanced function to ensure dashboard stats visibility with better debugging and dynamic creation
function ensureDashboardStatsVisibility() {
  // First check if we are on a dashboard with device data
  const deviceCards = document.querySelectorAll(".device-card");
  const deviceCardContainers = document.querySelectorAll(
    ".device-card-container"
  );
  const floorContainers = document.querySelectorAll(".floor-container");

  // Get dashboard stats element
  let dashboardStats = document.querySelector(".dashboard-stats");

  // Multiple ways to detect if we have devices
  const totalDevices = deviceCards.length;
  let hasDevices = totalDevices > 0;

  // Also check total_devices from server-side rendered variable
  const totalDeviceValue = document.getElementById("totalDevices");
  if (totalDeviceValue && parseInt(totalDeviceValue.textContent) > 0) {
    hasDevices = true;
    console.log(
      `Detected devices from counter element: ${totalDeviceValue.textContent}`
    );
    // If we detect devices, hide the no devices message
    hideNoDevicesMessage();
  }

  // Check if device containers exist even if cards aren't properly rendered
  const containerCount = deviceCardContainers.length;
  if (containerCount > 0) {
    console.log(`Found ${containerCount} device container elements`);
    hasDevices = true;
    // If we detect device containers, hide the no devices message
    hideNoDevicesMessage();
  }

  // Check total_devices from debug script
  let scriptDeviceCount = 0;
  try {
    const scriptContents = Array.from(document.querySelectorAll("script"))
      .map((s) => s.textContent)
      .find((text) => text && text.includes("Total devices:"));

    if (scriptContents) {
      const match = scriptContents.match(/Total devices: (\d+)/);
      if (match && parseInt(match[1]) > 0) {
        scriptDeviceCount = parseInt(match[1]);
        hasDevices = true;
        console.log(
          `Verified from debug script: ${scriptDeviceCount} devices exist`
        );
        // If script shows devices, hide the no devices message
        hideNoDevicesMessage();
      } else {
        console.log("Debug script found but no device count matched");
      }
    } else {
      console.log("No debug script with device count found");
    }
  } catch (e) {
    console.error("Error checking debug info:", e);
  }

  // Try to get device count from API if we haven't determined we have devices yet
  if (!window.deviceApiChecked) {
    console.log("Checking API directly for devices");
    window.deviceApiChecked = true;

    // Fetch device data directly from API
    fetch("/api/user/devices", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.devices && data.devices.length > 0) {
          console.log(
            `API confirms ${data.devices.length} devices exist, forcing display fix`
          );
          // API shows devices, hide the no devices message IMMEDIATELY
          hideNoDevicesMessage();
          forceShowDevicesUI(data.devices.length);
        } else {
          console.log("API confirms no devices exist");
        }
      })
      .catch((error) => {
        console.error("Error checking device API:", error);
      });
  }

  console.log(
    `Device visibility check summary: hasDevices=${hasDevices}, totalDevices=${totalDevices}, scriptDeviceCount=${scriptDeviceCount}`
  );

  if (hasDevices) {
    // We have devices, hide all no devices messages
    hideNoDevicesMessage();

    // Force the dashboard stats to be visible
    if (dashboardStats) {
      dashboardStats.style.display = "flex";
      console.log("Forced dashboard stats to be visible");
    }

    // Make sure all floor containers are visible
    floorContainers.forEach((container) => {
      if (
        container.classList.contains("active") &&
        container.style.display === "none"
      ) {
        container.style.display = "block";
        console.log("Fixed visibility of floor container:", container.id);
      }
    });

    // Update device count stats if needed
    const displayCount = Math.max(
      totalDevices,
      parseInt(totalDeviceValue?.textContent || "0"),
      scriptDeviceCount
    );
    updateDeviceCountsDisplay(displayCount);
  }
}

// New function to force show the UI when devices exist according to API
function forceShowDevicesUI(deviceCount) {
  console.log(`Forcing UI to show ${deviceCount} devices`);

  // First and most importantly - hide all no devices messages
  hideNoDevicesMessage();

  // Get key UI elements
  const dashboardStats = document.querySelector(".dashboard-stats");
  const floorContainers = document.querySelectorAll(".floor-container");

  // Show the dashboard stats
  if (dashboardStats) {
    dashboardStats.style.display = "flex";
    console.log("Forced dashboard stats visible");

    // Update total devices count
    const totalDevicesEl = document.getElementById("totalDevices");
    if (totalDevicesEl) {
      totalDevicesEl.textContent = deviceCount;
    }

    // Update online devices count (estimate)
    const onlineDevicesEl = document.getElementById("onlineDevices");
    if (onlineDevicesEl) {
      onlineDevicesEl.textContent = Math.ceil(deviceCount * 0.8); // Assume 80% online
    }
  }

  // Show floor containers
  if (floorContainers.length > 0) {
    floorContainers.forEach((container) => {
      if (container.classList.contains("active")) {
        container.style.display = "block";
      }
    });
    console.log("Made floor containers visible");
  } else {
    console.log("No floor containers found");
  }

  // Show toast with refresh suggestion
  if (window.showToast) {
    window.showToast(
      `API shows ${deviceCount} devices exist. UI updated to show device information.`,
      "success"
    );
  }
}

// Add a DOMContentLoaded listener specifically for dashboard stats visibility with more robust timing
document.addEventListener("DOMContentLoaded", function () {
  // Check immediately
  console.log("DOMContentLoaded - Checking dashboard stats visibility");
  ensureDashboardStatsVisibility();

  // Check after a short delay to catch template rendering
  setTimeout(function () {
    console.log("First timeout check for dashboard stats visibility");
    ensureDashboardStatsVisibility();

    // Check again after devices might have loaded via API
    setTimeout(function () {
      console.log("Second timeout check for dashboard stats visibility");
      ensureDashboardStatsVisibility();

      // Final check after all async operations should be complete
      setTimeout(ensureDashboardStatsVisibility, 2000);
    }, 1000);
  }, 100);
});

// Add listener to initialize device controls for dynamically created devices
document.addEventListener("DOMContentLoaded", function () {
  // Check immediately
  console.log("DOMContentLoaded - Checking dashboard stats visibility");
  ensureDashboardStatsVisibility();

  // Check after a short delay to catch template rendering
  setTimeout(function () {
    console.log("First timeout check for dashboard stats visibility");
    ensureDashboardStatsVisibility();

    // Check again after devices might have loaded via API
    setTimeout(function () {
      console.log("Second timeout check for dashboard stats visibility");
      ensureDashboardStatsVisibility();

      // Final check after all async operations should be complete
      setTimeout(ensureDashboardStatsVisibility, 2000);
    }, 1000);
  }, 100);
});

// Add function to handle device toggle events for dynamically added toggles
function setupDynamicDeviceControls() {
  // Setup toggle switches for lights
  document.addEventListener("change", function (event) {
    if (event.target.classList.contains("device-toggle")) {
      const deviceId = event.target.getAttribute("data-device-id");
      const action = event.target.checked ? "on" : "off";

      controlDevice(deviceId, action);

      // Update toggle label
      const label = event.target.nextElementSibling;
      if (label) {
        label.textContent = event.target.checked ? "ON" : "OFF";
      }

      // Update toggle indicator
      const container = event.target.closest(".device-toggle-container");
      if (container) {
        const indicator = container.querySelector(".toggle-status-indicator");
        if (indicator) {
          if (event.target.checked) {
            indicator.classList.add("on");
            indicator.classList.remove("off");
          } else {
            indicator.classList.add("off");
            indicator.classList.remove("on");
          }
        }
      }
    }
  });

  // Setup brightness controls
  document.addEventListener("input", function (event) {
    if (
      event.target.hasAttribute("data-control-type") &&
      event.target.getAttribute("data-control-type") === "brightness"
    ) {
      const deviceId = event.target.getAttribute("data-device-id");
      const value = event.target.value;
      const label = event.target.previousElementSibling;

      // Update label with current value
      if (label) {
        const valueSpan = label.querySelector("span:last-child");
        if (valueSpan) {
          valueSpan.textContent = `${value}%`;
        }
      }

      // Throttle API calls during sliding
      if (!event.target._throttleTimeout) {
        event.target._throttleTimeout = setTimeout(() => {
          controlDevice(deviceId, "brightness", value);
          event.target._throttleTimeout = null;
        }, 300);
      }
    }
  });

  // Setup device control buttons
  document.addEventListener("click", function (event) {
    if (
      event.target.classList.contains("device-control-btn") ||
      event.target.parentElement.classList.contains("device-control-btn")
    ) {
      const button = event.target.classList.contains("device-control-btn")
        ? event.target
        : event.target.parentElement;

      const deviceId = button.getAttribute("data-device-id");
      const action = button.getAttribute("data-action");
      let value = null;

      // Different actions for different controls
      if (action === "temp_up") {
        // Get current temperature and increment
        const tempDisplay = document.querySelector(
          `.multi-value-display[data-device-id="${deviceId}"][data-value-type="temperature"]`
        );
        if (tempDisplay) {
          value = parseFloat(tempDisplay.textContent) + 1;
          tempDisplay.textContent = value.toString();
        }
      } else if (action === "temp_down") {
        // Get current temperature and decrement
        const tempDisplay = document.querySelector(
          `.multi-value-display[data-device-id="${deviceId}"][data-value-type="temperature"]`
        );
        if (tempDisplay) {
          value = parseFloat(tempDisplay.textContent) - 1;
          tempDisplay.textContent = value.toString();
        }
      } else if (action === "mode") {
        // Cycle through modes
        const modeDisplay = document.querySelector(
          `.multi-value-display[data-device-id="${deviceId}"][data-value-type="mode"]`
        );
        if (modeDisplay) {
          const modes = ["Off", "Bake", "Broil", "Convection"];
          const currentIndex = modes.indexOf(modeDisplay.textContent);
          const nextIndex = (currentIndex + 1) % modes.length;
          value = modes[nextIndex];
          modeDisplay.textContent = value;
        }
      }

      // Send control request
      controlDevice(deviceId, action, value);
    }
  });
}

// Call setup function when DOM is ready
document.addEventListener("DOMContentLoaded", setupDynamicDeviceControls);

// Helper function to group devices by floor and room
function groupDevicesByFloorAndRoom(devices) {
  const grouped = {};

  devices.forEach((device) => {
    // Extract floor and room from device info with better fallbacks
    const floorNum = device.floor || device.floor_number || 1; // Try multiple floor properties
    const floorName = device.floor_name || `Floor ${floorNum}`; // Get floor name if available

    // Better room name handling with multiple fallback options
    let roomName = device.room_name || device.room || "";

    // If no room is specified, try to determine from device location or type
    if (!roomName) {
      if (device.location) {
        roomName = device.location;
      } else if (device.type && device.type.toLowerCase().includes("kitchen")) {
        roomName = "Kitchen";
      } else if (
        device.type &&
        device.type.toLowerCase().includes("bathroom")
      ) {
        roomName = "Bathroom";
      } else if (device.type && device.type.toLowerCase().includes("bedroom")) {
        roomName = "Bedroom";
      } else if (device.type && device.type.toLowerCase().includes("living")) {
        roomName = "Living Room";
      } else {
        roomName = "Main Room"; // Default room name
      }
    }

    // Create floor object if it doesn't exist
    if (!grouped[floorNum]) {
      grouped[floorNum] = {
        floor_name: floorName, // Store floor name
        rooms: {},
      };
    }

    // Create room array if it doesn't exist
    if (!grouped[floorNum].rooms[roomName]) {
      grouped[floorNum].rooms[roomName] = [];
    }

    // Add device to room
    grouped[floorNum].rooms[roomName].push(device);
  });

  return grouped;
}

// Helper function to find a room card by name
function findRoomCard(container, roomName) {
  const roomCards = container.querySelectorAll(".room-card");
  for (let i = 0; i < roomCards.length; i++) {
    const headingElement = roomCards[i].querySelector(".card-header h5");
    if (headingElement && headingElement.textContent.includes(roomName)) {
      return roomCards[i];
    }
  }
  return null;
}

// Helper function to create a room card
function createRoomCard(roomName, floorNum, floorName) {
  const roomCard = document.createElement("div");
  roomCard.className = "card room-card";

  // Get floor color mapping from existing data or use default
  const floorColors = {
    1: "primary",
    2: "info",
    3: "success",
    4: "warning",
  };

  const color = floorColors[floorNum] || "secondary";

  // Use floorName if provided, otherwise fall back to "Floor X"
  const displayFloorName = floorName || `Floor ${floorNum}`;

  roomCard.innerHTML = `
        <div class="card-header bg-${color} text-white room-header">
            <h5 class="mb-0">
                <i class="fas fa-door-open me-2"></i>${roomName}
            </h5>
            <span class="badge bg-dark">${displayFloorName}</span>
        </div>
        <div class="card-body room-body"></div>
        <div class="card-footer text-muted">
            <small>
                <i class="fas fa-microchip me-1"></i>
                <span class="room-device-count">0</span> devices in this room
            </small>
        </div>
    `;

  return roomCard;
}

// Helper function to create a device element based on its type
function createDeviceElement(device, roomName, floorNum) {
  const deviceCol = document.createElement("div");
  deviceCol.className = "col-md-6 mb-3 device-card-container";

  // Create base device card
  const deviceCard = document.createElement("div");
  deviceCard.className = "card device-card h-100";
  deviceCard.dataset.room = roomName.toLowerCase().replace(/\s+/g, "_");
  deviceCard.dataset.floor = floorNum;
  deviceCard.dataset.deviceType = device.type || "unknown";
  deviceCard.dataset.deviceId = device.device_id;

  // Get floor color mapping from existing data or use default
  const floorColors = {
    1: "primary",
    2: "info",
    3: "success",
    4: "warning",
  };

  const color = floorColors[floorNum] || "secondary";

  // Get floor name with better fallback
  const floorName = device.floor_name || `Floor ${floorNum}`;

  // Create card header with device name and status
  const cardHeader = document.createElement("div");
  cardHeader.className = "card-header";
  cardHeader.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
                <span class="device-status status-${
                  device.status || "unknown"
                }" data-device-id="${device.device_id}"></span>
                ${device.name || device.type || "Device"}
            </h6>
            <span class="badge bg-${color} rounded-pill device-location">
                <i class="fas fa-map-marker-alt me-1"></i>${roomName} (${floorName})
            </span>
        </div>
    `;

  // Create card body with template based on device type
  const cardBody = document.createElement("div");
  cardBody.className = "card-body d-flex flex-column";

  // Insert device template content based on type
  const templateContent = getDeviceTemplateContent(device);
  cardBody.innerHTML = templateContent;

  // Create card footer
  const cardFooter = document.createElement("div");
  cardFooter.className = "card-footer";
  cardFooter.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted device-status-text" data-device-id="${
              device.device_id
            }">${device.status || "unknown"}</small>
            <button class="btn btn-sm btn-outline-primary refresh-button" data-refresh-target="device-${
              device.device_id
            }" data-refresh-url="/api/devices/${device.device_id}/data?limit=1">
                <i class="fas fa-sync-alt"></i>
            </button>
        </div>
    `;

  // Assemble the card
  deviceCard.appendChild(cardHeader);
  deviceCard.appendChild(cardBody);
  deviceCard.appendChild(cardFooter);
  deviceCol.appendChild(deviceCard);

  return deviceCol;
}

// Helper function to generate device template content based on device type
function getDeviceTemplateContent(device) {
  const deviceType = device.type || "generic";
  let template = "";

  switch (deviceType.toLowerCase()) {
    case "temperature_sensor":
    case "temperature":
      template = `
                <div class="device-value-container">
                    <div class="current-value">
                        <div class="value-display" data-device-id="${
                          device.device_id
                        }">${device.value || "0"}</div>
                        <div class="value-unit">°C</div>
                    </div>
                    <div class="value-indicator">
                        <i class="fas fa-thermometer-half"></i>
                    </div>
                </div>
                <div class="device-chart-container mt-3">
                    <canvas id="chart-${
                      device.device_id
                    }" height="150"></canvas>
                </div>
            `;
      break;

    case "humidity_sensor":
    case "humidity":
      template = `
                <div class="device-value-container">
                    <div class="current-value">
                        <div class="value-display" data-device-id="${
                          device.device_id
                        }">${device.value || "0"}</div>
                        <div class="value-unit">%</div>
                    </div>
                    <div class="value-indicator">
                        <i class="fas fa-tint"></i>
                    </div>
                </div>
                <div class="device-chart-container mt-3">
                    <canvas id="chart-${
                      device.device_id
                    }" height="150"></canvas>
                </div>
            `;
      break;

    case "smart_refrigerator":
      template = `
                <div class="device-multi-value">
                    <div class="multi-value-item">
                        <div class="multi-value-label">Temperature</div>
                        <div class="multi-value-display" data-device-id="${
                          device.device_id
                        }" data-value-type="temperature">${
        device.value || "4"
      }</div>
                        <div class="multi-value-unit">°C</div>
                    </div>
                    <div class="multi-value-item">
                        <div class="multi-value-label">Door</div>
                        <div class="multi-value-display" data-device-id="${
                          device.device_id
                        }" data-value-type="door">${
        device.door_status || "Closed"
      }</div>
                    </div>
                </div>
                <div class="device-control mt-3">
                    <div class="btn-group btn-group-sm w-100">
                        <button class="btn btn-outline-primary device-control-btn" data-device-id="${
                          device.device_id
                        }" data-action="temp_down">
                            <i class="fas fa-minus"></i> Temp
                        </button>
                        <button class="btn btn-outline-primary device-control-btn" data-device-id="${
                          device.device_id
                        }" data-action="temp_up">
                            <i class="fas fa-plus"></i> Temp
                        </button>
                    </div>
                </div>
            `;
      break;

    case "smart_oven":
      template = `
                <div class="device-multi-value">
                    <div class="multi-value-item">
                        <div class="multi-value-label">Temperature</div>
                        <div class="multi-value-display" data-device-id="${
                          device.device_id
                        }" data-value-type="temperature">${
        device.value || "0"
      }</div>
                        <div class="multi-value-unit">°C</div>
                    </div>
                    <div class="multi-value-item">
                        <div class="multi-value-label">Mode</div>
                        <div class="multi-value-display" data-device-id="${
                          device.device_id
                        }" data-value-type="mode">${device.mode || "Off"}</div>
                    </div>
                </div>
                <div class="device-control mt-3">
                    <div class="btn-group btn-group-sm w-100">
                        <button class="btn btn-outline-primary device-control-btn" data-device-id="${
                          device.device_id
                        }" data-action="power">
                            <i class="fas fa-power-off"></i>
                        </button>
                        <button class="btn btn-outline-primary device-control-btn" data-device-id="${
                          device.device_id
                        }" data-action="temp_up">
                            <i class="fas fa-plus"></i> Temp
                        </button>
                        <button class="btn btn-outline-primary device-control-btn" data-device-id="${
                          device.device_id
                        }" data-action="mode">
                            <i class="fas fa-sliders-h"></i> Mode
                        </button>
                    </div>
                </div>
            `;
      break;

    case "smoke_detector":
      template = `
                <div class="device-status-display text-center">
                    <div class="status-icon ${
                      device.status === "alert" ? "text-danger" : "text-success"
                    }">
                        <i class="fas ${
                          device.status === "alert"
                            ? "fa-exclamation-triangle"
                            : "fa-check-circle"
                        } fa-3x"></i>
                    </div>
                    <div class="status-text mt-2">
                        <strong>${
                          device.status === "alert" ? "ALERT" : "Normal"
                        }</strong>
                    </div>
                    <div class="status-description small text-muted">
                        ${
                          device.status === "alert"
                            ? "Smoke detected!"
                            : "No smoke detected"
                        }
                    </div>
                </div>
                <div class="device-info mt-3">
                    <div class="battery-level">
                        <i class="fas fa-battery-full"></i> Battery: ${
                          device.battery_level || "100"
                        }%
                    </div>
                </div>
            `;
      break;

    case "light":
    case "light_switch":
    case "smart_light":
      template = `
                <div class="device-toggle-container text-center">
                    <div class="toggle-status-indicator mb-3 ${
                      device.value === "on" ||
                      device.value === true ||
                      device.value === 1
                        ? "on"
                        : "off"
                    }">
                        <i class="fas fa-lightbulb fa-3x"></i>
                    </div>
                    <div class="form-check form-switch d-flex justify-content-center">
                        <input class="form-check-input device-toggle me-2" type="checkbox" id="toggle-${
                          device.device_id
                        }" 
                            data-device-id="${device.device_id}" ${
        device.value === "on" || device.value === true || device.value === 1
          ? "checked"
          : ""
      }>
                        <label class="form-check-label" for="toggle-${
                          device.device_id
                        }">
                            ${
                              device.value === "on" ||
                              device.value === true ||
                              device.value === 1
                                ? "ON"
                                : "OFF"
                            }
                        </label>
                    </div>
                </div>
                ${
                  device.type === "smart_light"
                    ? `
                <div class="brightness-control mt-3">
                    <label for="brightness-${
                      device.device_id
                    }" class="form-label d-flex justify-content-between">
                        <span>Brightness</span>
                        <span>${device.brightness || 50}%</span>
                    </label>
                    <input type="range" class="form-range" min="1" max="100" 
                        value="${device.brightness || 50}" id="brightness-${
                        device.device_id
                      }" 
                        data-device-id="${
                          device.device_id
                        }" data-control-type="brightness">
                </div>
                `
                    : ""
                }
            `;
      break;

    default:
      // Generic template for any other device type
      template = `
                <div class="device-generic text-center">
                    <div class="device-icon mb-3">
                        <i class="fas fa-microchip fa-3x"></i>
                    </div>
                    <div class="device-value">
                        Value: <span class="value-display" data-device-id="${
                          device.device_id
                        }">${
        device.value !== undefined ? device.value : "N/A"
      }</span>
                    </div>
                    <div class="device-type small text-muted mt-2">
                        Type: ${deviceType}
                    </div>
                </div>
            `;
  }

  // Add common elements to all templates
  const commonElements = `
        <div class="device-connections mt-auto">
            <small class="text-muted">
                <i class="fas fa-link me-1"></i> ID: ${device.device_id}
            </small>
        </div>
        <div class="mt-2">
            <p class="last-updated mb-0">
                <small>Last update: 
                    <span class="last-updated-time" data-device-id="${
                      device.device_id
                    }" 
                        data-timestamp="${
                          device.last_seen || device.timestamp
                        }">
                        ${formatTimestamp(device.last_seen || device.timestamp)}
                    </span>
                </small>
            </p>
        </div>
    `;

  return template + commonElements;
}

// Helper function to update room device count
function updateRoomDeviceCount(roomCard, count) {
  const countElement = roomCard.querySelector(".room-device-count");
  if (countElement) {
    countElement.textContent = count;
  }
}

// Helper function to update floor device count
function updateFloorDeviceCount(floorContainer, floorNum, count) {
  // Find floor button that matches this floor
  const floorButton = document.querySelector(
    `.floor-button[data-floor="${floorNum}"]`
  );
  if (floorButton) {
    const countIndicator = floorButton.querySelector(".floor-indicator");
    if (countIndicator) {
      countIndicator.textContent = `${count} device${count === 1 ? "" : "s"}`;
    }
  }

  // Update floor header count if it exists
  const floorHeader = floorContainer.querySelector(".floor-summary .badge");
  if (floorHeader) {
    const deviceCountText = floorHeader.innerHTML.split("<span")[0];
    floorHeader.innerHTML =
      deviceCountText +
      `<span class="mx-1">|</span><i class="fas fa-microchip me-1"></i> ${count} Device${
        count === 1 ? "" : "s"
      }`;
  }
}

// Helper function to create a floor navigation button with a specific name
function createFloorNavButtonWithName(
  floorNum,
  floorName,
  deviceCount,
  parentContainer,
  isActive = false
) {
  // If parent not provided, find it
  if (!parentContainer) {
    parentContainer = document.querySelector(".floor-buttons");
    if (!parentContainer) {
      console.error("Floor buttons container not found");
      return;
    }
  }

  // Create the floor button if it doesn't exist
  const existingButton = parentContainer.querySelector(
    `[data-floor="${floorNum}"]`
  );
  if (!existingButton) {
    // Get floor color mapping from existing data or use default
    const floorColors = {
      1: "primary",
      2: "info",
      3: "success",
      4: "warning",
    };

    const color = floorColors[floorNum] || "secondary";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn btn-outline-${color} floor-button ${
      isActive ? "active" : ""
    }`;
    button.setAttribute("data-floor", floorNum);
    button.setAttribute("data-floor-name", floorName);
    button.innerHTML = `
            ${floorName}
            <span class="badge bg-${color} floor-indicator">${deviceCount} device${
      deviceCount !== 1 ? "s" : ""
    }</span>
        `;

    // Add click handler
    button.addEventListener("click", function () {
      const floorNum = this.getAttribute("data-floor");
      if (!floorNum) return;

      // Update active button
      const floorButtons = document.querySelectorAll(".floor-button");
      floorButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      // Show selected floor, hide others
      const floorContainers = document.querySelectorAll(".floor-container");
      floorContainers.forEach((container) => {
        if (container.id === `floor-${floorNum}`) {
          container.classList.add("active");
          container.style.display = "block"; // Explicitly set display
        } else {
          container.classList.remove("active");
          container.style.display = "none";
        }
      });
    });

    parentContainer.appendChild(button);
  } else {
    // Update device count on existing button
    const indicator = existingButton.querySelector(".floor-indicator");
    if (indicator) {
      indicator.textContent = `${deviceCount} device${
        deviceCount !== 1 ? "s" : ""
      }`;
    }

    // Update active state if needed
    if (isActive && !existingButton.classList.contains("active")) {
      const floorButtons = document.querySelectorAll(".floor-button");
      floorButtons.forEach((btn) => btn.classList.remove("active"));
      existingButton.classList.add("active");
    }
  }
}

// Helper function to create a floor container with a specific name
function createFloorContainerWithName(
  floorNum,
  floorName,
  deviceCount,
  isActive = false
) {
  const parentContainer = document.querySelector(".floor-nav-container");
  if (!parentContainer) {
    console.error("Parent container not found for floor creation");
    return null;
  }

  // Create the floor container if it doesn't exist
  let floorContainer = document.getElementById(`floor-${floorNum}`);
  if (!floorContainer) {
    floorContainer = document.createElement("div");
    floorContainer.id = `floor-${floorNum}`;
    floorContainer.className = `floor-container ${isActive ? "active" : ""}`;
    floorContainer.style.display = isActive ? "block" : "none";

    // Get floor color mapping from existing data or use default
    const floorColors = {
      1: "primary",
      2: "info",
      3: "success",
      4: "warning",
    };

    const color = floorColors[floorNum] || "secondary";

    // Add floor summary header
    const summary = document.createElement("div");
    summary.className = "floor-summary mb-3";
    summary.innerHTML = `
            <h5 class="text-${color}">
                <i class="fas fa-building me-2"></i>${floorName}
                <span class="badge bg-${color} float-end">
                    <i class="fas fa-door-open me-1"></i><span class="room-count">0</span> Rooms
                    <span class="mx-1">|</span><i class="fas fa-microchip me-1"></i>${deviceCount} Device${
      deviceCount !== 1 ? "s" : ""
    }
                </span>
            </h5>
        `;
    floorContainer.appendChild(summary);

    // Insert after the floor nav
    parentContainer.appendChild(floorContainer);
  } else {
    // Update device count on existing container
    const deviceCountEl = floorContainer.querySelector(
      ".floor-summary .badge .fa-microchip"
    ).nextSibling;
    if (deviceCountEl) {
      deviceCountEl.textContent = ` ${deviceCount} Device${
        deviceCount !== 1 ? "s" : ""
      }`;
    }

    // Update active state if needed
    if (isActive) {
      floorContainer.classList.add("active");
      floorContainer.style.display = "block";

      // Ensure other floors are hidden
      document.querySelectorAll(".floor-container").forEach((container) => {
        if (container.id !== `floor-${floorNum}`) {
          container.classList.remove("active");
          container.style.display = "none";
        }
      });
    }
  }

  return floorContainer;
}

// Function to create the overall floor structure if it doesn't exist
function createFloorStructure() {
  // Find main container
  const mainContainer =
    document.querySelector(".container") || document.querySelector("main");
  if (!mainContainer) {
    console.error("Cannot find main container");
    return;
  }

  // Check if floor nav container exists
  let floorNavContainer = document.querySelector(".floor-nav-container");
  if (!floorNavContainer) {
    // Find insertion point after dashboard stats
    const dashboardStats = document.querySelector(".dashboard-stats");
    const insertAfter = dashboardStats || mainContainer.firstChild;

    // Create container
    floorNavContainer = document.createElement("div");
    floorNavContainer.className = "card mb-4 floor-nav-container";

    // Create header
    const header = document.createElement("div");
    header.className = "card-header floor-nav";
    header.innerHTML = '<h5 class="mb-0">Floor Plan</h5>';
    floorNavContainer.appendChild(header);

    // Create buttons container
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "btn-group mt-2 floor-buttons";
    header.appendChild(buttonsContainer);

    // Insert into DOM after dashboard stats or at beginning
    if (insertAfter && insertAfter.parentNode) {
      insertAfter.parentNode.insertBefore(
        floorNavContainer,
        insertAfter.nextSibling
      );
    } else {
      mainContainer.insertBefore(floorNavContainer, mainContainer.firstChild);
    }

    console.log("Created floor navigation structure");
  }
}

// Add a new immediate execution to hide any "no devices" messages on page load
(function hideNoDevicesMessageOnLoad() {
  // Call once on script load
  setTimeout(hideNoDevicesMessage, 0);

  // Also set up a MutationObserver to watch for the no devices message being added to the DOM
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // Check if API shows devices exist
        const apiDeviceCountEl = document.getElementById("api-device-count");
        if (apiDeviceCountEl && parseInt(apiDeviceCountEl.textContent) > 0) {
          // If API says we have devices, hide any "no devices" messages
          hideNoDevicesMessage();
        }
      }
    });
  });

  // Start observing the document body for changes
  observer.observe(document.body, { childList: true, subtree: true });

  // Also add event listeners for page load events
  window.addEventListener("load", hideNoDevicesMessage);
  document.addEventListener("DOMContentLoaded", hideNoDevicesMessage);
})();

// Initialize charts
function initializeCharts() {
  // Find all chart containers
  const chartContainers = document.querySelectorAll("[data-chart-device]");

  chartContainers.forEach((container) => {
    const deviceId = container.getAttribute("data-chart-device");
    const chartType = container.getAttribute("data-chart-type") || "line";

    if (deviceId && container.id) {
      // Load data for this device only if it belongs to the user
      loadDeviceData(deviceId, container.id, chartType);
    }
  });
}

// Update loadDeviceData to use the existing API endpoint
function loadDeviceData(deviceId, containerId, chartType) {
  // Use the existing '/api/devices/{deviceId}/data' endpoint
  fetch(`/api/devices/${deviceId}/data?days=1&limit=100`, {
    method: "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        // Store in the global namespace
        if (!window.smartHome.deviceData[deviceId]) {
          window.smartHome.deviceData[deviceId] = [];
        }
        window.smartHome.deviceData[deviceId] = data.data;
        createChart(containerId, deviceId, data.data, chartType);
      } else {
        console.error(
          `Error loading data for device ${deviceId}:`,
          data.message || "Unknown error"
        );
      }
    })
    .catch((error) => {
      console.error(`Error loading data for device ${deviceId}:`, error);
    });
}

function createChart(containerId, deviceId, data, chartType) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Prepare data for chart
  const labels = [];
  const values = [];

  data.forEach((item) => {
    const date = new Date(item.timestamp);
    labels.push(date.toLocaleTimeString());
    values.push(item.value);
  });

  // Create chart using Chart.js
  if (window.Chart) {
    const ctx = container.getContext("2d");

    // Destroy existing chart if it exists
    if (charts[containerId]) {
      charts[containerId].destroy();
    }

    charts[containerId] = new Chart(ctx, {
      type: chartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: deviceId,
            data: values,
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
          },
        },
      },
    });
  }
}

function refreshChartData() {
  // Refresh all charts
  for (const deviceId in window.smartHome.deviceData) {
    const chartContainers = document.querySelectorAll(
      `[data-chart-device="${deviceId}"]`
    );
    chartContainers.forEach((container) => {
      if (container.id) {
        const chartType = container.getAttribute("data-chart-type") || "line";
        loadDeviceData(deviceId, container.id, chartType);
      }
    });
  }
}

// Function that can be called from socket_handler.js to update a chart with new data
function updateChartWithNewData(deviceId, newData) {
  if (!deviceId || !newData || !newData.value) return;

  // Find charts for this device
  const chartContainers = document.querySelectorAll(
    `[data-chart-device="${deviceId}"]`
  );

  chartContainers.forEach((container) => {
    if (container.id && charts[container.id]) {
      const chart = charts[container.id];

      // Add new data point
      const date = new Date(newData.timestamp || new Date());

      // Add to beginning for newest data
      chart.data.labels.unshift(date.toLocaleTimeString());
      chart.data.datasets[0].data.unshift(newData.value);

      // Keep only the most recent 100 points
      if (chart.data.labels.length > 100) {
        chart.data.labels.pop();
        chart.data.datasets[0].data.pop();
      }

      // Update the chart
      chart.update();

      // Also update the device data store
      if (!window.smartHome.deviceData[deviceId]) {
        window.smartHome.deviceData[deviceId] = [];
      }

      // Make sure deviceData for this device is an array
      if (!Array.isArray(window.smartHome.deviceData[deviceId])) {
        window.smartHome.deviceData[deviceId] = [];
      }

      window.smartHome.deviceData[deviceId].unshift({
        timestamp: newData.timestamp || new Date().toISOString(),
        value: newData.value,
      });

      // Keep only 100 data points
      if (window.smartHome.deviceData[deviceId].length > 100) {
        window.smartHome.deviceData[deviceId].pop();
      }
    }
  });
}

// Make this function available globally
window.updateChartWithNewData = updateChartWithNewData;

// Function to verify device count and update UI accordingly
function verifyDeviceContent() {
  // Check if we're on the dashboard page
  const dashboardContent = document.querySelector(".dashboard-header");
  if (!dashboardContent) return;

  // Count actual devices in the DOM
  const deviceCards = document.querySelectorAll(".device-card");
  const deviceCount = deviceCards.length;

  // ISSUE: The way we're checking for the no devices message might be unreliable
  // Let's improve it by looking for the specific message or class
  const noDevicesAlert = document.querySelector(".alert.alert-info");
  const hasNoDevicesMessage =
    noDevicesAlert &&
    noDevicesAlert.textContent.includes(
      "doesn't have any devices registered yet"
    );

  // Get the total_devices variable from the page if available
  let expectedDevices = 0;
  try {
    // Extract from script - this gets the Jinja template variable if it was rendered
    const scriptContent = Array.from(document.querySelectorAll("script"))
      .map((s) => s.textContent)
      .find((text) => text.includes("total_devices"));

    if (scriptContent) {
      const match = scriptContent.match(/total_devices.*?(\d+)/);
      if (match && match[1]) {
        expectedDevices = parseInt(match[1]);
      }
    }
  } catch (e) {
    console.error("Error parsing total_devices:", e);
  }

  // If the server says we have devices but DOM doesn't show them
  if (expectedDevices > 0 && deviceCount === 0) {
    checkHomeAccess();
  }

  // If we have devices but the alert is showing, hide it
  if (deviceCount > 0 && hasNoDevicesMessage) {
    noDevicesAlert.style.display = "none";

    // Also make sure the stats and floor sections are shown
    const statsSection = document.querySelector(".dashboard-stats");
    const floorNav = document.querySelector(".card");

    if (statsSection) statsSection.style.display = "flex";
    if (floorNav) floorNav.style.display = "block";

    if (window.showToast) {
      window.showToast(
        `Found ${deviceCount} devices but the "no devices" message was showing. This has been fixed.`,
        "success"
      );
    }
  }

  // Update device statistics regardless
  updateDeviceCountsDisplay(deviceCount);
}

// Add the missing updateDeviceStatistics function
function updateDeviceStatistics(devices) {
  if (!devices || !Array.isArray(devices)) {
    console.error(
      "Invalid device data provided to updateDeviceStatistics:",
      devices
    );
    return;
  }

  console.log(`Updating UI for ${devices.length} devices from API`);

  // Count online devices
  const onlineDevices = devices.filter(
    (device) =>
      device.status &&
      (device.status.toLowerCase() === "online" ||
        device.status.toLowerCase() === "active")
  );

  // Update online device count in UI
  const onlineDevicesEl = document.getElementById("onlineDevices");
  if (onlineDevicesEl) {
    onlineDevicesEl.textContent = onlineDevices.length;
  }

  // Update each device's UI with current data
  devices.forEach((device) => {
    if (device.device_id) {
      // Update device value display
      updateDeviceUI(device.device_id, device);

      // Update device status
      if (device.status) {
        updateDeviceStatus(device.device_id, device.status);
      }

      // Update toggle switches for devices with on/off state
      if (
        device.value === "on" ||
        device.value === true ||
        device.value === 1
      ) {
        const toggle = document.querySelector(
          `.device-toggle[data-device-id="${device.device_id}"]`
        );
        if (toggle && !toggle.checked) {
          toggle.checked = true;
          // Update toggle label if it exists
          const label = toggle.nextElementSibling;
          if (label) {
            label.textContent = "ON";
          }
        }
      }

      // Update chart data if this device has a chart
      const chartCanvas = document.getElementById(`chart-${device.device_id}`);
      if (chartCanvas && window.smartHome.deviceData[device.device_id]) {
        // Update the chart with the most recent data point
        if (device.value !== undefined) {
          updateChartWithNewData(device.device_id, {
            value: device.value,
            timestamp:
              device.timestamp || device.last_seen || new Date().toISOString(),
          });
        }
      }
    }
  });

  // Update total device count
  updateDeviceCountsDisplay(devices.length);

  console.log("Device statistics updated successfully");
}

// Add the missing updateDeviceCountsDisplay function
function updateDeviceCountsDisplay(count) {
  // Update the total devices counter
  const totalDevicesEl = document.getElementById("totalDevices");
  if (totalDevicesEl) {
    totalDevicesEl.textContent = count;
  }

  // Update device count in API counter if it exists
  const apiDeviceCountEl = document.getElementById("api-device-count");
  if (apiDeviceCountEl) {
    apiDeviceCountEl.textContent = count;
  }

  // Update any floor indicators with the total count
  document.querySelectorAll(".floor-indicator").forEach((indicator) => {
    const floorButton = indicator.closest(".floor-button");
    if (floorButton) {
      const floorNum = floorButton.getAttribute("data-floor");
      if (floorNum) {
        // Count devices specifically on this floor
        const floorDevices = document.querySelectorAll(
          `.device-card[data-floor="${floorNum}"]`
        );
        const floorDeviceCount = floorDevices.length;

        // Only update if we found devices specifically for this floor
        if (floorDeviceCount > 0) {
          indicator.textContent = `${floorDeviceCount} device${
            floorDeviceCount !== 1 ? "s" : ""
          }`;
        }
      }
    }
  });

  // Update any other elements that might display the device count
  document.querySelectorAll(".device-count-display").forEach((element) => {
    element.textContent = count;
  });

  // If we have devices, make sure the dashboard stats are visible
  if (count > 0) {
    const dashboardStats = document.querySelector(".dashboard-stats");
    if (dashboardStats) {
      dashboardStats.style.display = "flex";
    }

    // Also make sure "no devices" message is hidden
    hideNoDevicesMessage();
  }

  console.log(`Updated device counts to: ${count}`);
}

document.addEventListener("alpine:init", () => {
  Alpine.data("deviceManager", () => ({
    devices: [],
    iconMap: {
      smart_refrigerator: "fas fa-snowflake",
      smart_oven: "fas fa-fire",
      smoke_detector: "fas fa-burn",
      temperature_sensor: "fas fa-thermometer-half",
      smart_tv: "fas fa-tv",
      smart_speaker: "fas fa-volume-up",
      light_switch: "fas fa-toggle-on",
      motion_sensor: "fas fa-running",
      smart_light: "fas fa-lightbulb",
      ac_control: "fas fa-fan",
      smart_alarm: "fas fa-bell",
      humidity_sensor: "fas fa-tint",
      smart_scale: "fas fa-weight",
      water_leak_sensor: "fas fa-water",
      smart_mirror: "fas fa-magic",
      garage_door_controller: "fas fa-warehouse",
      car_charger: "fas fa-charging-station",
      security_camera: "fas fa-video",
      irrigation_control: "fas fa-shower",
      light_sensor: "fas fa-eye",
      weather_station: "fas fa-cloud-sun",
    },
    iconClass(type) {
      return this.iconMap[type] || "fas fa-question";
    },
    toggleDevice(device) {
      device.is_active = !device.is_active;
      // Bạn có thể gọi API ở đây để thực hiện thao tác bật/tắt
      console.log(`Device ${device.name} toggled to ${device.is_active}`);
    },
    statusClass(status) {
      switch (status) {
        case "online":
          return "badge bg-success";
        case "offline":
          return "badge bg-secondary";
        case "error":
          return "badge bg-danger";
        default:
          return "badge bg-dark";
      }
    },
    fetchDevices() {
      fetch("/api/user/devices", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (data.success) {
            this.devices = data.devices || [];
            console.log(`${data.devices?.length || 0} devices loaded`);
          } else {
            console.error("Failed to fetch devices:", data.message);
          }
        })
        .catch((error) => {
          console.error("Error fetching devices:", error);
        });
    },
    init() {
      this.fetchDevices();
    },
  }));
});
