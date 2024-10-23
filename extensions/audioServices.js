let originTabUrl;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let savedAudioNotes = [];
let recordingState = 'stopped';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target === 'offscreen') {

    if (message.action === 'start-recording') {
        startAudioRecording();
        recordingState = 'recording';
        sendResponse({ status: 'Recording started', recordingState });
      } else if (message.action === 'pause-recording') {
        pauseAudioRecording();
        recordingState = 'paused';
        sendResponse({ status: 'Recording paused', recordingState });
      } else if (message.action === 'resume-recording') {
        resumeAudioRecording();
        recordingState = 'recording';
        sendResponse({ status: 'Recording resumed', recordingState });
      } else if (message.action === 'stop-recording') {
        stopAudioRecording();
        recordingState = 'stopped';
        sendResponse({ status: 'Recording stopped', recordingState });
      }
    }
});

  
 function startAudioRecording() {
    if (isRecording) {
        console.log('Already recording');
        return;
      }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
      mediaRecorder.start();
      isRecording = true;
      recordingState = 'recording';  // Update state to recording
      console.log('Recording started in background');

    })
    .catch(error => {
      console.error('Error accessing microphone:', error);
    });
  }
  
  function pauseAudioRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause();
      recordingState = 'paused';  // Update state to paused
      console.log('Recording paused');
    }
  }
  
  function resumeAudioRecording() {
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume();
      recordingState = 'recording';  // Update state to recording
      console.log('Recording resumed');
    }
  }
  
 function stopAudioRecording(mediaRecorder, sendResponse) {
    if (mediaRecorder && (mediaRecorder.state === "recording" || mediaRecorder.state === "paused")) {
        mediaRecorder.stop();  // Stop the recording completely
        // Once the mediaRecorder stops, process the recorded audio
            mediaRecorder.onstop = async () => {

            // Create a blob from the audio chunks collected
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];

            try {
                // Convert the Blob to base64 so it can be saved into a filename string
                const base64Blob = await blobToBase64(blob);
                const fileName = `audio_note_${new Date().toISOString()}.webm`;
                userInputContext = "";
                // Create the audio element metadata to save

                const audioElement = {
                    fileName,
                    base64Blob,  // This is the base64 string that will be stored
                    tabUrl:originTabUrl,       // Save the origin URL where the note was taken
                    userInputContext
                };
                // Push the audio note to the savedAudioNotes array
                // Store the updated audio notes in Chrome storage (local)
                chrome.storage.local.get(['savedAudioNotes'], (data) => {
                    const savedAudioNotes = data.savedAudioNotes || [];
                    savedAudioNotes.push(audioElement);

                    // Store the updated audio notes in Chrome storage (local)
                    chrome.storage.local.set({ savedAudioNotes }, () => {
                    console.log('Audio note saved:', fileName);
                    isRecording = false;
  
                    // Stop the media stream from accessing the microphone
                    if (mediaRecorder && mediaRecorder.stream) {
                        const tracks = mediaRecorder.stream.getTracks();
                        tracks.forEach(track => track.stop());
                    }
                    mediaRecorder = null;  // Clean up the media recorder
                    chrome.runtime.sendMessage({ action: 'audioSaved' });                    
                    });
                });


            } catch (error) {
            alert("Error converting Blob to base64:", error);
            }
        };
    } else if (!mediaRecorder) {
      console.error('MediaRecorder is not initialized.');
      sendResponse({ status: 'Error', message: error.message });
    } else {
      console.error('MediaRecorder is not in a recording state.');
      sendResponse({ status: 'Error! MediaRecorder is not in a recording state.' });  }
    return true;
  }
  
  // Function to convert a Blob to a base64-encoded string
async  function blobToBase64(blob) {
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
    return true;
  }
  
  