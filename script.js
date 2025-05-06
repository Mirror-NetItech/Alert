
document.addEventListener('DOMContentLoaded', function() {
    const captureButton = document.getElementById('captureButton');
    const displayContainer = document.getElementById('displayContainer');
    const openRecycleBinButton = document.getElementById('openRecycleBin');
    const recycleBinModal = document.getElementById('recycleBinModal');
    const recycleBinContent = document.getElementById('recycleBinContent');
    const restoreSelectedButton = document.getElementById('restoreSelected');
    const deleteSelectedButton = document.getElementById('deleteSelected');

    //Data to store here
    let storedData = [];
    let recycleBin = [];

    //Init the Function
    (async function() {
        await loadInitialData();
    })();

    //Load the initial data
    async function loadInitialData() {
        await fetchStoredData();
        await fetchRecycleBin();
    }

    //FetchStoredData here
    async function fetchStoredData() {
        let {
            data: device_data,
            error
        } = await supabase
            .from('device_data')
            .select('*')

        if (error) {
            console.log("This is the error message");
            console.log(error);
        } else {
            storedData = device_data;
            displayGroupedData();
        }
    }
    //FetchRecyclebin here
    async function fetchRecycleBin() {
        let {
            data: recycle_bin,
            error
        } = await supabase
            .from('recycle_bin')
            .select('*')

        if (error) {
            console.log("This is the error message");
            console.log(error);
        } else {
            recycleBin = recycle_bin;
            displayRecycleBin();
        }
    }

    //Inject CSS rules for viewport size
    function injectViewportSizeStyles() {
        const style = document.createElement('style');
        style.textContent = `
        body::before {
            content: 'viewportWidth:'  window.innerWidth ' ,viewportHeight:'  window.innerHeight;
            display: none;
        }
        `;
        document.head.appendChild(style);
    }
   //Function to extract content size
    function extractViewportSize() {
        const content = window.getComputedStyle(document.body, '::before').getPropertyValue('content').replace(/"/g, '');

        const [widthText, heightText] = content.split(',');
        const viewportWidth = parseInt(widthText.split(':')[1], 10);
        const viewportHeight = parseInt(heightText.split(':')[1], 10);
        return {
            viewportWidth,
            viewportHeight
        };
    }

    //Get Device information
    function getDeviceInfo() {
        injectViewportSizeStyles(); //Inject CSS styles to get viewport sizes
        const {
            viewportWidth,
            viewportHeight
        } = extractViewportSize();

        let screenWidth = screen.width;
        let screenHeight = screen.height;

        const orientation = screen.orientation && screen.orientation.type ? screen.orientation.type : (viewportWidth > viewportHeight ? 'landscape' : 'portrait');
        const desktopMode = screenWidth > 1024;

        // Device Information - MORE RELIABLE DEVICE NAME CAPTURE
        const userAgent = navigator.userAgent;
        let device = "Unknown Device";

        // Attempt to extract more specific device info from userAgent
        const deviceMatches = userAgent.match(/\(([^)]+)\)/); // Gets content within parentheses
        if (deviceMatches && deviceMatches[1]) {
            device = deviceMatches[1].split(';')[0].trim(); // Take the first part before a semicolon.  (Robust to various UAs)
        }

        return {
            screenWidth,
            screenHeight,
            viewportWidth,
            viewportHeight,
            orientation,
            desktopMode,
            device,
            timestamp: new Date().toLocaleString()
        };
    }

    function displayData(data, index) { //Removed deviceEntriesContainer because it is not used and it cause issues
        const dataDiv = document.createElement('div');
        dataDiv.classList.add('stored-data-item');
        dataDiv.innerHTML = `
            <p><strong>Device:</strong> ${data.device}</p>
            <p><strong>Screen Resolution:</strong> ${data.screenWidth} x ${data.screenHeight}</p>
            <p><strong>Viewport:</strong> ${data.viewportWidth} x ${data.viewportHeight}</p>
            <p><strong>Orientation:</strong> ${data.orientation}</p>
            <p><strong>Mode:</strong> ${data.desktopMode ? 'Desktop' : 'Normal'}</p>
            <p><strong>Captured On:</strong> ${data.timestamp}</p>
            <button class="delete-button" data-index="${index}">Delete</button>
        `;

        return dataDiv;
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

            const deviceGroup = document.createElement('div');
            deviceGroup.classList.add('device-group');

            const deviceSummary = document.createElement('div');
            deviceSummary.classList.add('device-summary');
            deviceSummary.textContent = `${device} (${deviceEntries.length} captures)`;
            deviceGroup.appendChild(deviceSummary);

            const deviceEntriesContainer = document.createElement('div');
            deviceEntriesContainer.classList.add('device-entries');

            deviceEntries.forEach((item, i) => {
                const dataDiv = displayData(item, i);
                dataDiv.querySelector('.delete-button').addEventListener('click', (event) => { //Add Event Listener and delete button
                    event.stopPropagation();
                    moveDataToRecycleBin(item); // Move data to the Recycle bin using the correct index.
                });
                deviceEntriesContainer.appendChild(dataDiv);
            });

            deviceGroup.appendChild(deviceEntriesContainer);
            deviceSummary.addEventListener('click', () => {
                deviceEntriesContainer.classList.toggle('expanded');
            });
            displayContainer.appendChild(deviceGroup);
        }
    }

    async function moveDataToRecycleBin(itemToRemove) {

        const {
            data,
            error
        } = await supabase
            .from('recycle_bin')
            .insert([{
                device: itemToRemove.device,
                screenWidth: itemToRemove.screenWidth,
                screenHeight: itemToRemove.screenHeight,
                viewportWidth: itemToRemove.viewportWidth,
                viewportHeight: itemToRemove.viewportHeight,
                orientation: itemToRemove.orientation,
                desktopMode: itemToRemove.desktopMode,
                timestamp: itemToRemove.timestamp
            }])
            .select()

        if (error) {
            console.log(error);
        } else {
            //Now that it is on recycle bin it will remove it from devide_data

            const {
                error
            } = await supabase
                .from('device_data')
                .delete()
                .eq('timestamp', itemToRemove.timestamp)
            console.log("This is being removed")
            if (error) {
                console.log(error);
            } else {
                console.log("Successful deletion");
                await fetchStoredData();
                await fetchRecycleBin();
            }
        }
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

            itemDiv.querySelector('.restore-button').addEventListener('click', () => {
                restoreDataFromRecycleBin(item);
            });

            recycleBinContent.appendChild(itemDiv);
        });
    }

    async function restoreDataFromRecycleBin(itemToRemove) {

        const {
            data,
            error
        } = await supabase
            .from('device_data')
            .insert([{
                device: itemToRemove.device,
                screenWidth: itemToRemove.screenWidth,
                screenHeight: itemToRemove.screenHeight,
                viewportWidth: itemToRemove.viewportWidth,
                viewportHeight: itemToRemove.viewportHeight,
                orientation: itemToRemove.orientation,
                desktopMode: itemToRemove.desktopMode,
                timestamp: itemToRemove.timestamp
            }])
            .select()

        if (error) {
            console.log(error);
        } else {
            //Now that it is on device_data it will remove it from recycle_bin

            const {
                error
            } = await supabase
                .from('recycle_bin')
                .delete()
                .eq('timestamp', itemToRemove.timestamp)

            if (error) {
                console.log(error);
            } else {
                console.log("Successful deletion");
                await fetchStoredData();
                await fetchRecycleBin();
            }
        }
    }

    //Function For the Delete Selected button on recycleBinModal
    async function deleteSelectedFromRecycleBin() { //clear data from recycle bin permanently

        const {
            error
        } = await supabase
            .from('recycle_bin')
            .delete()
            .neq('device', "null") //This is temporary because there is no data
        if (error) {
            console.log("This is the error");
            console.log(error);
        } else {
            await fetchStoredData();
            await fetchRecycleBin();
        }
    }

    captureButton.addEventListener('click', async function() {
        const currentData = getDeviceInfo();

        const {
            data,
            error
        } = await supabase
            .from('device_data')
            .insert([{
                device: currentData.device,
                screenWidth: currentData.screenWidth,
                screenHeight: currentData.screenHeight,
                viewportWidth: currentData.viewportWidth,
                viewportHeight: currentData.viewportHeight,
                orientation: currentData.orientation,
                desktopMode: currentData.desktopMode,
                timestamp: currentData.timestamp
            }])
            .select()
        if (error) {
            console.log("This is an error message");
            console.log(error);
        } else {
            await fetchStoredData();
            await fetchRecycleBin();
        }
    });

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
