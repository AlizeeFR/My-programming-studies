let activeTabId = null;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let audioNotesToLoad = [];

document.addEventListener("DOMContentLoaded", async () => {
  const response = await chrome.runtime.sendMessage({ action: "get-status" });

  const state = response.recordingState;

  if (state === "recording") {
    isRecording = true;
    document.getElementById("addAudioNoteButton").innerText =
      "Pause audio note";
    document.getElementById("saveAudioNoteButton").classList.remove("hidden");
  } else if (state === "paused") {
    isRecording = false;
    document.getElementById("addAudioNoteButton").innerText =
      "Resume audio note";
    document.getElementById("saveAudioNoteButton").classList.remove("hidden");
  } else {
    // If stopped, show default state
    isRecording = false;
    document.getElementById("addAudioNoteButton").innerText = "Add audio note";
    document.getElementById("saveAudioNoteButton").classList.add("hidden");
  }
});
  chrome.storage.local.get(["savedAudioNotes"], async (data) => {
    if (data.savedAudioNotes) {
      audioNotesToLoad = data.savedAudioNotes; // Load saved audio notes into data
    } else {
      console.log("No saved audio notes found.");
    }
  });

  //update variables and restart timers upon user input change
  document
    .getElementById("pauseTime")
    .addEventListener("input", updateAndRestart);
  document
    .getElementById("unpauseTime")
    .addEventListener("input", updateAndRestart);
  document
    .getElementById("autoUnpauseToggle")
    .addEventListener("change", updateAndRestart);

  // Event for starting and stopping audio recording
  document
    .getElementById("addAudioNoteButton")
    .addEventListener("click", toggleAudioRecording);
  // Event to save the audio note
  document
    .getElementById("saveAudioNoteButton")
    .addEventListener("click", stopAudioRecording);
  //Event to delete notes from storage
  document
    .getElementById("clearAudioNotesButton")
    .addEventListener("click", clearAllAudioNotes);

  chrome.storage.sync.get(
    ["pauseTime", "unpauseTime", "autoUnpause", "activeTabId"],
    (data) => {
      document.getElementById("pauseTime").value =
        data.pauseTime !== undefined ? data.pauseTime : 10; // Default to 10 seconds
      document.getElementById("unpauseTime").value =
        data.unpauseTime !== undefined ? data.unpauseTime : 5; // Default to 5 seconds
        console.log(data.unpauseTime);
      document.getElementById("autoUnpauseToggle").checked =
        data.autoUnpause !== undefined ? data.autoUnpause : false; // Default to false
      if (data.activeTabId) {
        activeTabId = data.activeTabId;
      }
    }
  );
  //Start the extension via button
  document.getElementById("startButton").addEventListener("click", () => {
    console.log("Image clicked!");
    startExtensionOnActiveTab();
  });

  //Stop extension via button
  document.getElementById("stopButton").addEventListener("click", () => {
    sendMessageToContentScript("stop");
  });
  // Event to switch between tabs upon button click in popup
  document
    .getElementById("controlsTab")
    .addEventListener("click", showControlsTab);
  document
    .getElementById("savedNotesTabButton")
    .addEventListener("click", showSavedNotesTab);


function startExtensionOnActiveTab() {
  // Query the currently active tab
  sendMessageToContentScript("start");
}

function sendMessageToContentScript(action) {
  const pauseTime = document.getElementById("pauseTime").value;
  const unpauseTime = document.getElementById("unpauseTime").value;
  const autoUnpause = document.getElementById("autoUnpauseToggle").checked;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0].id;

    // Check if we're on YouTube before trying to inject the content script
    if (tabs[0].url) {
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTabId },
          files: ["/scripts/content.js"],
        },
        () => {
          chrome.tabs.sendMessage(
            activeTabId,
            {
              action,
              pauseTime,
              unpauseTime,
              autoUnpause,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error sending message to content script: ",
                  chrome.runtime.lastError.message
                );
              } else {
                console.log(
                  "Message sent successfully to content script:",
                  response
                );
              }
            }
          );
        }
      );
    } else {
      console.error("Problem with tabs[0].url.");
    }
  });
}

