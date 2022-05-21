type RustpotterServiceConfig = {
  workletPath?: string,
  wasmPath?: string,
  monitorGain?: number,
  recordingGain?: number,
  threshold?: number,
  averagedThreshold?: number,
  comparatorRef?: number,
  comparatorBandSize?: number,
  eagerMode?: boolean,
};
class RustpotterService {
  private state: string;
  private initialize: Promise<any>;
  private stream: MediaStream;
  private audioContext: AudioContext;
  private recordingGainNode?: GainNode;
  private monitorGainNode?: GainNode;
  private sourceNode?: MediaStreamAudioSourceNode;
  private processor: MessagePort | Worker;
  private processorNode: AudioWorkletNode | ScriptProcessorNode;
  private config: Required<RustpotterServiceConfig>
  constructor(config: RustpotterServiceConfig = {}, private customSourceNode?: MediaStreamAudioSourceNode ) {
    if (!RustpotterService.isRecordingSupported()) {
      throw new Error("Recording is not supported in this browser");
    }
    this.state = "inactive";
    this.config = Object.assign({
      workletPath: '/rustpotterWorker.js',
      wasmPath: '/rustpotter_wasm_bg.wasm',
      monitorGain: 0,
      recordingGain: 1,
      // rustpotter options
      threshold: 0.5,
      averagedThreshold: 0.25,
      comparatorRef: 0.22,
      comparatorBandSize: 6,
      eagerMode: true,
    } as Required<RustpotterServiceConfig>, config);
    this.initAudioContext();
    this.initialize = this.initWorklet().then(() => this.initEncoder());
  }
  static isRecordingSupported() {
    const getUserMediaSupported = global.navigator && global.navigator.mediaDevices && global.navigator.mediaDevices.getUserMedia;
    return AudioContext && getUserMediaSupported && global.WebAssembly;
  }
  private readonly defaultCallback = ({ data }: any) => {
    switch (data['type']) {
      case 'detection':
        const { name, score } = data;
        return this.onspot(name, score);
    }
  };
  clearStream() {
    if (this.stream) {
      if (this.stream.getTracks) {
        this.stream.getTracks().forEach(track => track.stop());
      } else {
        (this.stream as any).stop();
      }
    }
  }
  close() {
    this.monitorGainNode.disconnect();
    this.recordingGainNode.disconnect();

    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }

    this.clearStream();

    if (this.processor) {
      this.processorNode.disconnect();
      this.processor.postMessage({ command: "close" });
    }

    if (!this.customSourceNode) {
      return this.audioContext.close();
    }

