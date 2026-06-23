/**
 * TransAkses Web Speech API Manager
 * Handles Indonesian Text-to-Speech (TTS) and Speech-to-Text (STT)
 */

class SpeechManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.recognition = null;
    this.isListening = false;
    this.indonesianVoice = null;
    this.audioElement = new Audio(); // HTML5 audio element for WebView fallback

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'id-ID';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.isSTTSupported = true;
    } else {
      this.isSTTSupported = false;
      console.warn("Speech Recognition (STT) is not supported in this browser.");
    }

    // Cache Indonesian voice with voiceschanged event and polling fallback (vital for WebViews)
    this._initVoices();
    if (this.synth) {
      if (typeof this.synth.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', () => this._initVoices());
      }
      let pollCount = 0;
      const pollInterval = setInterval(() => {
        pollCount++;
        this._initVoices();
        if (this.indonesianVoice || pollCount >= 20) {
          clearInterval(pollInterval);
        }
      }, 250);
    }
  }

  _initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    this.indonesianVoice = voices.find(voice => 
      voice.lang.includes('id') || 
      voice.lang.includes('ID') || 
      voice.name.toLowerCase().includes('indonesian')
    ) || null;
  }

  /**
   * Speak a text string using native SpeechSynthesis or Google TTS fallback
   * @param {string} text - Text to speak
   * @param {function} onEnd - Optional callback on completion
   */
  speak(text, onEnd = null) {
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return;

    // Check if we are running inside Android WebView where speechSynthesis is historically broken or lacks offline voices.
    // Also use fallback if SpeechSynthesis object doesn't exist, has no loaded voices, or failed to detect Indonesian voice.
    const isWebView = /wv|webview|android/i.test(navigator.userAgent) && !/chrome\/[0-9.]+\s+mobile/i.test(navigator.userAgent);
    const voices = this.synth ? this.synth.getVoices() : [];
    const hasIndonesianVoice = this.indonesianVoice || voices.some(v => v.lang.includes('id'));

    if (isWebView || !this.synth || !hasIndonesianVoice) {
      console.log("Using Google Translate TTS Fallback for WebView/Unsupported environments...");
      this.cancel();

      // Chunk text if it exceeds 150 characters to stay within Google Translate TTS URL length constraints
      const chunks = [];
      if (cleanText.length > 150) {
        const parts = cleanText.split(/([.,?!])/);
        let currentChunk = "";
        for (let i = 0; i < parts.length; i++) {
          currentChunk += parts[i];
          if (/[.,?!]/.test(parts[i]) || currentChunk.length > 120) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = "";
          }
        }
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
      } else {
        chunks.push(cleanText);
      }

      let currentIdx = 0;
      const playNextChunk = () => {
        if (currentIdx >= chunks.length) {
          if (onEnd) onEnd();
          return;
        }

        const encodedText = encodeURIComponent(chunks[currentIdx]);
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodedText}`;
        
        this.audioElement.src = ttsUrl;
        this.audioElement.playbackRate = 1.25;
        this.audioElement.onended = () => {
          currentIdx++;
          playNextChunk();
        };
        this.audioElement.onerror = (e) => {
          console.error("Audio chunk playback error. Falling back to next chunk.", e);
          currentIdx++;
          playNextChunk();
        };

        this.audioElement.play().catch(err => {
          console.warn("Audio play blocked/failed. Trying system synthesis as a final fallback.", err);
          this.speakWithSynth(cleanText, onEnd);
        });
      };

      playNextChunk();
    } else {
      this.speakWithSynth(cleanText, onEnd);
    }
  }

  speakWithSynth(cleanText, onEnd) {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID';
    utterance.rate = 1.25;
    utterance.pitch = 1.0;

    if (this.indonesianVoice) {
      utterance.voice = this.indonesianVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    if (this.synth.speaking || this.synth.pending) {
      this.synth.cancel();
      setTimeout(() => {
        this.synth.speak(utterance);
      }, 100);
    } else {
      this.synth.speak(utterance);
    }
  }

  /**
   * Cancel any ongoing SpeechSynthesis or Audio playback
   */
  cancel() {
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
    }
  }

  /**
   * Start listening for voice commands
   * @param {function} onResult - Callback when speech is recognized. Receives transcript string.
   * @param {function} onEnd - Callback when recognition stops
   * @param {function} onError - Callback on error
   */
  startListening(onResult, onEnd, onError) {
    if (!this.isSTTSupported || !this.recognition) {
      if (onError) onError(new Error("Voice recognition not supported"));
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.isListening = true;

    this.recognition.onstart = () => {
      console.log("Speech recognition started.");
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Speech recognition result:", transcript);
      if (onResult) onResult(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      this.isListening = false;
      if (onError) onError(event);
    };

    this.recognition.onend = () => {
      console.log("Speech recognition ended.");
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error("Failed to start Speech Recognition:", e);
      this.isListening = false;
      if (onError) onError(e);
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

// Export a single instance to be used globally
window.speechManager = new SpeechManager();
