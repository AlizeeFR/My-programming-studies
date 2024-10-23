let activeTabId = null;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let savedAudioNotes = [];

document.addEventListener('DOMContentLoaded', async() => {
  const response = await chrome.runtime.sendMessage({ action: 'get-status' });
  const state = response.recordingState;
    
    if (state === 'recording') {
      isRecording = true;
      document.getElementById('addAudioNoteButton').innerText = 'Pause audio note';
      document.getElementById('saveAudioNoteButton').classList.remove('hidden');
    } else if (state === 'paused') {
      isRecording = false;
      document.getElementById('addAudioNoteButton').innerText = 'Resume audio note';
      document.getElementById('saveAudioNoteButton').classList.remove('hidden');
    } else {
      // If stopped, show default state
      isRecording = false;
      document.getElementById('addAudioNoteButton').innerText = 'Add audio note';
      document.getElementById('saveAudioNoteButton').classList.add('hidden');
    }
  });

    // Event for starting and stopping audio recording
    document.getElementById('addAudioNoteButton').addEventListener('click', toggleAudioRecording);
    // Event to save the audio note
    document.getElementById('saveAudioNoteButton').addEventListener('click', stopAudioRecording);
    //Event to delete notes from storage
    document.getElementById('clearAudioNotesButton').addEventListener('click', clearAllAudioNotes);

  chrome.storage.sync.get(['pauseTime', 'unpauseTime', 'autoUnpause', 'activeTabId'], (data) => {
    document.getElementById('pauseTime').value = (data.pauseTime !== undefined ? data.pauseTime : 10);  // Default to 10 seconds
    document.getElementById('unpauseTime').value = (data.unpauseTime !== undefined ? data.unpauseTime : 5);  // Default to 5 seconds
    document.getElementById('autoUnpauseToggle').checked = (data.autoUnpause !== undefined ? data.autoUnpause : false);  // Default to false
    if (data.activeTabId) {
      activeTabId = data.activeTabId;
    }
  });

  chrome.storage.local.get(['isRecording', 'savedAudioNotes'], (data) => {
    isRecording = data.isRecording || false;
    if (isRecording) {
      document.getElementById('addAudioNoteButton').innerText = 'Pause audio note';
      document.getElementById('saveAudioNoteButton').classList.remove('hidden');
    } else {
      document.getElementById('addAudioNoteButton').innerText = 'Add audio note';
      document.getElementById('saveAudioNoteButton').classList.add('hidden');
    }

    if (data.savedAudioNotes) {
      savedAudioNotes = data.savedAudioNotes;  // Load saved audio notes into data
      reloadUI();
    } else {
      console.log('No saved audio notes found.');
    }
  });

    //update variables and restart timers upon user input change
    document.getElementById('pauseTime').addEventListener('input', updateAndRestart);
    document.getElementById('unpauseTime').addEventListener('input', updateAndRestart);
    document.getElementById('autoUnpauseToggle').addEventListener('change', updateAndRestart);

    //Start the extension via button
    document.getElementById('startButton').addEventListener('click', () => {
      startExtensionOnActiveTab();
    });

    //Stop extension via button
    document.getElementById('stopButton').addEventListener('click', () => {
      sendMessageToContentScript('stop');
    });
    // Event to switch between tabs upon button click in popup
    document.getElementById('controlsTab').addEventListener('click', showControlsTab);
    document.getElementById('savedNotesTabButton').addEventListener('click', showSavedNotesTab);

    function startExtensionOnActiveTab() {
  // Query the currently active tab
      sendMessageToContentScript('start'); 
}


function sendMessageToContentScript(action) {

  const pauseTime = document.getElementById('pauseTime').value;
  const unpauseTime = document.getElementById('unpauseTime').value;
  const autoUnpause = document.getElementById('autoUnpauseToggle').checked;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTabId = tabs[0].id;
  
    // Check if we're on YouTube before trying to inject the content script
    if (tabs[0].url) {
      chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ['content.js']
      }, () => {
        chrome.tabs.sendMessage(activeTabId, {
          action,
          pauseTime,
          unpauseTime,
          autoUnpause
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script: ", chrome.runtime.lastError.message);
          } else {
            console.log("Message sent successfully to content script:", response);
          }
        });
      });
    } else {
      console.error('Problem with tabs[0].url.');
    }
  });  
}

