// Load existing API key if available
chrome.storage.sync.get(['youtubeApiKey'], (result) => {
  if (result.youtubeApiKey) {
    document.getElementById('apiKey').value = result.youtubeApiKey;
  }
});

// Save API key
document.getElementById('saveBtn').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const messageDiv = document.getElementById('message');
  
  if (!apiKey) {
    messageDiv.textContent = 'Please enter an API key';
    messageDiv.className = 'message error';
    messageDiv.style.display = 'block';
    return;
  }
  
  chrome.storage.sync.set({ youtubeApiKey: apiKey }, () => {
    messageDiv.textContent = 'API key saved successfully!';
    messageDiv.className = 'message success';
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
      window.location.href = 'popup.html';
    }, 1000);
  });
});

// Return to main page
document.getElementById('returnBtn').addEventListener('click', () => {
  window.location.href = 'popup.html';
});