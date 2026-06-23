/**
 * Transes
 */

// Global App State
const state = {
  profile: null,        // 'deaf' or 'blind'
  destination: 'Stasiun Sudirman',
  stepsRemaining: 200,
  distanceRemaining: 150,
  timeRemaining: 14,
  isSpeechActive: false,
  briefingActive: false,
  estimationSource: null, // 'home' or 'navigation'
  isOnBoard: false,
  isCheckedIn: false,
  selectedVehicleIdx: 0,
  currentStopIdxOnBoard: 0,
  originalEstimationHTML: '',
  checkInOptions: ["KRL 102", "BUS 4B", "MRT 07"],
  vehicleStops: {
    "KRL 102": [
      { name: "Stasiun Sudirman", time: 3 },
      { name: "Stasiun Manggarai", time: 8 },
      { name: "Stasiun Cikini", time: 14 }
    ],
    "BUS 4B": [
      { name: "Halte Sudirman", time: 5 },
      { name: "Halte Tosari", time: 9 },
      { name: "Halte Karet", time: 15 }
    ],
    "MRT 07": [
      { name: "Stasiun Dukuh Atas", time: 2 },
      { name: "Stasiun Bundaran HI", time: 6 },
      { name: "Stasiun Setiabudi", time: 11 }
    ]
  },
  simInterval: null
};

// View Height Configurations (from Figma designs)
const viewHeights = {
  'profile': 1062,
  'deaf-home': 860,
  'voice-search': 860,
  'deaf-confirm': 860,
  'navigation': 862,
  'estimation': 862,
  'assistance': 860,
  'arrival': 860
};

// Indonesian TTS Guidance Texts for each screen
const voiceGuidance = {
  'profile': 'Selamat datang di aplikasi Transes. Klik bagian kiri layar untuk menggunakan profil gangguan pendengaran, klik bagian kanan layar untuk menggunakan profil gangguan penglihatan.',
  'deaf-home': 'Klik bagian atas layar untuk menggunakan fitur cari tujuan, klik bagian kiri bawah layar untuk menggunakan fitur estimasi, klik bagian kanan bawah layar untuk menggunakan fitur bantuan.',
  'voice-search': 'Halaman pencarian suara. Klik tombol di bagian tengah layar untuk mulai berbicara dan menyebutkan rute tujuan Anda. Atau klik tombol kembali di kiri atas layar untuk kembali ke halaman sebelumnya.',
  'deaf-confirm': 'Halaman konfirmasi perjalanan. Klik bagian kanan bawah layar untuk mulai navigasi, klik bagian kiri bawah layar untuk ganti tujuan, atau klik tombol kembali di bagian kiri atas layar.',
  'navigation': 'Navigasi dimulai. Tombol kembali di kiri atas, informasi rute di tengah, ulangi di kiri bawah, akhiri di kanan bawah.',
  'estimation': 'Halaman estimasi waktu tiba. Sisa waktu perjalanan Anda adalah empat belas menit menuju Stasiun Sudirman. Klik di mana saja pada layar untuk kembali ke halaman navigasi.',
  'assistance': 'Halaman bantuan. Klik bagian atas layar untuk menggunakan fitur panggilan darurat, klik bagian bawah layar untuk mengganti aksesibilitas, atau klik tombol kembali di bagian kiri atas layar.',
  'arrival': 'Anda telah sampai di Stasiun Sudirman. Perjalanan selesai. Klik di bagian bawah layar untuk kembali ke halaman awal.'
};


/**
 * Switch Active View
 * @param {string} viewId - ID of target view
 */
function navigateTo(viewId) {
  window.location.hash = viewId;
}

/**
 * Adjust the App Shell Scale to fit the viewport exactly
 */