function updateAndRestart() {
  //fetch current user-entered values to create timers
  const pauseTime = document.getElementById('pauseTime').value;
  const unpauseTime = document.getElementById('unpauseTime').value;
  const autoUnpause = document.getElementById('autoUnpauseToggle').checked;

  // Persist updated values to storage
  chrome.storage.sync.set({ pauseTime, unpauseTime, autoUnpause }, () => {
    console.log('Updated settings saved.');
  });

  // Wait for 5 seconds before restarting the extension
  setTimeout(() => {
    sendMessageToContentScript('restart');  // Restart after 2-second delay
  }, 2000);
}


// Start recording audio
async function toggleAudioRecording() {
  if(!isRecording){
    const response = await sendMessageAsync({ action: 'start-recording'});
      if (response.status === 'Recording started') {
        alert("This is your thingy!", response.status);
        isRecording = true;
        chrome.storage.local.set({ isRecording }); // Save state to local storage
        document.getElementById('addAudioNoteButton').innerText = 'Pause audio note';
        document.getElementById('saveAudioNoteButton').classList.remove('hidden');
      }  
  } else {
    const response = await sendMessageAsync({ action: isRecording ? 'pause-recording' : 'resume-recording' });
      if (response.status === 'Recording paused') {
        isRecording = false;
        chrome.storage.local.set({ isRecording }); // Save state to local storage
        document.getElementById('addAudioNoteButton').innerText = 'Resume audio note';
      } else if (response.status === 'Recording resumed') {
        isRecording = true;
        chrome.storage.local.set({ isRecording }); // Save state to local storage

        document.getElementById('addAudioNoteButton').innerText = 'Pause audio note';
      }
  }
}

/* Start recording the audio
function startAudioRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
      console.log('Starting audio recording...');
      mediaRecorder.start();
      isRecording = true;
      document.getElementById('addAudioNoteButton').innerText = 'Pause audio note';
      document.getElementById('saveAudioNoteButton').classList.remove('hidden');
    })
    .catch(error => {
      console.error('Error accessing microphone: ', error);
      alert('Microphone access is required for recording. Please allow microphone access.');
      if (error.name === 'NotAllowedError') {
        alert('You have dismissed the microphone permission request. Please enable it from your browser settings.');
      } else {
        console.error('Error accessing microphone: ', error);
      }
    });
}



// Pause the recording
function pauseAudioRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.pause();
    document.getElementById('addAudioNoteButton').innerText = 'Resume audio note';
  } else if (mediaRecorder && mediaRecorder.state === "paused") {
    mediaRecorder.resume();
    document.getElementById('addAudioNoteButton').innerText = 'Pause audio note';
  }
}
*/

async function stopAudioRecording() {
  const response = await sendMessageAsync({ action: 'stop-recording'});
    if (response.status === 'Recording stopped') {
      console.log('Recording stopped');
      isRecording = false;
      chrome.storage.local.set({ isRecording }); // Update state to reflect stopped recording

      document.getElementById('addAudioNoteButton').innerText = 'Add audio note';
      document.getElementById('saveAudioNoteButton').classList.add('hidden');
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'audioSaved') {
    // Audio has been saved, so reload the UI to display the new audio
    reloadUI();
  }
});


/* Function to save the recorded audio note
async function saveAudioNote() {
  // Ensure mediaRecorder is in a valid state to stop recording
  if (mediaRecorder && (mediaRecorder.state === "recording" || mediaRecorder.state === "paused")) {
    mediaRecorder.stop();  // Stop the recording completely
  } else if (!mediaRecorder) {
    console.error('MediaRecorder is not initialized.');
    return;
  } else {
    console.error('MediaRecorder is not in a recording state.');
    return;
  }

  // Once the mediaRecorder stops, process the recorded audio
  mediaRecorder.onstop = async () => {

    // Create a blob from the audio chunks collected
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    
    try {
      // Convert the Blob to base64 so it can be saved into a filename string
      const base64Blob = await blobToBase64(blob);
      // Get the current tab's URL
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabUrl = tabs[0].url;  // Get the URL of the active tab
        // Now you can save both the base64Blob and the tab URL to storage
        const fileName = `audio_note_${new Date().toISOString()}.webm`;
        userInputContext = "";

        // Create the audio element metadata to save
        const audioElement = {
          fileName,
          base64Blob,  // This is the base64 string that will be stored
          tabUrl,       // Save the origin URL where the note was taken
          userInputContext
        };
        savedAudioNotes.push(audioElement);
        // Push the audio note to the savedAudioNotes array
        // Store the updated audio notes in Chrome storage (local)
        chrome.storage.local.set({ savedAudioNotes }, () => {
          // Update the UI with the new audio note
          reloadUI();
        });
      });




      // Clear the audio chunks after saving
      audioChunks = [];
      document.getElementById('saveAudioNoteButton').classList.add('hidden');
      document.getElementById('addAudioNoteButton').innerText = 'Add audio note';  // Reset button text
      isRecording = false;

      // Stop the media stream from accessing the microphone
      if (mediaRecorder && mediaRecorder.stream) {
        const tracks = mediaRecorder.stream.getTracks();
        tracks.forEach(track => track.stop());
      }

      mediaRecorder = null;  // Clean up the media recorder
    } catch (error) {
      alert("Error converting Blob to base64:", error);
    }
  };
}
*/

