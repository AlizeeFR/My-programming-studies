var timeoutPause, timeoutUnpause;

document.addEventListener("DOMContentLoaded", function() {
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, pauseTime, unpauseTime, autoUnpause } = message;
  if (action === 'start') {
    stopTimers();
    if (pauseTime > 0) {
      console.log("Extension started");
      console.log("autoUnpause checked?", autoUnpause, "Pause Time: ", pauseTime);
      startPauseUnpauseCycle(pauseTime, unpauseTime, autoUnpause);
    }
    sendResponse({ status: 'received' });
  } else if (action === 'stop') {
    stopTimers();
    console.log("Extension stopped");
    sendResponse({ status: 'stopped' });
  } else if (action === 'restart') {
    stopTimers();
    if (pauseTime > 0) {
      console.log("Extension restarted");
      console.log("autoUnpause checked?", autoUnpause, "Pause Time: ", pauseTime);
      startPauseUnpauseCycle(pauseTime, unpauseTime, autoUnpause);
    }
    sendResponse({status: 'restarted'});
  }
});

function startPauseUnpauseCycle(pauseTime, unpauseTime, autoUnpause) {

  const video = document.querySelector('video');
  if (!video) {
    console.error('No video found on this page.');
    return;
  }

  timeoutPause = setTimeout(() => {
    video.pause();
    console.log('Video paused after', pauseTime, 'seconds.');

    if (autoUnpause && unpauseTime > 0) {
      timeoutUnpause = setTimeout(() => {
        video.play();
        console.log('Video unpaused after', unpauseTime, 'seconds.');
        startPauseUnpauseCycle(pauseTime, unpauseTime, autoUnpause);
      }, unpauseTime * 1000);
    } else {
      // If autoUnpause is disabled, listen for a manual play event
      const handleManualPlay = () => {
        console.log('Video manually unpaused.');
        video.removeEventListener('play', handleManualPlay); // Remove listener after manual unpause
        startPauseUnpauseCycle(pauseTime, unpauseTime, autoUnpause); // Restart the cycle
      };
      video.addEventListener('play', handleManualPlay);
    }

  }, pauseTime * 1000);
}

function stopTimers() {
  clearTimeout(timeoutPause);
  clearTimeout(timeoutUnpause);
  console.log('Timers cleared.');
}