function updateAndRestart() {
  //fetch current user-entered values to create timers
  const pauseTime = document.getElementById("pauseTime").value;
  const unpauseTime = document.getElementById("unpauseTime").value;
  const autoUnpause = document.getElementById("autoUnpauseToggle").checked;

  // Persist updated values to storage
  chrome.storage.sync.set({ pauseTime, unpauseTime, autoUnpause }, () => {
    console.log("Updated settings saved.");
  });

  // Wait for 5 seconds before restarting the extension
  setTimeout(() => {
    sendMessageToContentScript("restart"); // Restart after 2-second delay
  }, 2000);
}

async function getActiveTabUrl() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "get-active-tab-url" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response.tabUrl); // Resolve with the active tab's URL
      }
    });
  });
}
// Start recording audio
async function toggleAudioRecording() {
  if (!isRecording) {
    let activeTabUrl = await getActiveTabUrl();

    const response = await sendMessageAsync({
      action: "start-recording",
      tabUrl: activeTabUrl,
    });
    if (response.status === "Recording started") {
      isRecording = true;
      chrome.storage.local.set({ isRecording }); // Save state to local storage
      document.getElementById("addAudioNoteButton").innerText =
        "Pause audio note";
      document.getElementById("saveAudioNoteButton").classList.remove("hidden");
    }
  } else {
    const response = await sendMessageAsync({
      action: isRecording ? "pause-recording" : "resume-recording",
    });
    if (response.status === "Recording paused") {
      isRecording = false;
      chrome.storage.local.set({ isRecording }); // Save state to local storage
      document.getElementById("addAudioNoteButton").innerText =
        "Resume audio note";
    } else if (response.status === "Recording resumed") {
      isRecording = true;
      chrome.storage.local.set({ isRecording }); // Save state to local storage
      document.getElementById("addAudioNoteButton").innerText =
        "Pause audio note";
    }
  }
}

async function stopAudioRecording() {
  const response = await sendMessageAsync({ action: "stop-recording" });
  if (response.status === "Recording stopped") {
    console.log("Recording stopped");
    isRecording = false;
    chrome.storage.local.set({ isRecording }); // Update state to reflect stopped recording
    document.getElementById("addAudioNoteButton").innerText = "Add audio note";
    document.getElementById("saveAudioNoteButton").classList.add("hidden");
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "audioSaved") {
    // Audio has been saved, so reload the UI to display the new audio
    reloadUI();
  }

  if (message.action === "add/pause-button") {
    const add_pause_button = document.getElementById("addAudioNoteButton");
    if (add_pause_button) add_pause_button.click();
  }
});

async function reloadUI() {
  audioNotesList = document.getElementById("audioNotesList");
  tabMatch = document.getElementById("URLMatch");
  nonMatch = document.getElementById("nonMatch");
  if (tabMatch) tabMatch.innerHTML += "";
  if (nonMatch) nonMatch.innerHTML += "";
  let ID_number = 0;

  audioNotesToLoad.forEach(async (note) => {
    // Convert the base64 back to a Blob
    const audioUrl = note.fileName;
    console.log("This is the fileURL on reload():", audioUrl);
    const originURL = note.tabUrl;
    const caption = note.userInputContext;
    console.log("This is their downloadID: ", note.downloadId);
    let activeTabUrl = await getActiveTabUrl();

    if (note.tabUrl === activeTabUrl) {
      const audioElementHTML = `<label lang="en" style="overflow-wrap: break-word; hyphens: auto;">${caption}</label>
      <div class="element" style="display: flex; align-items: center; font-family: Arial, sans-serif; font-size: 16px; margin-bottom: 10px;">
      
      <audio type="audio/webm" id="elementAudio${ID_number}" controls src="${audioUrl}" style="flex:4;"></audio>
      <a href="${originURL}" target="_blank" rel="noopener noreferrer"><img src="/images/findSource.png" style="flex:1; max-width: 20px; border-radius: 4px;"></a>
      </div>`;

      tabMatch.insertAdjacentHTML(
        "beforebegin",
        "<h4>Notes From This Page</h4>"
      );
      tabMatch.innerHTML += audioElementHTML;
    } else {
      const audioElementHTML = `<label lang="en" style="overflow-wrap: break-word; hyphens: auto;">${caption}</label>
      <div class="element" style="display: flex; align-items: center; font-family: Arial, sans-serif; font-size: 16px; margin-bottom: 10px;">
      <audio type="audio/webm" id="elementAudio${ID_number}" controls src="${audioUrl}" style="flex:4;"></audio>
      <a href="${originURL}" target="_blank" rel="noopener noreferrer"><img src="/images/findSource.png" style="flex:1; max-width: 20px; border-radius: 4px;"></a>
      </div>`;

      nonMatch.innerHTML += audioElementHTML;
    }

    /*string = "elementAudio" + ID_number
    audioElement = document.getElementById(string);
      audioElement.addEventListener('click', loadControls(audioElement));*/
    ID_number++;
  });
}
/*
function loadControls(clickedAudioElement) {
  // Get all audio elements on the page
  // Find the playing audio element
  // Get the source URL of the playing audio

  clickedAudioElement.insertAdjacentHTML(
    "beforebegin",
    `
      <div class="row">
        <img id="rewind" src="/images/rewind.png">
        <img id="fastfoward" src="/images/fastforward.png">
      </div>
    `
  );

  document
    .getElementById("rewind")
    .addEventListener(
      "click",
      alterAudioTime("rewind", clickedAudioElement)
    );
}

function alterAudioTime(instruction, clickedAudioElement) {
  // Get all audio elements on the page
  const NUM_SECONDS = 5;

  if (instruction === "rewind") {
    source.fastSeek(clickedAudioElement.curentTime - NUM_SECONDS);
  } else if (instruction === "fastForward") {
    source.fastSeek(clickedAudioElement.curentTime + NUM_SECONDS);
  }
}
*/