function reloadUI(){

  audioNotesList = document.getElementById('audioNotesList');
  savedAudioNotes.forEach(note => {
    // Convert the base64 back to a Blob
    const myblob = base64ToBlob(note.base64Blob);
    const audioUrl = URL.createObjectURL(myblob);
    const originURL = note.tabUrl;

    const audioElementHTML = `
    <div class="element" style="display: flex; align-items: center; font-family: Arial, sans-serif; font-size: 16px; margin-bottom: 10px;">
    
    <audio controls src="${audioUrl}" style="flex:4;"></audio>
    <a href="${originURL}" target="_blank" rel="noopener noreferrer"><img src="findSource.png" style="flex:1; max-width: 20px; border-radius: 4px;"></a>

    </div>`;

    audioNotesList.innerHTML += audioElementHTML;
  });
}


// Function to convert a base64-encoded string to a Blob
function base64ToBlob(base64, type = 'audio/webm') {
  if (!base64) {
    alert("base64ToBlob (reloading UI error) Base64 data is undefined or null.");
    return null;
  }

  // Strip off the data URI scheme if it exists (e.g., "data:audio/webm;base64,")
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;

  try {
    const byteCharacters = atob(base64Data);  // Decode base64 string
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type });
  } catch (e) {
    alert("Error creating Blob from base64: ", e);
    return null;
  }
}

function dragAudio(event, blob, fileName) {
  // Create a File object from the Blob
  const wavFileName = fileName.replace(/\.\w+$/, '.wav');  // Replace the current extension with .wav
  alert("Failure happens here!");

  // Create a File object from the Blob and set the MIME type to .wav
  const file = new File([blob], wavFileName, { type: 'audio/wav' });

  // Use the DataTransfer API to attach the file to the drag event
  const dataTransfer = event.dataTransfer;
  dataTransfer.effectAllowed = 'copy';  // Allow copy operation
  dataTransfer.items.add(file);  // Attach the file
  console.log('Dragging audio file as .wav:', wavFileName);

}



// Function to clear all saved audio notes
function clearAllAudioNotes() {
  // Clear the array that stores the saved audio notes in memory
  savedAudioNotes = [];

  // Clear the saved notes from Chrome's local storage
  chrome.storage.local.remove('savedAudioNotes', () => {
    console.log('All saved audio notes have been removed from local storage.');
    
    // Update the UI to reflect the cleared list

    const audioNotesList = document.getElementById('audioNotesList');
    while (audioNotesList.firstChild) {
      audioNotesList.removeChild(audioNotesList.firstChild);  // Remove all child elements (audio notes)
    }

    alert('All saved audio notes have been deleted.');
  });
}


// Show the controls tab
function showControlsTab() {
  document.getElementById('controlsTabContent').classList.remove('hidden');
  document.getElementById('savedNotesTab').style.display = 'none';
  document.getElementById('savedNotesTab').classList.add('hidden');
  document.getElementById('controlsTab').classList.add('active-tab');
  document.getElementById('savedNotesTabButton').classList.remove('active-tab');
}

// Show the saved notes tab
function showSavedNotesTab() {
  document.getElementById('controlsTabContent').classList.add('hidden');
  document.getElementById('savedNotesTab').classList.remove('hidden');
  document.getElementById('savedNotesTab').style.display = 'block';
  document.getElementById('controlsTab').classList.remove('active-tab');
  document.getElementById('savedNotesTabButton').classList.add('active-tab');
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
