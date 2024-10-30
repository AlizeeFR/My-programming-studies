let originTabUrl;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let savedAudioNotes = [];
let recordingState = "stopped";
let statusMessage = "";
let enteredText;

const startRecording = async function () {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  console.log(
    "Check to see if the message port closure message came before or after this!"
  );
  audioChunks =[];

  // Create MediaRecorder object after microphone access is granted
  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  // Start the MediaRecorder with a time slice of 1000 milliseconds (1 second)
  mediaRecorder.start(1000); // 1000ms means dataavailable event will be fired every second
  // Update the recording state
  isRecording = true;
  recordingState = "recording";
  statusMessage = "Recording started";
  console.log("Recording started in background");
};

const startSaving = async function () {
  const blob = new Blob(audioChunks, { type: "audio/webm" });
  audioChunks = [];
  enteredText = prompt("Enter context for note:");
  const url = URL.createObjectURL(blob);

  try {
    // Convert the Blob to base64 so it can be saved into a filename string
    const base64Blob = await blobToBase64(blob);
    const dateString = new Date().toISOString().replace(/[:.]/g, "-");
    fileName =
      "extensions (8)/extensions/AudioNotes/audio_note_" + dateString + ".webm";
    if (enteredText === null || enteredText === "") {
      userInputContext = originTabUrl;
    } else {
      userInputContext = enteredText;
    }
    // Create the audio element metadata to save
    (async () => {
      response = await chrome.runtime.sendMessage(
          { action:"create-download", data: url, dataFileName: fileName });
          console.log(response);
      })();

    fileName = "/AudioNotes/audio_note_" + dateString + ".webm";
    const audioElement = {
      fileName, // This is the base64 string that will be stored
      tabUrl: originTabUrl, // Save the origin URL where the note was taken
      userInputContext,
    };
    // Push the audio note to the savedAudioNotes array
    // Store the updated audio notes in Chrome storage (local)
    await saveAudioNoteToStorage(audioElement);

    // Stop the media stream from accessing the microphone
  } catch (error) {
    alert("Error converting Blob to base64:", error);
  }

  URL.revokeObjectURL(url);
};

const saveAudioNoteToStorage = async (audioElement) => {
  return new Promise((resolve, reject) => {
    // Send a message to the background script to save audio notes
    chrome.runtime.sendMessage(
      {
        action: "save-audio-note",
        audioElement,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log("oopsie, failed here");
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
};

const stopRecording = async function () {
  if (
    mediaRecorder &&
    (mediaRecorder.state === "recording" || mediaRecorder.state === "paused")
  ) {
    mediaRecorder.stop(); // Stop the recording completely
    // Once the mediaRecorder stops, process the recorded audio

    isRecording = false;
    recordingState = "stopped";
    statusMessage = "Recording stopped";
    // Stop the media stream from accessing the microphone
    if (mediaRecorder) {
      const tracks = mediaRecorder.stream.getTracks();
      tracks.forEach((track) => track.stop());
      console.log("Successfully deleted all the tracks");
    } else {
      console.log("MediaRecorder did not exist");
    }

    mediaRecorder = null; // Clean up the media recorder

    if (audioChunks.length > 0) {
      console.log("Processing audio...");
      await startSaving(); // Call the function to save the audio
    } else {
      console.error("No audio data captured.");
    }
  } else if (!mediaRecorder) {
    console.error("MediaRecorder is not initialized.");
  } else {
    console.error("MediaRecorder is not in a recording state.");
  }
};

const handleMessage = async (request, sender, sendResponse) => {
  if (request.target === "offscreen") {
    if (request.action === "start-recording") {
      originTabUrl = request.tabUrl;
      await startRecording();
      sendResponse({ status: statusMessage, recordingState });
    } else if (request.action === "pause-recording") {
      pauseAudioRecording();
      recordingState = "paused";
      statusMessage = "Recording paused";
      sendResponse({ status: statusMessage, recordingState });
    } else if (request.action === "resume-recording") {
      resumeAudioRecording();
      recordingState = "recording";
      statusMessage = "Recording resumed";
      sendResponse({ status: statusMessage, recordingState });
    } else if (request.action === "stop-recording") {
      await stopRecording();
      sendResponse({ status: statusMessage, recordingState });
    } else if (request.action === "get-status") {
      statusMessage = `Current recording state: ${recordingState}`;
      sendResponse({ status: statusMessage, recordingState });
    }
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);

  return true;
});

function startAudioRecording() {
  return new Promise((resolve, reject) => {
    if (isRecording) {
      console.log("Already recording");
      resolve({ status: statusMessage, recordingState }); // Resolve early if already recording
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(resolve())
      .catch((error) => {
        console.error("Error accessing microphone:", error);
        // Reject the promise on error
        reject(error);
      });
  });
}

function pauseAudioRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.pause();
    recordingState = "paused"; // Update state to paused
    console.log("Recording paused");
  }
}

function resumeAudioRecording() {
  if (mediaRecorder && mediaRecorder.state === "paused") {
    mediaRecorder.resume();
    recordingState = "recording"; // Update state to recording
    console.log("Recording resumed");
  }
}

// Function to convert a Blob to a base64-encoded string
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Check if the Blob is valid
    if (!blob || blob.size === 0) {
      return reject(new Error("Blob is empty or invalid."));
    }

    reader.onloadend = () => {
      resolve(reader.result); // Resolve the base64-encoded data URL
      console.log("reader resulted resolved correctly");
    };

    reader.onerror = (err) => {
      reject(new Error("Failed to convert Blob to base64."));
    };

    try {
      reader.readAsDataURL(blob); // Attempt to read the Blob as a base64 data URL
      console.log("We read the DataURL of a blob");
    } catch (error) {
      reject(new Error("FileReader failed to read the Blob."));
    }
  });
  return true;
}
