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

  async function forwardToOffscreenDocument(message) {
    await ensureOffscreenDocument(); // Make sure the offscreen document is created
  
    // Add a target identifier to indicate that the message is intended for the offscreen document
    message.target = 'offscreen';
  
    // Forward the message to the offscreen document
    const response = await chrome.runtime.sendMessage(message)
    if (response.recordingState === 'recording') {
      isRecording = true;
    }
    sendResponse(response); // Relay response back to the original sender
    return true;
  }
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (['get-status', 'start-recording', 'pause-recording', 'resume-recording', 'stop-recording'].includes(message.action)) {
      forwardToOffscreenDocument(message, sendResponse)
        .then(response => {
          // Forward the response from forwardToOffscreenDocument
          sendResponse(response);
        })
        .catch(error => {
          console.error('Error forwarding message:', error);
          sendResponse({ error: error.message });
        });
  
      return true; // Indicates sendResponse will be called asynchronously
    }
  });
  
  