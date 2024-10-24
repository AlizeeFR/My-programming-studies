let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordingState = false;

chrome.runtime.onInstalled.addListener(() => {
    console.log("YouTube Auto Pause Extension Installed");
  });
console.log("Background script running...");

  

  async function ensureOffscreenDocument() {
    // Check if the offscreen document is already created
    const offscreenUrl = 'offscreen.html';  // Path to the offscreen document
  
    if (await chrome.offscreen.hasDocument()) {
      return;
    }
  
    // Create the offscreen document
    try{await chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: ['USER_MEDIA'],
      justification: 'Capturing audio from background script to take notes.'
    });
    } catch (error) {
      alert("Error on creating offscreen.html");
    }
  }

  async function forwardToOffscreenDocument(message, sendResponse) {
    await ensureOffscreenDocument(); // Make sure the offscreen document is created
  
    // Add a target identifier to indicate that the message is intended for the offscreen document
    message.target = 'offscreen';
  
    // Forward the message to the offscreen document
    console.log("I'm sending this message:", message);
    const response = await chrome.runtime.sendMessage(message, (response)=>{
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError.message);
      } else {
          console.log('Response from audioServices:', response);
          sendResponse(response); // Relay response back to the original sender
      }
      return true;
    });
    return true;
  }
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action === 'save-audio-note') {
      // Retrieve saved audio notes and add the new one
      chrome.storage.local.get(['savedAudioNotes'], (data) => {
        const savedAudioNotes = data.savedAudioNotes || [];
        savedAudioNotes.push(message.audioElement);
  
        // Save the updated audio notes back to local storage
        chrome.storage.local.set({ savedAudioNotes }, () => {
          console.log('Audio note saved to storage.');
          sendResponse({ success: true });
        });
      });
      return true;  // Keeps the message port open for async response
    }
  
    if (['get-status', 'start-recording', 'pause-recording', 'resume-recording', 'stop-recording'].includes(message.action)) {
      forwardToOffscreenDocument(message, sendResponse);
      return true; // Indicates sendResponse will be called asynchronously
    }
    return true;
  });
  
  