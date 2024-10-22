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
    document.getElementById('clearAudioNotesButton').addEventListener('click', clearAllAudioNotes);


    // Switch between tabs
    document.getElementById('controlsTab').addEventListener('click', showControlsTab);
    document.getElementById('savedNotesTabButton').addEventListener('click', showSavedNotesTab);

    document.addEventListener('DOMContentLoaded', () => {
      chrome.storage.sync.get(['savedAudioNotes'], (data) => {
        if (data.savedAudioNotes) {
          savedAudioNotes = data.savedAudioNotes;
          updateAudioNotesList();
        }
      });
    });
});
function startExtensionOnActiveTab() {
  // Query the currently active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url.includes('youtube.com')) {
      activeTabId = tabs[0].id;
      sendMessageToContentScript('start');
    } else {
      console.error('Not a YouTube tab.');
    }
  });
  
}


function sendMessageToContentScript(action) {
  const pauseTime = document.getElementById('pauseTime').value;
  const unpauseTime = document.getElementById('unpauseTime').value;
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
        alert('Content script is not responding.');
      } else {
        console.log("Message sent successfully to the content script.");
      }
    });
    
  } else {
    console.error("No active tab ID found.");
  }
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
  alert('try trigger authorization');

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      alert('Audio recording started');
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
    alert('Audio recording paused');
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
  const fileName = `audio_note_${new Date().toISOString()}.webm`;

  alert(audioUrl);
  // Create the audio element
  const audioElement = `
    <div class="element" style="font-family: Arial, sans-serif; font-size: 16px; margin-bottom: 10px;" draggable="true" ondragstart="dragAudio(event, '${audioUrl}', '${fileName}')">
      <p>Saved Audio Note:</p>
      <audio controls src="${audioUrl}" style="width: 100%;"></audio>
    </div>`;

  // Push the audio note to the savedAudioNotes array
  savedAudioNotes.push(audioElement);

  // Store the updated audio notes in Chrome storage
  chrome.storage.sync.set({ savedAudioNotes }, () => {
    alert('Audio notes saved to storage');
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

  mediaRecorder = null;
}


// Update the list of saved audio notes
function updateAudioNotesList() {
  const audioNotesList = document.getElementById('audioNotesList');
  audioNotesList.innerHTML = savedAudioNotes.join('');
  console.log('Audio notes list updated');

}

// Function to clear all saved audio notes
function clearAllAudioNotes() {
  // Clear the array that stores the saved audio notes
  savedAudioNotes = [];

  // Clear the UI where the audio notes are displayed
  const audioNotesList = document.getElementById('audioNotesList');
  audioNotesList.innerHTML = '';  // Remove all the notes from the UI

  // Clear the saved notes from Chrome's storage
  chrome.storage.sync.remove('savedAudioNotes', () => {
    console.log('All saved audio notes have been erased.');
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
  updateAudioNotesList();
}