import { ScoreMode } from "rustpotter-web-slim";
import { Detection, RustpotterConfigInternal, WorkerInCmd, WorkerInMsg, WorkerOutCmd as WorkerOutCmd, WorkerOutMsg } from "./worker-cmds";
export { ScoreMode, VADMode } from "rustpotter-web-slim";
export { Detection } from "./worker-cmds";
export type RustpotterServiceConfig = Partial<RustpotterConfigInternal>;

export class RustpotterService {
  private worker: Worker;
  private workerPort: (msg: WorkerInMsg, transfer?: Transferable[]) => void;
  private audioProcessorNode?: AudioWorkletNode;
  private config: RustpotterConfigInternal;
  private spotListener = (detection: Detection) => { };

  public static async new(config: RustpotterServiceConfig = {} as any): Promise<RustpotterService> {
    const instance = new RustpotterService(config);
    await instance.registerWorker();
    return instance;
  }

  private constructor(config: RustpotterServiceConfig) {
    this.config = Object.assign({
      workletPath: '/rustpotterWorklet.js',
      workerPath: '/rustpotterWorker.js',
      wasmPath: '/rustpotter_wasm_bg.wasm',
      monitorGain: 0,
      recordingGain: 1,
      // rustpotter options
      sampleRate: 16000,
      minScores: 5,
      threshold: 0.5,
      averagedThreshold: 0.25,
      scoreRef: 0.22,
      bandSize: 6,
      vadMode: null,
      scoreMode: ScoreMode.max,
      gainNormalizerEnabled: false,
      minGain: 0.1,
      maxGain: 1,
      gainRef: undefined,
      bandPassEnabled: false,
      bandPassLowCutoff: 85,
      bandPassHighCutoff: 400,
    } as RustpotterConfigInternal, config);
  }

  private readonly workerCallback = ({ data }: { data: WorkerOutMsg } & Event) => {
    switch (data[0]) {
      case WorkerOutCmd.DETECTION:
        return this.spotListener(data[1]);
    }
  };
  public onDetection(cb: (detection: Detection) => void) {
    this.spotListener = cb;
  }
  public close() {
    if (this.workerPort) {
      this.audioProcessorNode?.disconnect();
      this.workerPort([WorkerInCmd.STOP, undefined]);
    }
    return Promise.resolve();
  }

  private async registerWorker() {
    const worker = this.worker = new window.Worker(this.config.workerPath);
    this.workerPort = (msg, t) => worker.postMessage(msg, t);
    return new Promise<void>(async (resolve, reject) => {
      const callback = ({ data }: { data: WorkerOutMsg } & Event) => {
        switch (data[0]) {
          case WorkerOutCmd.STARTED:
            if (data[1]) {
              worker.addEventListener("message", this.workerCallback);
              return resolve();
            } else {
              return reject(new Error("Unable to start rustpotter worker"));
            }
        }
      };
      try {
        worker.addEventListener("message", callback, { once: true });
        this.fetchResource(this.config.wasmPath)
          .then(wasmBytes =>
            this.workerPort([WorkerInCmd.START, {
              wasmBytes,
              config: this.config,
            }] as WorkerInMsg)
          );
      } catch (error) {
        reject(error);
      }
    });


  }
  private async registerWorklet(audioContext: AudioContext): Promise<MessagePort> {
    await audioContext.audioWorklet.addModule(this.config.workletPath);
    this.audioProcessorNode = new AudioWorkletNode(audioContext, 'rustpotter-worklet', { numberOfOutputs: 0 });
    return this.audioProcessorNode.port;
  }

  private initWorklet(audioContext: AudioContext) {
    if (audioContext.sampleRate != this.config.sampleRate) {
      throw new Error("Audio context sample rate is not correct");
    }
    return new Promise<void>(async (resolve, reject) => {
      try {
        const workletPort = await this.registerWorklet(audioContext);
        const callback = this.getWorkletMsgCallback(WorkerOutCmd.PORT_STARTED, resolve, () => reject(new Error("Unable to setup rustpotter worklet")));
        this.worker.addEventListener("message", callback, { once: true });
        this.workerPort([WorkerInCmd.PORT, workletPort], [workletPort]);
      } catch (error) {
        reject(error);
      }
    });
  }
  async getProcessorNode(audioContext: AudioContext) {
    if (this.audioProcessorNode) {
      throw new Error("Can not create multiple processor nodes");
    }
    await this.initWorklet(audioContext);
    return this.audioProcessorNode;
  }
  async disposeProcessorNode() {
    if (!this.audioProcessorNode) {
      throw new Error("Processor node already disposed");
    }
    return new Promise((resolve, reject) => {
      try {
        this.audioProcessorNode.disconnect();
      } catch (error) {
        return reject(error);
      }
      this.audioProcessorNode = null;
      const callback = this.getWorkletMsgCallback(WorkerOutCmd.PORT_STOPPED, resolve, () => reject(new Error("Unable to load wakeword")));
      this.worker.addEventListener("message", callback, { once: true });
      this.workerPort([WorkerInCmd.STOP_PORT, undefined]);
    });
  }
  async addWakewordByPath(path: string, headers?: HeadersInit) {
    return this.fetchResource(path, headers)
      .then(buffer => this.addWakeword(buffer));
  }
  async addWakeword(wakewordBytes: ArrayBuffer) {
    return new Promise<void>((resolve, reject) => {
      const callback = this.getWorkletMsgCallback(WorkerOutCmd.WAKEWORD_ADDED, resolve, () => reject(new Error("Unable to load wakeword")));
      this.worker.addEventListener("message", callback, { once: true });
      this.workerPort([WorkerInCmd.WAKEWORD, wakewordBytes] as WorkerInMsg, [wakewordBytes]);
    });
  }
  private fetchResource(path: string, headers?: HeadersInit) {
    return window.fetch(path, { headers })
      .then(response => response.arrayBuffer())
  }
  private getWorkletMsgCallback(cmd: WorkerOutCmd, resolve: (value: void | PromiseLike<void>) => void, reject: () => void) {
    return ({ data }: { data: WorkerOutMsg; } & Event) => {
      if (data[0] == cmd) {
        if (data[1]) {
          return resolve();
        } else {
          return reject();
        }
      }
    };
  }
}