// Function to convert a base64-encoded string to a Blob
function base64ToBlob(base64, type = "audio/webm") {
  if (!base64) {
    alert(
      "base64ToBlob (reloading UI error) Base64 data is undefined or null."
    );
    return null;
  }

  // Strip off the data URI scheme if it exists (e.g., "data:audio/webm;base64,")
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;

  try {
    const byteCharacters = atob(base64Data); // Decode base64 string
    const byteArrays = [];
    console.log("created ByteChars and byteArrays");
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: "audio/webm" });
  } catch (e) {
    alert("Error creating Blob from base64: ", e);
    return null;
  }
}

function dragAudio(event, blob, fileName) {
  // Create a File object from the Blob
  const wavFileName = fileName.replace(/\.\w+$/, ".wav"); // Replace the current extension with .wav
  alert("Failure happens here!");

  // Create a File object from the Blob and set the MIME type to .wav
  const file = new File([blob], wavFileName, { type: "audio/wav" });

  // Use the DataTransfer API to attach the file to the drag event
  const dataTransfer = event.dataTransfer;
  dataTransfer.effectAllowed = "copy"; // Allow copy operation
  dataTransfer.items.add(file); // Attach the file
  console.log("Dragging audio file as .wav:", wavFileName);
}

// Function to clear all saved audio notes
async function clearAllAudioNotes() {
  // Clear the array that stores the saved audio notes in memory
  console.log("Button not functional rn");
  /* audioNotesToLoad = [];
  audioNotesToLoad.forEach( async (note) => {
    chrome.downloads.removeFile(note.downloadId);
  }); */
  // Clear the saved notes from Chrome's local storage

  // Update the UI to reflect the cleared list
  window.showOpenFilePicker({ multiple: "true", id: "AudioNotes" });

  if (audioNotesToLoad) {
    chrome.storage.local.remove("savedAudioNotes");
    audioNotesToLoad = [];
    audioNotesList = document.getElementById("audioNotesList");
    while (audioNotesList.firstChild) {
      audioNotesList.removeChild(audioNotesList.lastChild);
    }
  }
}

// Show the controls tab
function showControlsTab() {
  document.getElementById("controlsTabContent").classList.remove("hidden");
  document.getElementById("savedNotesTab").style.display = "none";
  document.getElementById("savedNotesTab").classList.add("hidden");
  document.getElementById("controlsTab").classList.add("active-tab");
  document.getElementById("savedNotesTabButton").classList.remove("active-tab");
}

// Show the saved notes tab
function showSavedNotesTab() {
  document.getElementById("controlsTabContent").classList.add("hidden");
  document.getElementById("savedNotesTab").classList.remove("hidden");
  document.getElementById("savedNotesTab").style.display = "block";
  document.getElementById("controlsTab").classList.remove("active-tab");
  document.getElementById("savedNotesTabButton").classList.add("active-tab");

  reloadUI();
}

async function sendMessageAsync(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}
