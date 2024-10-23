let activeTabId = null;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let savedAudioNotes = [];

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['pauseTime', 'unpauseTime', 'autoUnpause', 'activeTabId', 'savedAudioNotes'], (data) => {
    document.getElementById('pauseTime').value = (data.pauseTime !== undefined ? data.pauseTime : 10);  // Default to 10 seconds
    document.getElementById('unpauseTime').value = (data.unpauseTime !== undefined ? data.unpauseTime : 5);  // Default to 5 seconds
    document.getElementById('autoUnpauseToggle').checked = (data.autoUnpause !== undefined ? data.autoUnpause : false);  // Default to false
    if (data.activeTabId) {
      activeTabId = data.activeTabId;
    }
  });

  chrome.storage.local.get(['savedAudioNotes'], (data) => {
    if (data.savedAudioNotes) {
      savedAudioNotes = data.savedAudioNotes;  // Load saved audio notes
      updateAudioNotesList();  // Update the UI to display the saved notes
    } else {
      console.log('No saved audio notes found.');
    }
  });

  
    document.getElementById('pauseTime').addEventListener('input', updateAndRestart);
    document.getElementById('unpauseTime').addEventListener('input', updateAndRestart);
    document.getElementById('autoUnpauseToggle').addEventListener('change', updateAndRestart);
  
    document.getElementById('startButton').addEventListener('click', () => {
      startExtensionOnActiveTab();
    });
    document.getElementById('stopButton').addEventListener('click', () => {
      sendMessageToContentScript('stop');
    });

    // Event for starting and stopping audio recording
    document.getElementById('addAudioNoteButton').addEventListener('click', toggleAudioRecording);
    // Event to save the audio note
    document.getElementById('saveAudioNoteButton').addEventListener('click', saveAudioNote);
    document.getElementById('clearAudioNotesButton').addEventListener('click', clearAllAudioNotes);


    // Switch between tabs
    document.getElementById('controlsTab').addEventListener('click', showControlsTab);
    document.getElementById('savedNotesTabButton').addEventListener('click', showSavedNotesTab);

    document.addEventListener('DOMContentLoaded', () => {
      chrome.storage.local.get(['savedAudioNotes'], (data) => {
        if (data.savedAudioNotes) {
          savedAudioNotes = data.savedAudioNotes;
          updateAudioNotesList();
        }
      });
    });
});
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
    if (tabs[0].url.includes('youtube.com')) {
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
      console.error('This is not a YouTube tab.');
    }
  });  
}

function updateAndRestart() {
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
function toggleAudioRecording() {
  console.log('Audio recording toggled'); // Debug log
  if (!isRecording) {
    startAudioRecording();
  } else {
    pauseAudioRecording();
  }
}

// Start recording the audio
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

// Function to convert a Blob to a base64-encoded string
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Check if the Blob is valid
    if (!blob || blob.size === 0) {
      return reject(new Error("Blob is empty or invalid."));
    }

    reader.onloadend = () => {
      resolve(reader.result);  // Resolve the base64-encoded data URL
    };

    reader.onerror = (err) => {
      reject(new Error("Failed to convert Blob to base64."));
    };

    try {
      reader.readAsDataURL(blob);  // Attempt to read the Blob as a base64 data URL

    } catch (error) {
      reject(new Error("FileReader failed to read the Blob."));
    }
  });

}

// Function to save the recorded audio note
// Function to save the recorded audio note
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
      // Convert the Blob to base64
      const base64Blob = await blobToBase64(blob);

      // Now you can save the base64Blob (which contains the base64 string) to storage
      const fileName = `audio_note_${new Date().toISOString()}.webm`;

      // Create the audio element metadata to save
      const audioElement = {
        fileName,
        base64Blob  // This is the base64 string that will be stored
      };

      // Push the audio note to the savedAudioNotes array
      savedAudioNotes.push(audioElement);

      // Store the updated audio notes in Chrome storage (local)
      chrome.storage.local.set({ savedAudioNotes }, () => {
        // Update the UI with the new audio note
        updateAudioNotesList();
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


// Function to convert a base64-encoded string to a Blob
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


// Function to update the list of saved audio notes
function updateAudioNotesList() {
  const audioNotesList = document.getElementById('audioNotesList');

  savedAudioNotes.forEach(note => {
    // Convert the base64 back to a Blob
    const blob = base64ToBlob(note.base64Blob);
    
    // Create a fresh audio URL for the Blob
    const audioUrl = URL.createObjectURL(blob);
    
    // Create the audio element with the regenerated URL
    const audioElementHTML = `
      <div class="element" style="font-family: Arial, sans-serif; font-size: 16px; margin-bottom: 10px;" draggable="true" ondragstart="dragAudio(event, '${audioUrl}', '${note.fileName}')">
        <p>Saved Audio Note:</p>
        <audio controls src="${audioUrl}" style="width: 100%;"></audio>
      </div>`;

    // Append the audio element to the list
    audioNotesList.innerHTML += audioElementHTML;
  });

  console.log('Audio notes list updated.');
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
  document.getElementById('controlsTabContent').style.display = 'block';
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


