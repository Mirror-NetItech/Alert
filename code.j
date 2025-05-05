
document.addEventListener('DOMContentLoaded', function() {
    const captureButton = document.getElementById('captureButton');
    const displayContainer = document.getElementById('displayContainer');

    // Load stored data on page load
    let storedData = JSON.parse(localStorage.getItem('deviceData')) || [];
    displayGroupedData();

    function getDeviceInfo() {
        let screenWidth = screen.width;
        let screenHeight = screen.height;
        let viewportWidth, viewportHeight;


        // Try to determine viewport size from the iframe's offset dimensions
        try {
            // Find the iframe in which the document is running
            let frame = window.frameElement;
            if (frame) {
                viewportWidth = frame.offsetWidth;
                viewportHeight = frame.offsetHeight;
            } else {
                // Not in an iframe, fallback to standard methods
                viewportWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                viewportHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            }
        } catch (e) {
            // Fallback in case of error
            viewportWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            viewportHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        }

        const orientation = screen.orientation && screen.orientation.type ? screen.orientation.type : (viewportWidth > viewportHeight ? 'landscape' : 'portrait');
        const desktopMode = screenWidth > 1024;

        // Device Information - MORE RELIABLE DEVICE NAME CAPTURE
        const userAgent = navigator.userAgent;
        let device = "Unknown Device";

        // Attempt to extract more specific device info from userAgent
        const deviceMatches = userAgent.match(/\(([^)]+)\)/);  // Gets content within parentheses
        if (deviceMatches && deviceMatches[1]) {
            device = deviceMatches[1].split(';')[0].trim();   // Take the first part before a semicolon.  (Robust to various UAs)
        }

        return {
            screenWidth,
            screenHeight,
            viewportWidth,
            viewportHeight,
            orientation,
            desktopMode,
            device
        };
    }

    function displayData(data, timestamp) {
        const dataDiv = document.createElement('div');
        dataDiv.classList.add('stored-data-item');
        dataDiv.innerHTML = `
            <p><strong>Device:</strong> ${data.device}</p>
            <p><strong>Screen Resolution:</strong> ${data.screenWidth} x ${data.screenHeight}</p>
            <p><strong>Viewport:</strong> ${data.viewportWidth} x ${data.viewportHeight}</p>
            <p><strong>Orientation:</strong> ${data.orientation}</p>
            <p><strong>Mode:</strong> ${data.desktopMode ? 'Desktop' : 'Normal'}</p>
            <p><strong>Captured On:</strong> ${timestamp}</p>
        `;
        return dataDiv; // Return the created element for grouping
    }

    function displayGroupedData() {
        displayContainer.innerHTML = '';
        if (storedData.length === 0) {
            displayContainer.innerHTML = '<p>No data captured yet.</p>';
            return;
        }

        const groupedData = storedData.reduce((acc, item, index) => {
            if (!acc[item.device]) {
                acc[item.device] = {
                    entries: [],
                    indices: []
                };
            }
            acc[item.device].entries.push(item);
            acc[item.device].indices.push(index); //Store the index for each device
            return acc;
        }, {});

        for (const device in groupedData) {
            const deviceEntries = groupedData[device].entries;
            const deviceIndices = groupedData[device].indices; //Get index value for the device

            const deviceGroup = document.createElement('div');
            deviceGroup.classList.add('device-group');

            const deviceSummary = document.createElement('div');
            deviceSummary.classList.add('device-summary');
            deviceSummary.textContent = `${device} (${deviceEntries.length} captures)`;
            deviceGroup.appendChild(deviceSummary);

            const deviceEntriesContainer = document.createElement('div');
            deviceEntriesContainer.classList.add('device-entries');

            deviceEntries.forEach((item, i) => {
                const dataDiv = displayData(item, item.timestamp, deviceIndices[i], deviceEntriesContainer); //Pass the index too for Delete
                deviceEntriesContainer.appendChild(dataDiv);
            });

            deviceGroup.appendChild(deviceEntriesContainer);
            deviceSummary.addEventListener('click', () => {
                deviceEntriesContainer.classList.toggle('expanded');
            });
            displayContainer.appendChild(deviceGroup);
        }
    }

    captureButton.addEventListener('click', function() {
        const currentData = getDeviceInfo();
        const timestamp = new Date().toLocaleString();
        currentData.timestamp = timestamp; // Store the timestamp

        // Check if data has changed (simplified comparison)
        const lastEntryForDevice = storedData.filter(entry => entry.device === currentData.device).pop();
        if (!lastEntryForDevice ||
            lastEntryForDevice.screenWidth !== currentData.screenWidth ||
            lastEntryForDevice.screenHeight !== currentData.screenHeight ||
            lastEntryForDevice.viewportWidth !== currentData.viewportWidth ||
            lastEntryForDevice.viewportHeight !== currentData.viewportHeight ||
            lastEntryForDevice.orientation !== currentData.orientation ||
            lastEntryForDevice.desktopMode !== currentData.desktopMode) {

            // Store the data
            storedData.push(currentData);
            localStorage.setItem('deviceData', JSON.stringify(storedData));

            displayGroupedData(); // Refresh the grouped display
        } else {
            alert("Device information has not changed since last capture.");
        }
    });

    // Initial display of data from localStorage (if any)
    displayGroupedData();
});
