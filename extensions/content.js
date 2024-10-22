let timeoutPause, timeoutUnpause;
let micIcon;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, pauseTime, unpauseTime, autoUnpause } = message;
  chrome.storage.sync.set({ pauseTime, unpauseTime, autoUnpause }, () => {
    console.log('Pause time, unpause time, and autoUnpause settings saved.');
  });

  if (action === 'stop') {
    stopTimers();
    console.log("Extension stopped");
  } else if (action === 'start' || action === 'restart') {
    alert("Calleod!");
    stopTimers();
    if (pauseTime > 0) {
        console.log("Extension started");
      startPauseUnpauseCycle(pauseTime, unpauseTime, autoUnpause);
    }
  }
  sendResponse({status: 'received'});

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
    }
  }, pauseTime * 1000);
}

function stopTimers() {
  clearTimeout(timeoutPause);
  clearTimeout(timeoutUnpause);
  console.log('Timers cleared.');
}
