(function () {
  const RNNOISE_MODULE_URL = './vendor/rnnoise.js';
  const SETTINGS = {
    enabled: true,
    requiredSampleRate: 48000,
    vadOpen: 0.34,
    vadClose: 0.22,
    silenceGain: 0.06,
    release: 0.05,
    attack: 0.28
  };

  const fallbackCreateNoiseSuppressedMicStream = window.createNoiseSuppressedMicStream;
  let rnnoisePromise = null;

  function getAudioContext() {
    if (typeof window.getAC === 'function') {
      const shared = window.getAC();
      if (shared) return shared;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    return AudioContextClass ? new AudioContextClass({ sampleRate: SETTINGS.requiredSampleRate }) : null;
  }

  async function loadRnnoise() {
    if (!rnnoisePromise) {
      rnnoisePromise = import(RNNOISE_MODULE_URL).then((module) => module.Rnnoise.load());
    }

    return rnnoisePromise;
  }

  function compactQueue(queue, state) {
    if (state.outIndex > 2048) {
      queue.splice(0, state.outIndex);
      state.outIndex = 0;
    }
  }

  async function createRnnoiseMicStream(rawStream) {
    const ctx = getAudioContext();
    if (!ctx) {
      throw new Error('AudioContext is not available');
    }

    if (ctx.sampleRate !== SETTINGS.requiredSampleRate) {
      throw new Error(`RNNoise requires ${SETTINGS.requiredSampleRate}Hz audio, got ${ctx.sampleRate}Hz`);
    }

    const rnnoise = await loadRnnoise();
    const denoiseState = rnnoise.createDenoiseState();
    const frameSize = rnnoise.frameSize;
    const frame = new Float32Array(frameSize);
    const outputQueue = [];
    const streamState = {
      frameOffset: 0,
      outIndex: 0,
      gateGain: 1
    };

    const source = ctx.createMediaStreamSource(rawStream);
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 85;
    highpass.Q.value = 0.7;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 7600;
    lowpass.Q.value = 0.7;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -38;
    compressor.knee.value = 20;
    compressor.ratio.value = 2.8;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.16;

    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const output = event.outputBuffer.getChannelData(0);

      for (let i = 0; i < input.length; i += 1) {
        const clamped = Math.max(-1, Math.min(1, input[i] || 0));
        frame[streamState.frameOffset] = clamped * 32768;
        streamState.frameOffset += 1;

        if (streamState.frameOffset === frameSize) {
          const vad = denoiseState.processFrame(frame);
          const targetGain = vad > SETTINGS.vadOpen ? 1 : (vad < SETTINGS.vadClose ? SETTINGS.silenceGain : streamState.gateGain);
          streamState.gateGain += (targetGain - streamState.gateGain) * (targetGain > streamState.gateGain ? SETTINGS.attack : SETTINGS.release);

          for (let j = 0; j < frameSize; j += 1) {
            outputQueue.push(Math.max(-1, Math.min(1, (frame[j] / 32768) * streamState.gateGain)));
          }

          streamState.frameOffset = 0;
          compactQueue(outputQueue, streamState);
        }

        output[i] = streamState.outIndex < outputQueue.length ? outputQueue[streamState.outIndex] : 0;
        if (streamState.outIndex < outputQueue.length) {
          streamState.outIndex += 1;
        }
      }
    };

    const destination = ctx.createMediaStreamDestination();
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(processor);
    processor.connect(compressor);
    compressor.connect(destination);

    const processed = destination.stream;
    processed._rawStream = rawStream;
    processed._audioNodes = { ctx, source, highpass, lowpass, processor, compressor, destination };
    processed._cleanupAudioProcessing = () => {
      try { processor.disconnect(); } catch (error) {}
      try { compressor.disconnect(); } catch (error) {}
      try { lowpass.disconnect(); } catch (error) {}
      try { highpass.disconnect(); } catch (error) {}
      try { source.disconnect(); } catch (error) {}
      try { denoiseState.destroy(); } catch (error) {}
      try { rawStream.getTracks().forEach((track) => track.stop()); } catch (error) {}
    };

    return processed;
  }

  window.createNoiseSuppressedMicStream = async function createNoiseSuppressedMicStreamWithRnnoise(rawStream) {
    if (!SETTINGS.enabled) {
      return fallbackCreateNoiseSuppressedMicStream(rawStream);
    }

    try {
      const stream = await createRnnoiseMicStream(rawStream);
      console.info('[trueCORD RNNoise] enabled');
      return stream;
    } catch (error) {
      console.warn('[trueCORD RNNoise] fallback to built-in noise gate:', error);
      return fallbackCreateNoiseSuppressedMicStream(rawStream);
    }
  };
})();