function adjustAppScale() {
  const shell = document.querySelector('.stitch-export-root');
  if (!shell) return;

  const activeViewId = state.currentView || 'profile';
  const targetHeight = viewHeights[activeViewId] || 860;
  const targetWidth = 390;

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // Clean up html and body styling to prevent any native window scrolling
  document.documentElement.style.margin = '0';
  document.documentElement.style.padding = '0';
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.height = '100vh';

  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100vh';
  document.body.style.display = 'flex';
  document.body.style.justifyContent = 'center';
  document.body.style.alignItems = 'center';
  document.body.style.backgroundColor = '#faf9fe';

  if (windowWidth <= 480) {
    // Mobile: Stretch to fill the screen 100% on both axes (removes all gaps and scroll)
    // Pin to 'top center' to ensure the app starts exactly at the top of the viewport (no top white space)
    const scaleX = windowWidth / targetWidth;
    const scaleY = windowHeight / targetHeight;
    shell.style.transformOrigin = 'top center';
    shell.style.transform = `scale(${scaleX}, ${scaleY})`;
    document.body.style.alignItems = 'flex-start';
  } else {
    // Desktop/Tablet: Maintain aspect ratio as a premium centered mockup card
    const scaleX = windowWidth / targetWidth;
    const scaleY = (windowHeight * 0.95) / targetHeight; // 95% height for padding on desktop
    const scale = Math.min(scaleX, scaleY);
    
    shell.style.transformOrigin = 'center center';
    shell.style.transform = `scale(${scale})`;
    document.body.style.alignItems = 'center';
  }
}

// Bind resize listener
window.addEventListener('resize', adjustAppScale);

/**
 * Handle View Transition
 * @param {string} viewId - The active view ID
 */
function handleRouting(viewId) {
  // Clear any existing step simulators when switching views
  stopStepSimulation();

  // Validate viewId
  if (!viewHeights[viewId]) {
    viewId = 'profile';
  }
  
  state.currentView = viewId;

  // Manage Active CSS Class
  const views = document.querySelectorAll('.view');
  views.forEach(v => {
    v.classList.remove('active');
  });

  const activeView = document.getElementById(`view-${viewId}`);
  if (activeView) {
    activeView.classList.add('active');
  }

  // Set dynamic shell height to match design viewport
  const shell = document.querySelector('.stitch-export-root');
  if (shell && viewHeights[viewId]) {
    shell.style.height = `${viewHeights[viewId]}px`;
  }

  // Adjust scaling immediately on view switch
  adjustAppScale();

  // Scroll app shell to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Stop STT listening if active when leaving search
  if (viewId !== 'voice-search') {
    window.speechManager.stopListening();
  }

  // Initialize specific view features immediately (so buttons are clickable)
  initViewFeatures(viewId);

  // Trigger TTS announcement
  if (viewId === 'navigation') {
    state.briefingActive = true;
    announceView(viewId, () => {
      if (state.briefingActive) {
        state.briefingActive = false;
        // Start active simulator progression when briefing ends
        startStepSimulation(true);
      }
    });
  } else {
    announceView(viewId);
  }
}

/**
 * Announce Page using TTS
 * @param {string} viewId 
 * @param {function} onEnd - Optional callback on completion
 */
function announceView(viewId, onEnd = null) {
  // Always announce page context automatically for all pages
  let text = voiceGuidance[viewId];
  
  if (viewId === 'estimation') {
    if (state.estimationSource === 'home') {
      const currentVal = state.checkInOptions[state.selectedVehicleIdx];
      if (!state.isCheckedIn) {
        text = `Halaman check-in perjalanan. Kendaraan terpilih saat ini: ${currentVal}. Ketuk bagian kiri layar untuk mengganti unit kendaraan, ketuk bagian kanan layar untuk check-in.`;
      } else {
        const vehicle = state.checkInOptions[state.selectedVehicleIdx];
        const stops = state.vehicleStops[vehicle];
        const stop = stops[state.currentStopIdxOnBoard];
        text = `Anda sudah check-in di ${vehicle}. Pemberhentian berikutnya: ${stop.name}, dalam ${stop.time} menit. Ketuk bagian kiri layar untuk melihat rute stasiun lain, ketuk bagian kanan layar untuk kembali ke beranda.`;
      }
    } else {
      text = `Halaman estimasi waktu tiba. Sisa waktu perjalanan Anda adalah ${state.timeRemaining} menit menuju ${state.destination}. Klik di mana saja pada layar untuk kembali ke halaman navigasi.`;
    }
  }

  if (text) {
    window.speechManager.speak(text, onEnd);
  } else if (onEnd) {
    onEnd();
  }
}

/**
 * Bind Hover Announcements (Screen Reader Simulator)
 */
function bindHoverListeners() {
  // TTS hover sound triggers disabled per user request
}

/**
 * Initialize Specific View Features & Event Bindings
 * @param {string} viewId 
 */
