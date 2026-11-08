(() => {
  const video = document.getElementById('camera');
  const viewfinder = document.getElementById('viewfinder');
  const cameraButton = document.getElementById('camera-button');
  const captureButton = document.getElementById('capture-button');
  const captureLabel = document.getElementById('capture-label');
  const filterSelect = document.getElementById('filter-select');
  const status = document.getElementById('camera-status');
  const statusText = document.getElementById('status-text');
  const countdown = document.getElementById('countdown');
  const flash = document.getElementById('flash');
  const shotProgress = document.getElementById('shot-progress');
  const gallery = document.getElementById('gallery');
  const emptyState = document.getElementById('empty-state');
  const photoCount = document.getElementById('photo-count');
  const downloadAllButton = document.getElementById('download-all');
  const captureCanvas = document.getElementById('capture-canvas');
  const context = captureCanvas.getContext('2d');
  const toast = document.getElementById('toast');

  let stream = null;
  let format = 'strip';
  let capturing = false;
  let memories = [];
  let toastTimer = null;

  const filterStyles = {
    natural: 'none',
    warm: 'sepia(0.2) saturate(1.18) brightness(1.04)',
    bw: 'grayscale(1) contrast(1.1)',
    dreamy: 'brightness(1.08) saturate(0.86)',
    pop: 'saturate(1.55) contrast(1.05)'
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function updateControls() {
    const active = Boolean(stream);
    captureButton.disabled = !active || capturing;
    cameraButton.disabled = capturing;
    cameraButton.querySelector('span:last-child').textContent = active ? 'Turn off camera' : 'Turn on camera';
    const label = format === 'strip' ? 'Start photo strip' : 'Take a photo';
    captureLabel.textContent = capturing ? 'One moment…' : label;
  }

  async function toggleCamera() {
    if (stream) {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Camera access needs a modern browser on HTTPS or localhost.');
      return;
    }

    cameraButton.disabled = true;
    statusText.textContent = 'Connecting…';
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      video.srcObject = stream;
      await video.play();
      viewfinder.classList.add('has-video');
      status.classList.add('is-on');
      statusText.textContent = 'Camera ready';
      updateControls();
      showToast('Looking good. Your camera is ready!');
    } catch (error) {
      stream = null;
      status.classList.remove('is-on');
      statusText.textContent = 'Camera off';
      updateControls();
      if (error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
        showToast('Camera permission was blocked. Allow access in your browser settings.');
      } else if (error && error.name === 'NotFoundError') {
        showToast('No camera found. Connect a camera and try again.');
      } else {
        showToast('Could not start the camera. Check permissions and try again.');
      }
    }
  }

  function stopCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    viewfinder.classList.remove('has-video');
    status.classList.remove('is-on');
    statusText.textContent = 'Camera off';
    updateControls();
  }

  function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  async function countDown(seconds) {
    countdown.classList.remove('hidden');
    for (let number = seconds; number > 0; number -= 1) {
      countdown.textContent = number;
      await wait(850);
    }
    countdown.textContent = '✳';
    await wait(180);
    countdown.classList.add('hidden');
  }

  function captureFrame() {
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    captureCanvas.width = width;
    captureCanvas.height = height;
    context.save();
    context.clearRect(0, 0, width, height);
    context.filter = filterStyles[filterSelect.value] || 'none';
    context.translate(width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, width, height);
    context.restore();
    context.filter = 'none';

    flash.classList.remove('hidden');
    window.setTimeout(() => flash.classList.add('hidden'), 360);
    return captureCanvas.toDataURL('image/jpeg', 0.93);
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  async function makeStrip(shots) {
    const images = await Promise.all(shots.map(loadImage));
    const width = 680;
    const pad = 20;
    const imageWidth = width - pad * 2;
    const imageHeight = Math.round(imageWidth * 0.68);
    const gap = 13;
    const footer = 54;
    const height = pad * 2 + (imageHeight * images.length) + (gap * (images.length - 1)) + footer;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, width, height);

    images.forEach((image, index) => {
      const y = pad + index * (imageHeight + gap);
      const sourceRatio = image.width / image.height;
      const targetRatio = imageWidth / imageHeight;
      let sx = 0, sy = 0, sw = image.width, sh = image.height;
      if (sourceRatio > targetRatio) {
        sw = image.height * targetRatio;
        sx = (image.width - sw) / 2;
      } else {
        sh = image.width / targetRatio;
        sy = (image.height - sh) / 2;
      }
      ctx.drawImage(image, sx, sy, sw, sh, pad, y, imageWidth, imageHeight);
      ctx.strokeStyle = '#ece5da';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad + .5, y + .5, imageWidth - 1, imageHeight - 1);
    });

    ctx.fillStyle = '#897f6d';
    ctx.font = '600 13px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✳  LITTLE PHOTO BOOTH  ✳', width / 2, height - 23);
    return canvas.toDataURL('image/jpeg', 0.94);
  }

  async function takePhotos() {
    if (!stream || capturing) return;
    capturing = true;
    updateControls();
    const shots = [];
    const total = format === 'strip' ? 4 : 1;
    try {
      for (let index = 0; index < total; index += 1) {
        shotProgress.textContent = total > 1 ? `POSE ${index + 1} OF ${total}` : 'GET READY';
        shotProgress.classList.remove('hidden');
        await countDown(3);
        shots.push(captureFrame());
        if (index < total - 1) await wait(1050);
      }
      shotProgress.classList.add('hidden');
      const source = total > 1 ? await makeStrip(shots) : shots[0];
      const now = new Date();
      const memory = {
        id: `${now.getTime()}-${Math.random().toString(16).slice(2, 7)}`,
        source,
        title: total > 1 ? 'Photo strip' : 'Little snapshot',
        timestamp: now
      };
      memories.unshift(memory);
      renderMemories();
      showToast(total > 1 ? 'Your photo strip is ready to keep!' : 'A little memory, ready to keep!');
    } catch (error) {
      console.error('Could not create the photo:', error);
      showToast('Something went wrong while making your photo. Please try again.');
    } finally {
      capturing = false;
      shotProgress.classList.add('hidden');
      countdown.classList.add('hidden');
      updateControls();
    }
  }

  async function downloadMemory(memory) {
    const date = memory.timestamp.toISOString().slice(0, 10);
    const filename = `photo-booth-${date}-${memory.id.slice(-5)}.jpg`;

    // 1. Try utilizing the Web Share API (Optimized for Mobile Gallery saving)
    if (navigator.canShare) {
      try {
        const response = await fetch(memory.source);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: 'image/jpeg' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: memory.title,
            text: 'Here is my photo booth keepsake!'
          });
          showToast('Photo sheet opened for saving/sharing!');
          return;
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.log('Web share fallback to regular download:', error);
        } else {
          return; // User cancelled prompt intentionally
        }
      }
    }

    // 2. Standard Fallback for Desktop and non-supporting browsers
    const link = document.createElement('a');
    link.href = memory.source;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Download started!');
  }

  async function renderMemories() {
    emptyState.hidden = memories.length > 0;
    gallery.querySelectorAll('.memory-card').forEach(card => card.remove());
    photoCount.textContent = String(memories.length);
    downloadAllButton.disabled = memories.length === 0;

    for (const memory of memories) {
      const card = document.createElement('article');
      card.className = 'memory-card';
      const image = await loadImage(memory.source);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', memory.title);
      canvas.getContext('2d').drawImage(image, 0, 0);

      const meta = document.createElement('div');
      meta.className = 'memory-meta';
      const name = document.createElement('strong');
      name.textContent = memory.title;
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'save-one';
      save.textContent = '↓ Save copy';
      save.setAttribute('aria-label', `Save ${memory.title}`);
      save.addEventListener('click', () => downloadMemory(memory));
      meta.append(name, save);
      card.append(canvas, meta);
      gallery.appendChild(card);
    }
  }

  cameraButton.addEventListener('click', toggleCamera);
  captureButton.addEventListener('click', takePhotos);
  downloadAllButton.addEventListener('click', async () => {
    if (!memories.length) optionsCheck:
    for (let index = 0; index < memories.length; index += 1) {
      await downloadMemory(memories[index]);
      if (index < memories.length - 1) await wait(350);
    }
    showToast(`Processed ${memories.length} ${memories.length === 1 ? 'photo' : 'photos'} for saving.`);
  });

  document.querySelectorAll('.format-button').forEach(button => {
    button.addEventListener('click', () => {
      format = button.dataset.format;
      document.querySelectorAll('.format-button').forEach(option => {
        const selected = option === button;
        option.classList.toggle('active', selected);
        option.setAttribute('aria-pressed', String(selected));
      });
      updateControls();
    });
  });

  window.addEventListener('beforeunload', () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  });

  updateControls();
})();
