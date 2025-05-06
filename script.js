
document.addEventListener('DOMContentLoaded', function() {
    const captureButton = document.getElementById('captureButton');
    const displayContainer = document.getElementById('displayContainer');
    const openRecycleBinButton = document.getElementById('openRecycleBin');
    const recycleBinModal = document.getElementById('recycleBinModal');
    const recycleBinContent = document.getElementById('recycleBinContent');
    const restoreSelectedButton = document.getElementById('restoreSelected');
    const deleteSelectedButton = document.getElementById('deleteSelected');

    // Firebase Database References
    let storedDataRef;
    let recycleBinRef;

    // Initialize data
    let storedData = [];
    let recycleBin = [];

    // Function to initialize Firebase and attach listeners
    function initializeFirebase() {
        //Check that the value of Firebase is working
        try{
            storedDataRef = firebase.database().ref('storedData');
            recycleBinRef = firebase.database().ref('recycleBin');
        } catch (e) {
            console.log(e);
            return;
        }
        

        // Load the Firebase Realtime database for stored data
        storedDataRef.on('value', (snapshot) => {
            storedData = snapshot.exists() ? Object.values(snapshot.val()) : [];
            displayGroupedData();
        });

        // Load the Firebase Realtime database for the recycle bin
        recycleBinRef.on('value', (snapshot) => {
            recycleBin = snapshot.exists() ? Object.values(snapshot.val()) : [];
            displayRecycleBin();
        });
        console.log("Everything is initialized");
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
            device
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

    function moveDataToRecycleBin(itemToRemove) { //Delete Data from database
        if (itemToRemove) {

            //Push to recycle bin
            recycleBinRef.push(itemToRemove).then(() => {
                //After push to recycle Bin it will remove it
                storedDataRef.orderByChild('device').equalTo(itemToRemove.device).once('value', (snapshot) => {
                    snapshot.forEach(childSnapshot => {
                        if (childSnapshot.val().screenWidth === itemToRemove.screenWidth &&
                            childSnapshot.val().screenHeight === itemToRemove.screenHeight &&
                            childSnapshot.val().viewportWidth === itemToRemove.viewportWidth &&
                            childSnapshot.val().viewportHeight === itemToRemove.viewportHeight &&
                            childSnapshot.val().orientation === itemToRemove.orientation &&
                            childSnapshot.val().desktopMode === itemToRemove.desktopMode &&
                            childSnapshot.val().device === itemToRemove.device) {

                            storedDataRef.child(childSnapshot.key).remove()
                                .then(() => {
                                    console.log("moveDataToRecycleBin: removed from both storedData");
                                }).catch((error) => {
                                    console.error("moveDataToRecycleBin: Error removing from both database:", error);
                                });
                            return;
                        }
                    });
                });
            }).catch((error) => {
                console.error("Error moving to recycle bin", error);
            });
        } else {
            console.error("No item found");
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

    function restoreDataFromRecycleBin(item) {

        if (!item) {
            console.error("Invalid item provided for restoring.");
            return;
        }

        //Find from Recyclebin With index
        recycleBinRef.orderByChild('device').equalTo(item.device).once('value', snapshot => {
            snapshot.forEach(childSnapshot => {
                if (childSnapshot.val().screenWidth === item.screenWidth &&
                    childSnapshot.val().screenHeight === item.screenHeight &&
                    childSnapshot.val().viewportWidth === item.viewportWidth &&
                    childSnapshot.val().viewportHeight === item.viewportHeight &&
                    childSnapshot.val().orientation === item.orientation &&
                    childSnapshot.val().desktopMode === item.desktopMode &&
                    childSnapshot.val().device === item.device) {

                    //Push data to storedData
                    storedDataRef.push(childSnapshot.val()).then(() => {
                        //After push to database it will remove it
                        recycleBinRef.child(childSnapshot.key).remove().then(() => {
                            console.log("RestoreDataFromRecycleBin(): removed from both recycle bin.");
                        }).catch((error) => {
                            console.error("RestoreDataFromRecycleBin(): Error removing from recycle bin database:", error);
                        });
                    }).catch((error) => {
                        console.error("RestoreDataFromRecycleBin(): Error pushing to database:", error);
                    });
                    return;
                }
            });
        });
    }

    //Function For the Delete Selected button on recycleBinModal
    function deleteSelectedFromRecycleBin() { //clear data from recycle bin permanently
        recycleBinRef.remove().then(() => {
            console.log("all data removed from recycle bin");
        });
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
            storedDataRef.push(currentData);
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
    //Call function
    initializeFirebase();
});