    return Promise.resolve();
  }
  private postBuffers(inputBuffer: any) {
    if (this.state === "recording") {
      const buffers = [];
      for (let i = 0; i < inputBuffer.numberOfChannels; i++) {
        buffers[i] = inputBuffer.getChannelData(i);
      }
      this.processor.postMessage({
        command: "process",
        buffers: buffers
      });
    }
  };
  private initAudioContext() {
    const _AudioContext = global.AudioContext || (global as any).webkitAudioContext as typeof global.AudioContext
    this.audioContext = this.customSourceNode?.context ? this.customSourceNode.context as AudioContext : new _AudioContext();

    this.monitorGainNode = this.audioContext.createGain();
    this.setMonitorGain(this.config.monitorGain);

    this.recordingGainNode = this.audioContext.createGain();
    this.setRecordingGain(this.config.recordingGain);
  };
  private initEncoder() {
    if (this.audioContext.audioWorklet) {
      this.processorNode = new AudioWorkletNode(this.audioContext, 'rustpotter-worklet', { numberOfOutputs: 0 });
      this.processor = this.processorNode.port;
    } else {
      console.log('audioWorklet support not detected. Falling back to scriptProcessor');
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processorNode.onaudioprocess = ({ inputBuffer }) => this.postBuffers(inputBuffer);
      this.processorNode.connect(this.audioContext.destination);
      this.processor = new global.Worker(this.config.workletPath);
    }
  }
  private initSourceNode() {
    if (this.customSourceNode) {
      this.sourceNode = this.customSourceNode;
      return Promise.resolve();
    }
    return global.navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
      this.stream = stream;
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    });
  };
  private setupListener() {
    this.processor.removeEventListener("message", this.defaultCallback);
    this.processor.addEventListener("message", this.defaultCallback);
  }
  private initWorker() {
    return new Promise<void>((resolve, reject) => {
      const callback = ({ data }: any) => {
        switch (data['type']) {
          case 'rustpotter-ready':
            this.processor.removeEventListener("message", callback);
            this.setupListener();
            return resolve();
          case 'rustpotter-error':
            this.processor.removeEventListener("message", callback);
            return reject(new Error("Unable to start rustpotter worklet"));
        }
      };
      try {
        this.processor.addEventListener("message", callback);
        if ((this.processor as MessagePort).start) {
          (this.processor as MessagePort).start()
        }
        this.fetchResource(this.config.wasmPath)
          .then(wasmBytes =>
            this.processor.postMessage({
              command: 'init',
              sampleRate: this.audioContext.sampleRate,
              threshold: this.config.threshold,
              averagedThreshold: this.config.averagedThreshold,
              comparatorRef: this.config.comparatorRef,
              comparatorBandSize: this.config.comparatorBandSize,
              eagerMode: this.config.eagerMode,
              wasmBytes,
            })
          );
      } catch (error) {
        reject(error);
      }
    });
  }
  private initWorklet() {
    if (this.audioContext.audioWorklet) {
      return this.audioContext.audioWorklet.addModule(this.config.workletPath);
    }

    return Promise.resolve();
  }
  pause() {
    if (this.state === "recording") {
      this.state = "paused";
      this.recordingGainNode.disconnect();
      this.onpause();
    }
    return Promise.resolve();
  }
  resume() {
    if (this.state === "paused") {
      this.state = "recording";
      this.recordingGainNode.connect(this.processorNode);
      this.onresume();
    }
  }
  setRecordingGain(gain: number) {
    this.config.recordingGain = gain;

    if (this.recordingGainNode && this.audioContext) {
      this.recordingGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01);
    }
  }
  setMonitorGain(gain: number) {
    this.config.monitorGain = gain;

    if (this.monitorGainNode && this.audioContext) {
      this.monitorGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01);
    }
  }
  start() {
    if (this.state === "inactive") {
      this.state = 'loading';

      return this.audioContext.resume()
        .then(() => this.initialize)
        .then(() => Promise.all([this.initSourceNode(), this.initWorker()]))
        .then(() => {
          this.state = "recording";
          this.sourceNode.connect(this.monitorGainNode);
          this.sourceNode.connect(this.recordingGainNode);
          this.monitorGainNode.connect(this.audioContext.destination);
          this.recordingGainNode.connect(this.processorNode);
          this.onstart();
        })
        .catch(error => {
          this.state = 'inactive';
          throw error;
        });
    }
    return Promise.resolve();
  }
  stop() {
    if (this.state === "paused" || this.state === "recording") {
      this.state = "inactive";
      // macOS and iOS requires the source to remain connected (in case stopped while paused)
      this.recordingGainNode.connect(this.processorNode);
      this.monitorGainNode.disconnect();
      this.clearStream();
      return new Promise<void>(resolve => {
        const callback = ({ data }: any) => {
          if (data["type"] === 'done') {
            this.processor.removeEventListener("message", callback);
            resolve();
          }
        };
        this.processor.addEventListener("message", callback);
        if ((this.processor as MessagePort).start) {
          (this.processor as MessagePort).start()
        }
        this.processor.postMessage({ command: "done" });
      }).then(() => this.finish());
    }
    return Promise.resolve();
  }
  getState() {
    return this.state;
  }
  async addWakewordByPath(path: string) {
    return this.fetchResource(path)
      .then(buffer => this.addWakeword(buffer));
  }
  async addWakeword(wakewordBytes: ArrayBuffer) {
    return new Promise<void>((resolve, reject) => {
      const callback = ({ data }: any) => {
        switch (data['type']) {
          case 'wakeword-loaded':
            this.processor.removeEventListener("message", callback);
            return resolve();
          case 'wakeword-error':
            this.processor.removeEventListener("message", callback);
            return reject(new Error("Unable to load wakeword"))
        }
      };
      this.processor.addEventListener("message", callback);
      this.processor.postMessage({
        command: 'wakeword',
        wakewordBytes,
      });
    });
  }
  private fetchResource(path: string) {
    return window.fetch(path)
      .then(response => response.arrayBuffer())
  }
  private finish() {
    this.onstop();
  }
  onpause = () => { };
  onresume = () => { };
  onstart = () => { };
  onstop = () => { };
  onspot = (name: string, score: number) => { };
}
module.exports = { RustpotterService };