let apiKey = null;

// Check if API key exists on load
chrome.storage.sync.get(['youtubeApiKey'], (result) => {
  if (!result.youtubeApiKey) {
    window.location.href = 'settings.html';
  } else {
    apiKey = result.youtubeApiKey;
  }
});

// Settings button
document.getElementById('settingsBtn').addEventListener('click', () => {
  window.location.href = 'settings.html';
});

// Stats button
document.getElementById('statsBtn').addEventListener('click', async () => {
  const errorDiv = document.getElementById('error');
  
  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;
  
  // Extract playlist ID from URL
  const playlistId = extractPlaylistId(url);
  
  if (!playlistId) {
    errorDiv.textContent = 'No YouTube playlist found on this page. Please navigate to a YouTube playlist.';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Store playlist ID in storage and navigate to stats page
  chrome.storage.sync.set({ currentPlaylistId: playlistId }, () => {
    window.location.href = 'stats.html';
  });
});

function extractPlaylistId(url) {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}