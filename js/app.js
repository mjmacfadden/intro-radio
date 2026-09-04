/* ==========================================================================
   INTRO RADIO — vanilla JS player logic + Web Audio visualizer
   ========================================================================== */
(() => {
  "use strict";

  const TRACKS = [
    { title: "Business Model Canvas", src: "unit1/business-model-canvas.mp3" },
    { title: "Scarcity and Opportunity Cost", src: "unit1/scarcity-and-opportunity-cost.mp3" },
    { title: "Six Roles", src: "unit1/six-roles.mp3" },
    { title: "Triple Bottom Line", src: "unit1/triple-bottom-line.mp3" },
  ];

  const $ = (id) => document.getElementById(id);

  const audio = $("audio");
  const els = {
    clock: $("clock"),
    trackTitle: $("trackTitle"),
    timeElapsed: $("timeElapsed"),
    timeRemaining: $("timeRemaining"),
    seek: $("seek"),
    volume: $("volume"),
    btnPrev: $("btnPrev"),
    btnPlay: $("btnPlay"),
    btnPause: $("btnPause"),
    btnStop: $("btnStop"),
    btnNext: $("btnNext"),
    btnShuffle: $("btnShuffle"),
    btnRepeat: $("btnRepeat"),
    playlistItems: $("playlistItems"),
    trackCount: $("trackCount"),
    statusText: $("statusText"),
    modeShuffle: $("modeShuffle"),
    modeRepeat: $("modeRepeat"),
    visualizer: $("visualizer"),
  };

  const state = {
    currentIndex: 0,
    shuffle: false,
    repeat: false, // repeat current track
    isSeeking: false,
    order: TRACKS.map((_, i) => i),
  };

  // ---------------------------------------------------------------- utils

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function setStatus(text) {
    els.statusText.textContent = text;
  }

  // ---------------------------------------------------------------- clock

  function tickClock() {
    const now = new Date();
    els.clock.textContent = now.toLocaleTimeString("en-US", { hour12: false });
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ---------------------------------------------------------------- playlist UI

  function renderPlaylist() {
    els.playlistItems.innerHTML = "";
    TRACKS.forEach((track, i) => {
      const li = document.createElement("li");
      li.className = "playlist__item" + (i === state.currentIndex ? " active" : "");
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      li.innerHTML = `<span class="idx">${String(i + 1).padStart(2, "0")}</span><span class="name">${track.title}</span>`;
      li.addEventListener("click", () => loadTrack(i, true));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadTrack(i, true); }
      });
      els.playlistItems.appendChild(li);
    });
    els.trackCount.textContent = `${TRACKS.length} TRACKS`;
  }

  function highlightPlaylist() {
    [...els.playlistItems.children].forEach((li, i) => {
      li.classList.toggle("active", i === state.currentIndex);
    });
  }

  // ---------------------------------------------------------------- track loading

  function loadTrack(index, autoplay) {
    state.currentIndex = index;
    const track = TRACKS[index];
    audio.src = encodeURI(track.src);
    els.trackTitle.textContent = track.title.toUpperCase();
    els.seek.value = 0;
    highlightPlaylist();
    if (autoplay) {
      audio.play().then(() => setStatus(`PLAYING: ${track.title}`)).catch(() => setStatus("PLAYBACK BLOCKED — PRESS PLAY"));
    }
  }

  function playCurrent() {
    ensureAudioGraph();
    audio.play().then(() => setStatus(`PLAYING: ${TRACKS[state.currentIndex].title}`)).catch(() => setStatus("PLAYBACK BLOCKED — PRESS PLAY"));
  }

  function nextIndex() {
    if (state.shuffle) {
      let next;
      do {
        next = Math.floor(Math.random() * TRACKS.length);
      } while (next === state.currentIndex && TRACKS.length > 1);
      return next;
    }
    return (state.currentIndex + 1) % TRACKS.length;
  }

  function prevIndex() {
    if (state.shuffle) return nextIndex();
    return (state.currentIndex - 1 + TRACKS.length) % TRACKS.length;
  }

  // ---------------------------------------------------------------- controls

  els.btnPlay.addEventListener("click", () => {
    if (!audio.src) loadTrack(state.currentIndex, false);
    playCurrent();
  });

  els.btnPause.addEventListener("click", () => {
    audio.pause();
    setStatus("PAUSED.");
  });

  els.btnStop.addEventListener("click", () => {
    audio.pause();
    audio.currentTime = 0;
    setStatus("STOPPED.");
  });

  els.btnNext.addEventListener("click", () => loadTrack(nextIndex(), true));
  els.btnPrev.addEventListener("click", () => loadTrack(prevIndex(), true));

  els.btnShuffle.addEventListener("click", () => {
    state.shuffle = !state.shuffle;
    els.btnShuffle.classList.toggle("active", state.shuffle);
    els.modeShuffle.classList.toggle("active", state.shuffle);
  });

  els.btnRepeat.addEventListener("click", () => {
    state.repeat = !state.repeat;
    els.btnRepeat.classList.toggle("active", state.repeat);
    els.modeRepeat.classList.toggle("active", state.repeat);
  });

  els.volume.addEventListener("input", () => {
    audio.volume = Number(els.volume.value) / 100;
    localStorage.setItem("introradio.volume", els.volume.value);
  });

  els.seek.addEventListener("input", () => {
    state.isSeeking = true;
  });
  els.seek.addEventListener("change", () => {
    if (audio.duration) {
      audio.currentTime = (Number(els.seek.value) / 1000) * audio.duration;
    }
    state.isSeeking = false;
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration || state.isSeeking) return;
    els.timeElapsed.textContent = formatTime(audio.currentTime);
    els.timeRemaining.textContent = `-${formatTime(audio.duration - audio.currentTime)}`;
    els.seek.value = String((audio.currentTime / audio.duration) * 1000);
  });

  audio.addEventListener("ended", () => {
    if (state.repeat) {
      audio.currentTime = 0;
      playCurrent();
    } else {
      loadTrack(nextIndex(), true);
    }
  });

  audio.addEventListener("play", () => {
    els.btnPlay.classList.add("active");
    resumeAudioContext();
  });
  audio.addEventListener("pause", () => {
    els.btnPlay.classList.remove("active");
  });

  // restore saved volume
  const savedVolume = localStorage.getItem("introradio.volume");
  if (savedVolume !== null) {
    els.volume.value = savedVolume;
  }
  audio.volume = Number(els.volume.value) / 100;

  // ---------------------------------------------------------------- keyboard shortcuts

  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    switch (e.code) {
      case "Space": e.preventDefault(); audio.paused ? playCurrent() : audio.pause(); break;
      case "ArrowRight": loadTrack(nextIndex(), true); break;
      case "ArrowLeft": loadTrack(prevIndex(), true); break;
    }
  });

  // ---------------------------------------------------------------- visualizer (Web Audio API)

  let audioCtx, analyser, sourceNode, dataArray;

  function ensureAudioGraph() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    sourceNode = audioCtx.createMediaElementSource(audio);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    drawVisualizer();
  }

  function resumeAudioContext() {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function drawVisualizer() {
    const canvas = els.visualizer;
    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    function render() {
      requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      const barCount = dataArray.length;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i] / 255;
        const barHeight = value * height;
        const hue = 170 - value * 120; // cyan -> pink sweep
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 6;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }
    }
    render();
  }

  // ---------------------------------------------------------------- init

  renderPlaylist();
  loadTrack(0, false);
  setStatus("READY.");

  // ---------------------------------------------------------------- PWA service worker

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
