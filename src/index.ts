import { ScoreMode } from "rustpotter-web-slim";
export { ScoreMode } from "rustpotter-web-slim";
export type RustpotterServiceConfig = Partial<RustpotterServiceConfigInternal>;
export type Detection = {
  name: string,
  score: number,
  avgScore: number,
  scores: { [string: string]: number },
  counter: number,
  gain: number,
};
export type RustpotterServiceConfigInternal = {
  workletPath: string,
  wasmPath: string,
  threshold: number,
  averagedThreshold: number,
  comparatorRef: number,
  comparatorBandSize: number,
  minScores: number,
  scoreMode: ScoreMode,
  gainNormalizerEnabled: boolean,
  minGain: number,
  maxGain: number,
  gainRef?: number,
  bandPassEnabled: boolean,
  bandPassLowCutoff: number,
  bandPassHighCutoff: number,
};
export class RustpotterService {
  private state: string;
  private stream: MediaStream;
  private audioContext: AudioContext;
  private sourceNode?: MediaStreamAudioSourceNode;
  private processor: MessagePort | Worker;
  private processorNode: AudioWorkletNode | ScriptProcessorNode;
  private config: RustpotterServiceConfigInternal;
  constructor(config: RustpotterServiceConfig = {} as any, private customSourceNode?: MediaStreamAudioSourceNode) {
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
      minScores: 5,
      threshold: 0.5,
      averagedThreshold: 0.25,
      comparatorRef: 0.22,
      comparatorBandSize: 6,
      scoreMode: ScoreMode.max,
      gainNormalizerEnabled: false,
      minGain: 0.1,
      maxGain: 1,
      gainRef: undefined,
      bandPassEnabled: false,
      bandPassLowCutoff: 85,
      bandPassHighCutoff: 400,
    } as RustpotterServiceConfigInternal, config);
  }
  static isRecordingSupported() {
    const getUserMediaSupported = window.navigator && window.navigator.mediaDevices && window.navigator.mediaDevices.getUserMedia;
    return AudioContext && getUserMediaSupported && window.WebAssembly;
  }
  private readonly defaultCallback = ({ data }: any) => {
    switch (data['type']) {
      case 'detection':
        const { detection } = data;
        return this.onspot(detection);
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

    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }

    this.clearStream();

    if (this.processor) {
      this.processorNode.disconnect();
      this.processor.postMessage({ command: "close" });
    }

    if (!this.customSourceNode && this.audioContext) {
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
    const _AudioContext = window.AudioContext || (global as any).webkitAudioContext as typeof window.AudioContext
    this.audioContext = this.customSourceNode?.context ? this.customSourceNode.context as AudioContext : new _AudioContext();
  };
  private async registerWorker(audioContext: AudioContext) {
    if (audioContext.audioWorklet) {
      await audioContext.audioWorklet.addModule(this.config.workletPath);
      this.processorNode = new AudioWorkletNode(audioContext, 'rustpotter-worklet', { numberOfOutputs: 0 });
      this.processor = this.processorNode.port;
    } else {
      console.log('audioWorklet support not detected. Falling back to scriptProcessor');
      this.processorNode = audioContext.createScriptProcessor(4096, 1, 1);
      this.processorNode.onaudioprocess = ({ inputBuffer }) => this.postBuffers(inputBuffer);
      this.processorNode.connect(audioContext.destination);
      this.processor = new window.Worker(this.config.workletPath);
    }
  }
  private initSourceNode() {
    if (this.customSourceNode) {
      this.sourceNode = this.customSourceNode;
      return Promise.resolve();
    }
    return window.navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
      this.stream = stream;
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    });
  };
  private setupListener() {
    this.processor.removeEventListener("message", this.defaultCallback);
    this.processor.addEventListener("message", this.defaultCallback);
  }
  private initWorker(audioContext: AudioContext) {
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
              wasmBytes,
              sampleRate: audioContext.sampleRate,
              ...this.config,
            })
          );
      } catch (error) {
        reject(error);
      }
    });
  }
  async getProcessorNode(audioContext: AudioContext) {
    this.state = "external";
    await this.registerWorker(audioContext);
    await this.initWorker(audioContext);
    return this.processorNode;
  }
  pause() {
    if (this.state === "recording") {
      this.state = "paused";
      this.sourceNode.disconnect();
      this.onpause();
    }
    return Promise.resolve();
  }
  resume() {
    if (this.state === "paused") {
      this.state = "recording";
      this.sourceNode.connect(this.processorNode);
      this.onresume();
    }
  }
  start() {
    if (this.state === "inactive") {
      this.state = 'loading';
      this.initAudioContext();
      return this.audioContext.resume()
        .then(() => this.registerWorker(this.audioContext))
        .then(() => Promise.all([this.initSourceNode(), this.initWorker(this.audioContext)]))
        .then(() => {
          this.state = "recording";
          this.sourceNode.connect(this.processorNode);
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
      this.sourceNode.connect(this.processorNode)
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
  async addWakewordByPath(path: string, headers?: HeadersInit) {
    return this.fetchResource(path, headers)
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
  private fetchResource(path: string, headers?: HeadersInit) {
    return window.fetch(path, { headers })
      .then(response => response.arrayBuffer())
  }
  private finish() {
    this.onstop();
  }
  onpause = () => { };
  onresume = () => { };
  onstart = () => { };
  onstop = () => { };
  onspot = (detection: Detection) => { };
}