function initViewFeatures(viewId) {
  const container = document.getElementById(`view-${viewId}`);
  if (!container) return;

  if (viewId === 'profile') {
    // Select accessibility profile
    const optDeaf = container.querySelector('.button-option-1-gangguan-pendengaran-11');
    const optBlind = container.querySelector('.button-option-2-gangguan-penglihatan-18');

    if (optDeaf) {
      optDeaf.onclick = () => {
        state.profile = 'deaf';
        window.location.href = '/v1/';
      };
    }
    if (optBlind) {
      optBlind.onclick = () => {
        state.profile = 'blind';
        // Route to the grid home view displaying Beranda Grid Aksesibilitas Murni.html content
        navigateTo('deaf-home');
      };
    }
  }

  else if (viewId === 'deaf-home') {
    // Home actions
    const btnCari = container.querySelector('.button-cari-tujuan-7');
    const btnBantuan = container.querySelector('.button-bantuan-19');
    const btnRute = container.querySelector('.button-estimasi-13');

    if (btnCari) btnCari.onclick = () => navigateTo('voice-search');
    if (btnBantuan) btnBantuan.onclick = () => navigateTo('assistance');
    if (btnRute) {
      btnRute.onclick = () => {
        state.estimationSource = 'home';
        state.isOnBoard = false;
        state.isCheckedIn = false; // Reset check-in state on fresh entry
        state.selectedVehicleIdx = 0;
        state.currentStopIdxOnBoard = 0;
        navigateTo('estimation');
      };
    }
  }

  else if (viewId === 'voice-search') {
    const micBtn = container.querySelector('.main-microphone-button-29');
    const queryText = container.querySelector('.text-9');
    const suggestion1 = container.querySelector('.container-21'); // Ke Stasiun Sudirman
    const suggestion2 = container.querySelector('.container-23'); // Pulang ke Rumah
    const btnKembali = container.querySelector('.button-kembali-2');

    // Reset microphone wave and style states
    const waves = container.querySelectorAll('.voice-wave-circle');
    waves.forEach(w => w.style.display = 'none');

    if (micBtn) {
      micBtn.onclick = () => {
        if (window.speechManager.isListening) {
          window.speechManager.stopListening();
          waves.forEach(w => w.style.display = 'none');
          window.speechManager.speak("Pencarian suara dihentikan.");
        } else {
          waves.forEach(w => w.style.display = 'block');
          queryText.innerHTML = "Mendengarkan...";
          window.speechManager.speak("Mendengarkan.");

          window.speechManager.startListening(
            // On Result
            (transcript) => {
              queryText.innerHTML = `&quot;${transcript}&quot;`;
              waves.forEach(w => w.style.display = 'none');
              state.destination = transcript.charAt(0).toUpperCase() + transcript.slice(1);
              
              // Speak and navigate only after the announcement finishes speaking
              window.speechManager.speak(`Mencari rute menuju ${transcript}.`, () => {
                setTimeout(() => {
                  navigateTo('deaf-confirm');
                }, 400);
              });
            },
            // On End
            () => {
              waves.forEach(w => w.style.display = 'none');
            },
            // On Error
            (err) => {
              queryText.innerHTML = "Gagal mendeteksi suara.";
              waves.forEach(w => w.style.display = 'none');
              window.speechManager.speak("Gagal mendengar suara Anda. Silakan ketuk salah satu saran di bawah.");
            }
          );
        }
      };
    }

    if (suggestion1) {
      suggestion1.onclick = () => {
        state.destination = 'Stasiun Sudirman';
        window.speechManager.speak("Mencari rute menuju Stasiun Sudirman.", () => {
          navigateTo('deaf-confirm');
        });
      };
    }
    if (suggestion2) {
      suggestion2.onclick = () => {
        state.destination = 'Rumah';
        window.speechManager.speak("Mencari rute menuju Rumah.", () => {
          navigateTo('deaf-confirm');
        });
      };
    }

    if (btnKembali) {
      btnKembali.onclick = () => {
        navigateTo('deaf-home');
      };
    }
  }

  else if (viewId === 'deaf-confirm') {
    // Confirm travel screen
    const btnMulai = container.querySelector('.button-mulai-navigasi-26');
    const btnGanti = container.querySelector('.button-ganti-tujuan-19');
    const btnKembali = container.querySelector('.button-kembali-2');
    const destLabel = container.querySelector('.text-13'); // Destination Label

    if (destLabel) {
      destLabel.textContent = state.destination;
    }

    if (btnMulai) {
      btnMulai.onclick = () => {
        // Reset navigation values
        state.stepsRemaining = 200;
        state.distanceRemaining = 150;
        state.timeRemaining = 14;
        navigateTo('navigation');
      };
    }

    if (btnGanti) btnGanti.onclick = () => navigateTo('voice-search');
    if (btnKembali) btnKembali.onclick = () => navigateTo('voice-search');
  }

  else if (viewId === 'navigation') {
    // Navigation view
    const btnUlangi = container.querySelector('.button-ulangi-arahan-18');
    const btnAkhiri = container.querySelector('.button-akhiri-navigasi-24');
    const btnKembali = container.querySelector('.button-kembali-2');
    const stepLabel = container.querySelector('.text-16');
    const distanceLabel = container.querySelector('.text-14');
    const instructionText = container.querySelector('.text-12');

    // Initialize step metrics immediately (without starting progression timer yet)
    startStepSimulation(false);

    // Bind clicking on the center directional area to open the time estimation screen
    const cardArea = container.querySelector('.distance-information-13') || container;
    cardArea.onclick = (e) => {
      // Avoid clicking buttons triggering navigate
      if (!e.target.closest('.button-ulangi-arahan-18') && 
          !e.target.closest('.button-akhiri-navigasi-24') && 
          !e.target.closest('.button-kembali-2')) {
        state.estimationSource = 'navigation';
        navigateTo('estimation');
      }
    };

    if (btnKembali) {
      btnKembali.onclick = (e) => {
        e.stopPropagation();
        state.briefingActive = false;
        stopStepSimulation();
        navigateTo('deaf-confirm');
      };
    }

    if (btnUlangi) {
      btnUlangi.onclick = (e) => {
        e.stopPropagation(); // Avoid triggering card navigation
        state.briefingActive = false; // Cancel briefing state if active

        // Restarts the progression timer from the current step and speaks the instruction
        startStepSimulation(true);
      };
    }

    if (btnAkhiri) {
      btnAkhiri.onclick = (e) => {
        e.stopPropagation();
        state.briefingActive = false;
        stopStepSimulation();
        navigateTo('profile');
      };
    }
  }

  else if (viewId === 'estimation') {
    // Time remaining estimation
    const btnKembali = container.querySelector('.button-go-back-3');
    const tapScreen = container.querySelector('.button-main-content-area-full-screen-tap-t-8');
    const innerContainer = container.querySelector('.container-9');

    // Helper to find matching vehicle from search or voice recognition
    const findMatchingVehicle = (query) => {
      const q = query.toLowerCase()
        .replace(/seratus dua/g, "102")
        .replace(/empat b/g, "4b")
        .replace(/empat be/g, "4b")
        .replace(/tujuh/g, "07")
        .replace(/bis/g, "bus")
        .replace(/\s+/g, "");

      if (q.includes("102")) {
        return { name: "KRL 102", idx: state.checkInOptions.indexOf("KRL 102") };
      }
      if (q.includes("4b")) {
        return { name: "BUS 4B", idx: state.checkInOptions.indexOf("BUS 4B") };
      }
      if (q.includes("07") || q.includes("mrt")) {
        return { name: "MRT 07", idx: state.checkInOptions.indexOf("MRT 07") };
      }

      // Exact or partial check in existing list
      for (let i = 0; i < state.checkInOptions.length; i++) {
        const option = state.checkInOptions[i].toLowerCase().replace(/\s+/g, "");
        if (q.includes(option) || option.includes(q)) {
          return { name: state.checkInOptions[i], idx: i };
        }
      }
      return null;
    };

    // Helper to process search query (either text or voice)
    const handleVehicleSearchInput = (val, triggerCheckIn = false) => {
      if (!val) return;
      
      const match = findMatchingVehicle(val);
      if (match) {
        state.selectedVehicleIdx = match.idx;
        if (triggerCheckIn) {
          state.isCheckedIn = true;
          state.currentStopIdxOnBoard = 0;
          updateEstimationDOM();
          const vehicle = state.checkInOptions[state.selectedVehicleIdx];
          const stops = state.vehicleStops[vehicle];
          const stop = stops[0];
          window.speechManager.speak(`Check-in berhasil untuk ${vehicle}. Pemberhentian berikutnya: ${stop.name}, dalam ${stop.time} menit. Ketuk kiri untuk melihat rute stasiun lain, ketuk kanan untuk kembali ke beranda.`);
        } else {
          updateEstimationDOM();
          const name = state.checkInOptions[state.selectedVehicleIdx];
          window.speechManager.speak(`Memilih kendaraan ${name}.`);
        }
      } else {
        // Dynamic vehicle/ticket creation
        const customName = val.trim().toUpperCase();
        if (!state.checkInOptions.includes(customName)) {
          state.checkInOptions.push(customName);
          state.vehicleStops[customName] = [
            { name: "Stasiun Awal Perjalanan", time: 4 },
            { name: "Stasiun Transit Menengah", time: 10 },
            { name: "Stasiun Akhir Tujuan", time: 16 }
          ];
        }
        state.selectedVehicleIdx = state.checkInOptions.indexOf(customName);
        
        if (triggerCheckIn) {
          state.isCheckedIn = true;
          state.currentStopIdxOnBoard = 0;
          updateEstimationDOM();
          const stops = state.vehicleStops[customName];
          const stop = stops[0];
          window.speechManager.speak(`Tiket kustom berhasil didaftarkan. Check-in ${customName}. Pemberhentian berikutnya: ${stop.name}, dalam ${stop.time} menit. Ketuk kiri untuk melihat rute stasiun lain, ketuk kanan untuk kembali ke beranda.`);
        } else {
          updateEstimationDOM();
          window.speechManager.speak(`Memilih tiket kustom ${customName}.`);
        }
      }
    };

    // Helper to trigger SpeechRecognition for check-in search
    const startVehicleVoiceSearch = (micBtn) => {
      if (window.speechManager.isListening) {
        window.speechManager.stopListening();
        micBtn.classList.remove('listening');
        window.speechManager.speak("Pencarian suara dibatalkan.");
        return;
      }

      micBtn.classList.add('listening');
      window.speechManager.speak("Silakan sebutkan nama kendaraan atau nomor tiket Anda.", () => {
        window.speechManager.startListening(
          // On result
          (transcript) => {
            micBtn.classList.remove('listening');
            // Automatically select and check-in
            handleVehicleSearchInput(transcript, true);
          },
          // On end
          () => {
            micBtn.classList.remove('listening');
          },
          // On error
          (err) => {
            micBtn.classList.remove('listening');
            window.speechManager.speak("Gagal mendengar suara. Silakan coba kembali.");
          }
        );
      });
    };

    // Helper to bind events inside the dynamic content area
    const bindEstimationEvents = () => {
      if (state.estimationSource === 'home') {
        if (!state.isCheckedIn) {
          const micBtn = innerContainer.querySelector('#vehicle-voice-search-btn');
          const sugButtons = innerContainer.querySelectorAll('.quick-veh-btn');

          if (micBtn) {
            micBtn.onclick = (e) => {
              e.stopPropagation();
              startVehicleVoiceSearch(micBtn);
            };
          }

          sugButtons.forEach(btn => {
            btn.onclick = (e) => {
              e.stopPropagation();
              const veh = btn.getAttribute('data-veh');
              handleVehicleSearchInput(veh, true);
            };
          });
        } else {
          // Bind clicks on timeline items to speak and select them
          const timelineItems = innerContainer.querySelectorAll('.timeline-item');
          timelineItems.forEach(item => {
            item.onclick = (e) => {
              e.stopPropagation();
              const idx = parseInt(item.getAttribute('data-idx'));
              state.currentStopIdxOnBoard = idx;
              updateEstimationDOM();
              
              const vehicle = state.checkInOptions[state.selectedVehicleIdx];
              const stops = state.vehicleStops[vehicle];
              const stop = stops[state.currentStopIdxOnBoard];
              window.speechManager.speak(`Fokus pada pemberhentian: ${stop.name}. Estimasi tiba ${stop.time} menit.`);
            };
          });
        }
      }
    };

    const updateEstimationDOM = () => {
      const headerTitle = container.querySelector('.heading-1-6 .text-7');
      const bottomText = container.querySelector('.instructional-text-at-bottom-19 .text-21');
      const backBtn = container.querySelector('.button-go-back-3');

      if (state.estimationSource === 'home') {
        // Hide back button on check-in and tracking/timeline pages
        if (backBtn) backBtn.style.display = 'none';

        if (!state.isCheckedIn) {
          // Check-in Phase
          if (headerTitle) headerTitle.textContent = "CHECK-IN PERJALANAN";
          if (bottomText) bottomText.innerHTML = "KETUK KIRI: GANTI UNIT<br>KETUK KANAN: PILIH";

          const currentVal = state.checkInOptions[state.selectedVehicleIdx];

          // Render centered microfone layout
          innerContainer.innerHTML = `
            <div class="vehicle-search-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
              <button id="vehicle-voice-search-btn" class="vehicle-voice-search-btn" title="Cari dengan suara" style="width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 15px auto 5px auto; border: none; background: #ffffff; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <svg viewBox="0 0 24 24" style="width: 38px; height: 38px; fill: #0058bc;">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              </button>
              <span style="color: rgba(255, 255, 255, 0.7); font-size: 11px; font-weight: 500; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Ketuk Mic untuk Cari Suara</span>
              
              <div class="quick-vehicle-suggestions" style="margin-top: 5px;">
                <button class="quick-veh-btn" data-veh="KRL 102">KRL 102</button>
                <button class="quick-veh-btn" data-veh="BUS 4B">BUS 4B</button>
                <button class="quick-veh-btn" data-veh="MRT 07">MRT 07</button>
              </div>

              <div class="time-remaining-margin-15" style="position:static; margin-top:30px; width:100%;">
                <div class="time-remaining-16" style="position:static; height:auto; width:100%;">
                  <span class="text-17" style="position: relative; left: auto; display: block; text-align: center; width: 100%; font-size: 15px; color: rgba(255,255,255,0.75);">PILIHAN UNIT</span>
                  <span class="heading-3-14-menit-18" id="selected-vehicle-display" style="position: relative; left: auto; display: block; text-align: center; width: 100%; margin-top: 8px; font-size: 32px; font-weight: 700; color: #ffffff; line-height: 1.2;">${currentVal}</span>
                </div>
              </div>
            </div>
          `;
        } else {
          // Multi-stop tracking phase
          const vehicle = state.checkInOptions[state.selectedVehicleIdx];
          const stops = state.vehicleStops[vehicle];
          const stop = stops[state.currentStopIdxOnBoard];

          if (headerTitle) headerTitle.textContent = "PELACAKAN PERJALANAN";
          if (bottomText) bottomText.innerHTML = "KETUK KIRI: RUTE LAIN<br>KETUK KANAN: KEMBALI";

          // Generate vertical timeline list
          let timelineHTML = '';
          stops.forEach((s, idx) => {
            let itemClass = 'timeline-item';
            if (idx < state.currentStopIdxOnBoard) {
              itemClass += ' passed';
            } else if (idx === state.currentStopIdxOnBoard) {
              itemClass += ' active';
            }
            
            timelineHTML += `
              <div class="${itemClass}" data-idx="${idx}">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <span class="timeline-stop-name">${idx + 1}. ${s.name}</span>
                  <span class="timeline-stop-time">${s.time} menit</span>
                </div>
              </div>
            `;
          });

          innerContainer.innerHTML = `
            <div class="time-remaining-margin-15" style="position:static; margin-bottom:12px; width:100%;">
              <div class="time-remaining-16" style="position:static; height:auto; width:100%;">
                <span class="text-17" style="position: relative; left: auto; display: block; text-align: center; width: 100%;">RUTE KENDARAAN</span>
                <span class="heading-3-14-menit-18" id="tracking-vehicle-display" style="position: relative; left: auto; display: block; text-align: center; width: 100%; margin-top: 4px; font-size: 22px; color: #ffffff;">${vehicle}</span>
              </div>
            </div>
            
            <div class="stops-timeline" id="stops-timeline-list">
              ${timelineHTML}
            </div>
          `;
        }
      } else {
        // From navigation: restore original layout content
        if (backBtn) backBtn.style.display = '';
        if (headerTitle) headerTitle.textContent = "ESTIMASI TIBA";
        if (bottomText) bottomText.innerHTML = "KETUK DI MANA SAJA<br>UNTUK KEMBALI";

        if (state.originalEstimationHTML) {
          innerContainer.innerHTML = state.originalEstimationHTML;
        }

        // Re-query labels from newly restored elements inside innerContainer
        const destLabel = innerContainer.querySelector('.text-13');
        const destName = innerContainer.querySelector('.heading-2-stasiun-sudirman-14');
        const labelSisaWaktu = innerContainer.querySelector('.text-17');
        const timeLabel = innerContainer.querySelector('.heading-3-14-menit-18');

        if (destLabel) destLabel.textContent = "TUJUAN";
        if (destName) destName.textContent = state.destination.toUpperCase();
        if (labelSisaWaktu) labelSisaWaktu.textContent = "SISA WAKTU";
        if (timeLabel) timeLabel.textContent = `${state.timeRemaining} MENIT`;
      }

      // Bind all button and keyboard events in the newly rendered HTML
      bindEstimationEvents();
    };

    updateEstimationDOM();

    if (btnKembali) {
      btnKembali.onclick = () => {
        if (state.estimationSource === 'home') {
          if (state.isCheckedIn) {
            // If already checked in, back goes to check-in screen first
            state.isCheckedIn = false;
            updateEstimationDOM();
            announceView('estimation');
          } else {
            navigateTo('deaf-home');
          }
        } else {
          navigateTo('navigation');
        }
      };
    }

    if (tapScreen) {
      tapScreen.onclick = (e) => {
        if (state.estimationSource === 'home') {
          // Detect click side (relative to 390px viewport width)
          const rect = tapScreen.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          
          if (clickX < 195) {
            // Left Side Action
            if (!state.isCheckedIn) {
              // Cycle vehicle choice
              state.selectedVehicleIdx = (state.selectedVehicleIdx + 1) % state.checkInOptions.length;
              updateEstimationDOM();
              const voiceName = state.checkInOptions[state.selectedVehicleIdx]
                .replace("BUS", "Bus")
                .replace("MRT", "M R T")
                .replace("KRL", "K R L");
              window.speechManager.speak(`${voiceName}. Ketuk kiri untuk ganti unit, ketuk kanan untuk pilih.`);
            } else {
              // Cycle stops list
              const vehicle = state.checkInOptions[state.selectedVehicleIdx];
              const stops = state.vehicleStops[vehicle];
              state.currentStopIdxOnBoard = (state.currentStopIdxOnBoard + 1) % stops.length;
              updateEstimationDOM();
              const stop = stops[state.currentStopIdxOnBoard];
              window.speechManager.speak(`Pemberhentian selanjutnya: ${stop.name}. Estimasi tiba ${stop.time} menit.`);
            }
          } else {
            // Right Side Action
            if (!state.isCheckedIn) {
              // Confirm Check-in
              state.isCheckedIn = true;
              state.currentStopIdxOnBoard = 0;
              updateEstimationDOM();
              
              const vehicle = state.checkInOptions[state.selectedVehicleIdx];
              const stops = state.vehicleStops[vehicle];
              const stop = stops[0];
              const msg = `Check-in berhasil untuk ${vehicle}. Pemberhentian berikutnya: ${stop.name}, dalam ${stop.time} menit. Ketuk kiri untuk melihat rute stasiun lain, ketuk kanan untuk kembali ke beranda.`;
              window.speechManager.speak(msg);
            } else {
              // Return to home
              navigateTo('deaf-home');
            }
          }
        } else {
          // From navigation: return to navigation
          navigateTo('navigation');
        }
      };
    }
  }

  else if (viewId === 'assistance') {
    const btnDarurat = container.querySelector('.button-panggilan-darurat-12');
    const btnUmum = container.querySelector('.button-bantuan-umum-17');
    const btnKembali = container.querySelector('.button-kembali-ke-halaman-sebelumnya-3');

    if (btnDarurat) {
      btnDarurat.onclick = () => {
        window.speechManager.speak("Menghubungi panggilan darurat petugas stasiun.");
        alert("Menghubungi Panggilan Darurat (Simulasi)...");
      };
    }

    if (btnUmum) {
      btnUmum.onclick = () => {
        navigateTo('profile');
      };
    }

    if (btnKembali) {
      btnKembali.onclick = () => {
        navigateTo('deaf-home');
      };
    }
  }

  else if (viewId === 'arrival') {
    const screenTap = container.querySelector('.button-ketuk-di-mana-saja-untuk-kembali-ke-11') || container;
    const destName = container.querySelector('.heading-2-9 .text-10'); // check label in arrival screen

    if (destName) {
      destName.textContent = state.destination.toUpperCase();
    }

    screenTap.onclick = () => {
      navigateTo('deaf-home');
    };
  }
}

