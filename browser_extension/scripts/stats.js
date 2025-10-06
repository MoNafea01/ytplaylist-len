let apiKey = null;
let playlistId = null;

// Check API key and playlist ID on load
chrome.storage.sync.get(['youtubeApiKey', 'currentPlaylistId'], async (result) => {
  const errorDiv = document.getElementById('error');
  
  if (!result.youtubeApiKey) {
    errorDiv.textContent = 'No API key found. Please set it in API Settings.';
    errorDiv.style.display = 'block';
    setTimeout(() => {
      window.location.href = 'settings.html';
    }, 1000);
    return;
  }
  
  if (!result.currentPlaylistId) {
    errorDiv.textContent = 'No playlist selected. Please select a playlist from the main page.';
    errorDiv.style.display = 'block';
    setTimeout(() => {
      window.location.href = 'popup.html';
    }, 1000);
    return;
  }
  
  apiKey = result.youtubeApiKey;
  playlistId = result.currentPlaylistId;
  
  // Automatically fetch playlist data
  try {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = 'block';
    
    const allVideos = await fetchAllVideos(playlistId, apiKey);
    populateDropdowns(allVideos.length);
    
    loadingDiv.style.display = 'none';
  } catch (error) {
    loadingDiv.style.display = 'none';
    errorDiv.textContent = `Error: ${error.message}`;
    errorDiv.style.display = 'block';
  }
});

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = 'popup.html';
});

// Get stats button
document.getElementById('getStatsBtn').addEventListener('click', async () => {
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');
  const resultsDiv = document.getElementById('results');
  const getStatsBtn = document.getElementById('getStatsBtn');
  
  loadingDiv.style.display = 'block';
  errorDiv.style.display = 'none';
  resultsDiv.style.display = 'none';
  getStatsBtn.disabled = true;
  
  try {
    const startIndex = parseInt(document.getElementById('startIndex').value);
    const endIndex = parseInt(document.getElementById('endIndex').value);
    const speed = parseFloat(document.getElementById('speed').value);
    
    const stats = await getPlaylistStats(playlistId, apiKey, startIndex, endIndex, speed);
    displayStats(stats);
    loadingDiv.style.display = 'none';
    resultsDiv.style.display = 'block';
  } catch (error) {
    loadingDiv.style.display = 'none';
    errorDiv.textContent = `Error: ${error.message}`;
    errorDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
  } finally {
    getStatsBtn.disabled = false;
  }
});

async function fetchAllVideos(playlistId, apiKey) {
  let allVideos = [];
  let nextPageToken = null;
  
  do {
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;
    if (nextPageToken) {
      url += `&pageToken=${nextPageToken}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch playlist items');
    }
    
    const data = await response.json();
    allVideos.push(...data.items);
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);
  
  return allVideos;
}

async function getPlaylistStats(playlistId, apiKey, startIndex, endIndex, speed) {
  let allVideos = await fetchAllVideos(playlistId, apiKey);
  
  // Apply range filter
  const actualEndIndex = endIndex === -1 ? allVideos.length : endIndex;
  const filteredVideos = allVideos.slice(startIndex - 1, actualEndIndex);
  
  // Get durations for filtered videos
  let totalDuration = 0;
  const videoIds = filteredVideos.map(item => item.contentDetails.videoId);
  
  // Process in batches of 50
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50).join(',');
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch}&key=${apiKey}`
    );
    
    if (!videoResponse.ok) {
      throw new Error('Failed to fetch video details');
    }
    
    const videoData = await videoResponse.json();
    
    videoData.items.forEach(video => {
      const duration = parseDuration(video.contentDetails.duration);
      totalDuration += duration;
    });
  }
  
  // Apply speed adjustment
  const adjustedDuration = totalDuration / speed;
  
  return {
    totalVideos: allVideos.length,
    selectedVideos: filteredVideos.length,
    startIndex,
    endIndex: actualEndIndex,
    speed,
    totalSeconds: totalDuration,
    adjustedSeconds: adjustedDuration,
    totalDuration: formatDuration(totalDuration),
    adjustedDuration: formatDuration(Math.floor(adjustedDuration)),
    averageDuration: formatDuration(Math.floor(totalDuration / filteredVideos.length))
  };
}

function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = (match[1] || '0H').slice(0, -1);
  const minutes = (match[2] || '0M').slice(0, -1);
  const seconds = (match[3] || '0S').slice(0, -1);
  
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function displayStats(stats) {
  const resultsDiv = document.getElementById('results');
  
  let rangeText = '';
  if (stats.selectedVideos < stats.totalVideos) {
    rangeText = `
      <div class="stat-row">
        <span class="stat-label">Video Range:</span>
        <span class="stat-value">${stats.startIndex} - ${stats.endIndex} (of ${stats.totalVideos})</span>
      </div>
    `;
  }
  
  let speedText = '';
  if (stats.speed !== 1) {
    speedText = `
      <div class="stat-row">
        <span class="stat-label">Adjusted Duration (${stats.speed}x):</span>
        <span class="stat-value">${stats.adjustedDuration}</span>
      </div>
    `;
  }
  
  resultsDiv.innerHTML = `
    <div class="stat-row">
      <span class="stat-label">Selected Videos:</span>
      <span class="stat-value">${stats.selectedVideos}</span>
    </div>
    ${rangeText}
    <div class="stat-row">
      <span class="stat-label">Total Duration:</span>
      <span class="stat-value">${stats.totalDuration}</span>
    </div>
    ${speedText}
    <div class="stat-row">
      <span class="stat-label">Average Video Length:</span>
      <span class="stat-value">${stats.averageDuration}</span>
    </div>
  `;
}

function populateDropdowns(totalVideos) {
  const startSelect = document.getElementById('startIndex');
  const endSelect = document.getElementById('endIndex');
  
  // Only populate if not already done
  if (startSelect.options.length === 1) {
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    
    for (let i = 1; i <= totalVideos; i++) {
      const startOption = document.createElement('option');
      startOption.value = i;
      startOption.textContent = i === 1 ? `1 (First)` : i;
      startSelect.appendChild(startOption);
      
      const endOption = document.createElement('option');
      endOption.value = i;
      endOption.textContent = i === totalVideos ? `${i} (Last)` : i;
      endSelect.appendChild(endOption);
    }
    
    // Set defaults
    startSelect.value = 1;
    endSelect.value = totalVideos;
  }
}