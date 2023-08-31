import { WorkerInMsg, WorkerInCmd as WorkerInCmd, WorkerOutCmd, RustpotterConfigInternal, WorkerOutMsg } from './worker-cmds';
import init, { RustpotterDetection, Rustpotter, RustpotterBuilder, SampleFormat } from "rustpotter-web-slim";
import { WorkletInCmd, WorkletInMsg, WorkletOutCommands, WorkletOutMsg } from './worklet-cmds';
class RustpotterWorkerImpl {
    private wasmLoadedPromise: Promise<void>;
    private rustpotter: Rustpotter;
    private workletPort?: MessagePort;
    constructor(wasmBytes: ArrayBuffer, private config: RustpotterConfigInternal, private postMessage: (msg: WorkerOutMsg) => void) {
        this.wasmLoadedPromise = (async () => {
            await init(WebAssembly.compile(wasmBytes));
            const builder = RustpotterBuilder.new();
            builder.setSampleRate(this.config.sampleRate);
            builder.setSampleFormat(SampleFormat.f32);
            builder.setChannels(1);
            builder.setAveragedThreshold(this.config.averagedThreshold);
            builder.setThreshold(this.config.threshold);
            builder.setScoreRef(this.config.scoreRef);
            builder.setBandSize(this.config.bandSize);
            builder.setMinScores(this.config.minScores);
            builder.setScoreMode(this.config.scoreMode);
            builder.setVADMode(this.config.vadMode);
            builder.setGainNormalizerEnabled(this.config.gainNormalizerEnabled);
            builder.setMinGain(this.config.minGain);
            builder.setMaxGain(this.config.maxGain);
            if (this.config.gainRef != null) builder.setGainRef(this.config.gainRef);
            builder.setBandPassEnabled(this.config.bandPassEnabled);
            builder.setBandPassLowCutoff(this.config.bandPassLowCutoff);
            builder.setBandPassHighCutoff(this.config.bandPassHighCutoff);
            this.rustpotter = builder.build();
            builder.free();
        })();
    }
    waitReady() {
        return this.wasmLoadedPromise;
    }
    getSamplesPerFrame() {
        return this.rustpotter.getSamplesPerFrame()
    }
    addWakeword(data: Uint8Array) {
        this.rustpotter.addWakeword(data);
    }
    process(audioSamples: Float32Array) {
        this.handleDetection(this.rustpotter.processF32(audioSamples));
    }
    handleCommand(msg: WorkerInMsg) {
        switch (msg[0]) {
            case WorkerInCmd.STOP_PORT:
                this.workletPort?.postMessage([WorkletInCmd.STOP, undefined] as WorkletInMsg)
                this.workletPort?.close();
                this.workletPort = null;
                this.postMessage([WorkerOutCmd.PORT_STOPPED, true]);
                break;
            case WorkerInCmd.PORT:
                this.workletPort?.close();
                this.workletPort = msg[1];
                const callback = ({ data }: { data: WorkletOutCommands } & Event) => {
                    switch (data[0]) {
                        case WorkletOutCommands.STARTED:
                            if (data[1]) {
                                this.workletPort.addEventListener("message", ({ data }: { data: WorkletOutMsg } & Event) => {
                                    switch (data[0]) {
                                        case WorkletOutCommands.AUDIO:
                                            this.process(data[1]);
                                            break;
                                    }
                                });
                                this.postMessage([WorkerOutCmd.PORT_STARTED, true]);
                            } else {
                                this.postMessage([WorkerOutCmd.PORT_STARTED, false]);
                            }
                        case WorkletOutCommands.STOPPED:
                    }
                };
                this.workletPort.addEventListener("message", callback, { once: true });
                if ((this.workletPort as MessagePort).start) {
                    (this.workletPort as MessagePort).start()
                }
                this.workletPort.postMessage([WorkletInCmd.START, this.getSamplesPerFrame()] as WorkletInMsg);
                break;
            case WorkerInCmd.WAKEWORD:
                try {
                    this.addWakeword(new Uint8Array(msg[1]));
                    this.postMessage([WorkerOutCmd.WAKEWORD_ADDED, true]);
                } catch (error) {
                    console.error(error);
                    this.postMessage([WorkerOutCmd.WAKEWORD_ADDED, false]);
                }
                break;
            case WorkerInCmd.STOP:
                this.close();
                this.postMessage([WorkerOutCmd.STOPPED, undefined]);
                break;
            default:
                console.warn("Unsupported command " + msg[0]);
        }
    }
    private handleDetection(detection: RustpotterDetection) {
        if (detection) {
            const scoreNames = detection.getScoreNames().split("||");
            const scores = detection.getScores().reduce((acc, v, i) => {
                const scoreName = scoreNames[i];
                if (scoreName) {
                    acc[scoreName] = v;
                }
                return acc;
            }, {} as { [key: string]: number });
            this.postMessage([WorkerOutCmd.DETECTION, {
                name: detection.getName(),
                avgScore: detection.getAvgScore(),
                score: detection.getScore(),
                counter: detection.getCounter(),
                gain: detection.getGain(),
                scores
            }]);
            detection.free();
        }
    }

    close() {
        this.rustpotter.free();
    }
}

let implementation: RustpotterWorkerImpl = null;
let starting: boolean;
onmessage = ({ data }: { data: WorkerInMsg }) => {
    switch (data[0]) {
        case WorkerInCmd.START:
            if (implementation != null) {
                console.warn("Already started");
            }
            if (starting != null) {
                console.warn("Already starting");
            }
            starting = true;
            implementation = new RustpotterWorkerImpl(
                data[1].wasmBytes,
                data[1].config,
                (msg) => postMessage(msg),
            );
            implementation.waitReady()
                .then(() => {
                    postMessage([WorkerOutCmd.STARTED, true] as WorkerOutMsg);
                })
                .catch((err: any) => {
                    console.error(err);
                    postMessage([WorkerOutCmd.STARTED, false] as WorkerOutMsg);
                }).finally(() => {
                    starting = false;
                });
            break;
        default:
            if (!implementation) {
                console.warn("Rustpotter worker not started");
                return;
            }
            implementation.handleCommand(data);
            if (data[0] === WorkerInCmd.STOP) {
                implementation = null;
                close();
            }
            break;
    }
};