/**
 * Start Step Simulator
 * @param {boolean} startTimer - If true, starts progression timer and speaks initial step instructions. Otherwise, updates DOM statically.
 */
let currentStepIdx = 0;

function startStepSimulation(startTimer = false) {
  const stepLabel = document.querySelector('#view-navigation .text-16');
  const distanceLabel = document.querySelector('#view-navigation .text-14');
  const instructionText = document.querySelector('#view-navigation .text-12');

  const stepsList = [
    { steps: 200, dist: 150, text: "Belok Kanan ke Jl.<br>Sudirman", speech: "Belok kanan ke Jalan Sudirman, seratus lima puluh meter lagi, atau dua ratus langkah lagi." },
    { steps: 130, dist: 95, text: "Jalan Lurus<br>Jl. Sudirman", speech: "Jalan lurus sepanjang Jalan Sudirman, sembilan puluh lima meter lagi, atau seratus tiga puluh langkah lagi." },
    { steps: 65, dist: 48, text: "Stasiun Sudirman<br>di Depan", speech: "Stasiun Sudirman di depan, empat puluh delapan meter lagi, atau enam puluh lima langkah lagi." }
  ];

  if (!startTimer) {
    // Reset index on initial load
    currentStepIdx = 0;
    stopStepSimulation();

    // Update DOM immediately to show initial layout metrics
    const cur = stepsList[0];
    state.stepsRemaining = cur.steps;
    state.distanceRemaining = cur.dist;
    state.timeRemaining = Math.max(1, Math.ceil(cur.dist / 11));

    if (stepLabel) stepLabel.textContent = `${state.stepsRemaining} Langkah`;
    if (distanceLabel) distanceLabel.textContent = `${state.distanceRemaining} Meter`;
    if (instructionText) instructionText.innerHTML = cur.text;
  } else {
    // Start active progression timer and speech alert
    stopStepSimulation();
    
    const updateDOM = () => {
      const cur = stepsList[currentStepIdx];
      state.stepsRemaining = cur.steps;
      state.distanceRemaining = cur.dist;
      state.timeRemaining = Math.max(1, Math.ceil(cur.dist / 11));

      if (stepLabel) stepLabel.textContent = `${state.stepsRemaining} Langkah`;
      if (distanceLabel) distanceLabel.textContent = `${state.distanceRemaining} Meter`;
      if (instructionText) instructionText.innerHTML = cur.text;

      window.speechManager.speak(cur.speech);
    };

    // Speak initial step immediately on activation
    updateDOM();

    // Set interval to progress steps
    state.simInterval = setInterval(() => {
      currentStepIdx++;
      if (currentStepIdx < stepsList.length) {
        updateDOM();
      } else {
        stopStepSimulation();
        navigateTo('arrival');
      }
    }, 7000); // Progress instruction every 7 seconds
  }
}

