
document.addEventListener('DOMContentLoaded', function() {
    const captureButton = document.getElementById('captureButton');
    const displayContainer = document.getElementById('displayContainer');
    const openRecycleBinButton = document.getElementById('openRecycleBin');
    const recycleBinModal = document.getElementById('recycleBinModal');
    const recycleBinContent = document.getElementById('recycleBinContent');
    const restoreSelectedButton = document.getElementById('restoreSelected');
    const deleteSelectedButton = document.getElementById('deleteSelected');

    // Load stored data
    let storedData = JSON.parse(localStorage.getItem('deviceData')) || [];
    let recycleBin = JSON.parse(localStorage.getItem('recycleBin')) || [];
    displayGroupedData();

    //Get Device information
    function getDeviceInfo() {
        const screenWidth = screen.width;
        const screenHeight = screen.height;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
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

    function displayData(data, timestamp, index, deviceEntriesContainer) {
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

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent device group from toggling
            moveDataToRecycleBin(data, index);
        });

        dataDiv.appendChild(deleteButton);
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

    function moveDataToRecycleBin(data, index) {
        storedData.splice(index, 1); //Remove from storeData

        // update indices in grouped data after deletion

        recycleBin.push(data); //Add data to RecycleBin

        localStorage.setItem('deviceData', JSON.stringify(storedData));
        localStorage.setItem('recycleBin', JSON.stringify(recycleBin));
        displayGroupedData(); // Refresh storedData display
    }

    //Function to display recycle bin datas
    function displayRecycleBin() {
        recycleBinContent.innerHTML = '';
        if (recycleBin.length === 0) {
            recycleBinContent.innerHTML = '<p>Recycle bin is empty.</p>';
            return;
        }
        recycleBin.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('recycle-bin-item');
            itemDiv.innerHTML = `
                <p><strong>Device:</strong> ${item.device}</p>
                <p><strong>Screen Resolution:</strong> ${item.screenWidth} x ${item.screenHeight}</p>
                <p><strong>Viewport:</strong> ${item.viewportWidth} x ${item.viewportHeight}</p>
                <p><strong>Orientation:</strong> ${item.orientation}</p>
                <p><strong>Mode:</strong> ${item.desktopMode ? 'Desktop' : 'Normal'}</p>
                <p><strong>Captured On:</strong> ${item.timestamp}</p>
                <button class="restore-button" data-index="${index}">Restore</button>
            `;
            recycleBinContent.appendChild(itemDiv);
        });
        //Event delegation
        recycleBinContent.addEventListener('click', function(event) {
            if (event.target.classList.contains('restore-button')) {
                const index = event.target.dataset.index;
                restoreDataFromRecycleBin(index);
            }
        });
    }

    function restoreDataFromRecycleBin(index) {
        const item = recycleBin[index];
        if (!item) return;

        recycleBin.splice(index, 1); //Remove item from recycleBin

        storedData.push(item); //Add to StoreData

        localStorage.setItem('deviceData', JSON.stringify(storedData));
        localStorage.setItem('recycleBin', JSON.stringify(recycleBin));
        displayGroupedData(); //Refresh Display
        displayRecycleBin();
    }

    //Function For the Delete Selected button on recycleBinModal
    function deleteSelectedFromRecycleBin() {
        recycleBin = [];

        localStorage.setItem('recycleBin', JSON.stringify(recycleBin));

        displayGroupedData(); // Refresh storedData display
        displayRecycleBin();
    }

    captureButton.addEventListener('click', function() {
        const currentData = getDeviceInfo();
        const timestamp = new Date().toLocaleString();
        currentData.timestamp = timestamp;

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

    //Event Listener for Recycle Bin

    openRecycleBinButton.addEventListener('click', function() {
        recycleBinModal.style.display = 'block';
        displayRecycleBin();
    });

    //Close button function on recycleBinModel

    const closeButton = document.querySelector('.close');

    closeButton.addEventListener('click', function() {
        recycleBinModal.style.display = 'none';
    });

    // Restore Button in Modal
    restoreSelectedButton.addEventListener('click', function() {
        restoreDataFromRecycleBin();
    });

    // Delete Permanently
    deleteSelectedButton.addEventListener('click', function() {
        deleteSelectedFromRecycleBin();
    });

    // Prevent interaction with elements behind the modal while it's open

    window.addEventListener('click', function(event) {
        if (event.target === recycleBinModal) {
            recycleBinModal.style.display = 'none';
        }
    });
});
