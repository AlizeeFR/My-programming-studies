let activeTabId = null;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let savedAudioNotes = [];

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['pauseTime', 'unpauseTime', 'autoUnpause', 'activeTabId', 'savedAudioNotes'], (data) => {
    if (data.pauseTime !== undefined && !isNaN(data.pauseTime)) {
      document.getElementById('pauseTime').value = data.pauseTime;
    }
    if (data.unpauseTime !== undefined && !isNaN(data.unpauseTime)) {
      document.getElementById('unpauseTime').value = data.unpauseTime;
    }
    if (data.autoUnpause !== undefined) {
      document.getElementById('autoUnpauseToggle').checked = data.autoUnpause;
    }
    if (data.activeTabId) {
      activeTabId = data.activeTabId;
    }
    if (data.savedAudioNotes) {
      savedAudioNotes = data.savedAudioNotes;
      updateAudioNotesList();
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

    // Switch between tabs
    document.getElementById('controlsTab').addEventListener('click', showControlsTab);
    document.getElementById('savedNotesTabButton').addEventListener('click', showSavedNotesTab);
});
function startExtensionOnActiveTab() {
  // Get the active tab and start the extension on it
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    activeTabId = tabs[0].id;  // Store the active tab ID

    // Save the active tab ID so that it persists across popup opens
    chrome.storage.sync.set({ activeTabId });

    sendMessageToContentScript('start');  // Start the extension on the active tab
  });
}

function sendMessageToContentScript(action) {
  const pauseTime = parseInt(document.getElementById('pauseTime').value, 10);
  const unpauseTime = parseInt(document.getElementById('unpauseTime').value, 10);
  const autoUnpause = document.getElementById('autoUnpauseToggle').checked;

  if (activeTabId !== null) {
    // Send a message to the content script running on the active tab
    chrome.tabs.sendMessage(activeTabId, {
      action,
      pauseTime,
      unpauseTime,
      autoUnpause
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error: ", chrome.runtime.lastError.message);
      } else {
        console.log("Message sent successfully to the content script.");
      }
    });
  } else {
    console.error("No active tab ID found.");
  }
}

function updateAndRestart() {
  sendMessageToContentScript('restart');
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
  console.log('try trigger authorization');

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      console.log('Audio recording started');
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
      console.log('Starting audio recording...');
      mediaRecorder.start();
      console.log('Starting audio recording...');
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
    console.log('Audio recording paused');
  } else if (mediaRecorder && mediaRecorder.state === "paused") {
    mediaRecorder.resume();
    document.getElementById('addAudioNoteButton').innerText = 'Pause audio note';
    console.log('Audio recording resumed');
  }
}

// Save the recorded audio note
function saveAudioNote() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop(); // Stop the recording completely
    console.log('Audio recording stopped and saved');
  }

  const blob = new Blob(audioChunks, { type: 'audio/webm' });
  const audioUrl = URL.createObjectURL(blob);
  
  // Create the audio element
  const audioElement = `
    <div style="font-family: Arial, sans-serif; font-size: 16px; margin-bottom: 10px;">
      <p>Saved Audio Note:</p>
      <audio controls src="${audioUrl}" style="width: 100%;"></audio>
    </div>`;

  // Push the audio note to the savedAudioNotes array
  savedAudioNotes.push(audioElement);

  // Store the updated audio notes in Chrome storage
  chrome.storage.sync.set({ savedAudioNotes }, () => {
    console.log('Audio notes saved to storage');
    // Update the UI with the new audio note
    updateAudioNotesList();
  });

  // Clear the audio chunks after saving
  audioChunks = [];
  document.getElementById('saveAudioNoteButton').classList.add('hidden');
  document.getElementById('addAudioNoteButton').innerText = 'Add audio note';  // Reset button text
  isRecording = false;
}


// Update the list of saved audio notes
function updateAudioNotesList() {
  const audioNotesList = document.getElementById('audioNotesList');
  audioNotesList.innerHTML = savedAudioNotes.join('');
  console.log('Audio notes list updated');

}

// Show the controls tab
function showControlsTab() {
  document.getElementById('controlsTabContent').classList.remove('hidden');
  document.getElementById('savedNotesTab').classList.add('hidden');
  document.getElementById('controlsTab').classList.add('active-tab');
  document.getElementById('savedNotesTabButton').classList.remove('active-tab');
}

// Show the saved notes tab
function showSavedNotesTab() {
  document.getElementById('controlsTabContent').classList.add('hidden');
  document.getElementById('savedNotesTab').classList.remove('hidden');
  document.getElementById('controlsTab').classList.remove('active-tab');
  document.getElementById('savedNotesTabButton').classList.add('active-tab');
  updateAudioNotesList();
}

