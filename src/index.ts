import { ScoreMode } from "rustpotter-web-slim";
import { Detection, RustpotterConfig, RustpotterResources, WorkerInCmd, WorkerInMsg, WorkerOutCmd as WorkerOutCmd, WorkerOutData, WorkerOutMsg } from "./worker-cmds";
export { ScoreMode, VADMode } from "rustpotter-web-slim";
export { Detection, RustpotterConfig, RustpotterResources } from "./worker-cmds";

export class RustpotterService {
  private worker: Worker;
  private workerPort: (msg: WorkerInMsg, transfer?: Transferable[]) => void;
  private audioProcessorNode?: AudioWorkletNode;
  private config: RustpotterConfig;
  private spotListener = (_: Detection) => { };
  private readonly workerCallback = ({ data }: { data: WorkerOutMsg } & Event) => {
    switch (data[0]) {
      case WorkerOutCmd.DETECTION:
        return this.spotListener(data[1]);
    }
  };
  public static async new(sampleRate: number, resources: RustpotterResources, config: Partial<RustpotterConfig> = {} as any): Promise<RustpotterService> {
    const instance = new RustpotterService(sampleRate, resources, config);
    await instance.initWorker();
    return instance;
  }
  private constructor(private sampleRate: number, private resources: RustpotterResources, config: Partial<RustpotterConfig>) {
    this.config = Object.assign({
      // rustpotter options
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
    } as RustpotterConfig, config);
  }
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
  async getProcessorNode(audioContext: AudioContext) {
    if (this.audioProcessorNode) {
      throw new Error("Can not create multiple processor nodes");
    }
    await this.initWorklet(audioContext);
    return this.audioProcessorNode as AudioWorkletNode;
  }
  async disposeProcessorNode() {
    if (!this.audioProcessorNode) {
      throw new Error("Processor node already disposed");
    }
    await new Promise((resolve, reject) => {
      try {
        this.audioProcessorNode.disconnect();
      } catch {
      }
      this.audioProcessorNode = null;
      this.resolveOnWorkerMsg(WorkerOutCmd.PORT_STOPPED, resolve, () => reject(new Error("Unable to stop worklet")));
      this.workerPort([WorkerInCmd.STOP_PORT, undefined]);
    });
  }
  async addWakewordByPath(key: string, path: string, headers?: HeadersInit): Promise<boolean> {
    return this.fetchResource(path, headers)
      .then(buffer => this.addWakeword(key, buffer));
  }
  async addWakeword(key: string, wakewordBytes: ArrayBuffer): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.resolveOnWorkerMsg(WorkerOutCmd.WAKEWORD_ADDED, resolve, () => resolve(false));
      this.workerPort([WorkerInCmd.ADD_WAKEWORD, [key, wakewordBytes]], [wakewordBytes]);
    });
  }
  async removeWakeword(key: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.resolveOnWorkerMsg(WorkerOutCmd.WAKEWORD_REMOVED, resolve, () => resolve(false));
      this.workerPort([WorkerInCmd.REMOVE_WAKEWORD, key]);
    });
  }
  async removeWakewords(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.resolveOnWorkerMsg(WorkerOutCmd.WAKEWORD_REMOVED, resolve, () => resolve(false));
      this.workerPort([WorkerInCmd.REMOVE_WAKEWORDS, undefined]);
    });
  }
  async updateConfig(config: RustpotterConfig) {
    await new Promise((resolve, reject) => {
      this.resolveOnWorkerMsg(WorkerOutCmd.CONFIG_UPDATED, resolve, () => reject(new Error("Unable to update config")));
      this.workerPort([WorkerInCmd.UPDATE_CONFIG, config]);
    });
  }
  private async initWorker() {
    const worker = this.worker = new window.Worker(this.resources.workerPath);
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
        this.fetchResource(this.resources.wasmPath)
          .then(wasmBytes =>
            this.workerPort([WorkerInCmd.START, {
              wasmBytes,
              sampleRate: this.sampleRate,
              config: this.config,
            }])
          );
      } catch (error) {
        reject(error);
      }
    });
  }
  private async initWorklet(audioContext: AudioContext) {
    if (audioContext.sampleRate != this.sampleRate) {
      throw new Error("Audio context sample rate is not correct");
    }
    await new Promise(async (resolve, reject) => {
      try {
        await audioContext.audioWorklet.addModule(this.resources.workletPath);
        this.audioProcessorNode = new AudioWorkletNode(audioContext, 'rustpotter-worklet', { numberOfOutputs: 0 });
        const workletPort = this.audioProcessorNode.port;
        this.resolveOnWorkerMsg(WorkerOutCmd.PORT_STARTED, resolve, () => reject(new Error("Unable to setup rustpotter worklet")));
        this.workerPort([WorkerInCmd.START_PORT, workletPort], [workletPort]);
      } catch (error) {
        reject(error);
      }
    });
  }
  private fetchResource(path: string, headers?: HeadersInit) {
    return window.fetch(path, { headers })
      .then(response => {
        if (response.ok) {
          return response.arrayBuffer();
        } else {
          throw new Error(`Failed with http status ${response.status}: ${response.statusText}`)
        }
      })
  }
  private resolveOnWorkerMsg<T extends WorkerOutCmd>(cmd: T, resolve: (value: WorkerOutData<T>) => void, reject: () => void) {
    this.worker.addEventListener("message", ({ data }: { data: WorkerOutMsg; } & Event) => {
      if (data[0] == cmd) {
        if (data[1]) {
          return resolve(data[1] as WorkerOutData<T>);
        } else {
          return reject();
        }
      }
    }, { once: true });
  }
}