/**
 * Stop Step Simulator
 */
function stopStepSimulation() {
  if (state.simInterval) {
    clearInterval(state.simInterval);
    state.simInterval = null;
  }
}

// Router Event Listener
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.substring(1) || 'profile';
  handleRouting(hash);
});

let initialSpeechTriggered = false;
function triggerInitialSpeech(e) {
  if (initialSpeechTriggered) return;
  initialSpeechTriggered = true;

  // Skip page announcement if clicking on elements that trigger their own TTS to avoid cancellation
  if (e && e.target && e.target.closest && (
      e.target.closest('.main-microphone-button-29') ||
      e.target.closest('.container-21') ||
      e.target.closest('.container-23') ||
      e.target.closest('.button-bantuan-umum-17') ||
      e.target.closest('.button-option-1-gangguan-pendengaran-11') ||
      e.target.closest('.button-option-2-gangguan-penglihatan-18') ||
      e.target.closest('.button-cari-tujuan-7') ||
      e.target.closest('.button-estimasi-13') ||
      e.target.closest('.button-bantuan-19')
  )) {
    return;
  }

  const hash = window.location.hash.substring(1) || 'profile';
  announceView(hash);
}

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
  // Bind hover actions globally
  bindHoverListeners();

  // Listen for user interaction to bypass autoplay restrictions on initial load
  window.addEventListener('click', triggerInitialSpeech);
  window.addEventListener('touchstart', triggerInitialSpeech);

  // Save original estimation view layout
  const estimationContainer = document.querySelector('#view-estimation .container-9');
  if (estimationContainer) {
    state.originalEstimationHTML = estimationContainer.innerHTML;
  }

  // Run router on load
  const initialHash = window.location.hash.substring(1) || 'profile';
  handleRouting(initialHash);
});
