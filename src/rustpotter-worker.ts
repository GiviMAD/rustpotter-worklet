import { WorkerInMsg, WorkerInCmd as WorkerInCmd, WorkerOutCmd, RustpotterConfigInternal, WorkerOutMsg } from './worker-cmds';
import { RustpotterDetection, Rustpotter, RustpotterBuilder, SampleFormat, initSync } from "rustpotter-web-slim";
import { WorkletInCmd, WorkletInMsg, WorkletOutCommands, WorkletOutMsg } from './worklet-cmds';
class RustpotterWorkerImpl {
    private rustpotter: Rustpotter;
    private workletPort?: MessagePort;
    constructor(wasmBytes: ArrayBuffer, private config: RustpotterConfigInternal, private postMessage: (msg: WorkerOutMsg) => void) {
        initSync(wasmBytes);
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
    }
    getSamplesPerFrame() {
        return this.rustpotter.getSamplesPerFrame()
    }
    process(audioSamples: Float32Array) {
        this.handleDetection(this.rustpotter?.processF32(audioSamples));
    }
    handleCommand(msg: WorkerInMsg) {
        switch (msg[0]) {
            case WorkerInCmd.STOP_PORT:
                this.workletPort?.removeEventListener("message", this.workletAudioCallback);
                this.workletPort?.postMessage([WorkletInCmd.STOP, undefined] as WorkletInMsg)
                this.workletPort?.close();
                this.workletPort = undefined;
                this.rustpotter.reset();
                this.postMessage([WorkerOutCmd.PORT_STOPPED, true]);
                break;
            case WorkerInCmd.START_PORT:
                this.workletPort?.close();
                this.workletPort = msg[1];
                const callback = ({ data }: { data: WorkletOutCommands } & Event) => {
                    switch (data[0]) {
                        case WorkletOutCommands.STARTED:
                            if (data[1]) {
                                this.workletPort?.addEventListener("message", this.workletAudioCallback);
                                this.postMessage([WorkerOutCmd.PORT_STARTED, true]);
                            } else {
                                this.postMessage([WorkerOutCmd.PORT_STARTED, false]);
                            }
                            break;
                    }
                };
                this.workletPort.addEventListener("message", callback, { once: true });
                if ((this.workletPort as MessagePort).start) {
                    (this.workletPort as MessagePort).start()
                }
                this.workletPort.postMessage([WorkletInCmd.START, this.getSamplesPerFrame()] as WorkletInMsg);
                break;
            case WorkerInCmd.ADD_WAKEWORD:
                this.postMessage([WorkerOutCmd.WAKEWORD_ADDED, this.addWakeword(...msg[1])]);
                break;
            case WorkerInCmd.REMOVE_WAKEWORD:
                this.postMessage([WorkerOutCmd.WAKEWORD_REMOVED, this.removeWakeword(msg[1])]);
                break;
            case WorkerInCmd.REMOVE_WAKEWORDS:
                this.postMessage([WorkerOutCmd.WAKEWORDS_REMOVED, this.removeWakewords()]);
                break;
            case WorkerInCmd.STOP:
                this.close();
                this.postMessage([WorkerOutCmd.STOPPED, true]);
                close();
                break;
            default:
                console.warn("Unsupported command " + msg[0]);
        }
    }

    close() {
        this.rustpotter.free();
    }

    private addWakeword(key: string, data: ArrayBuffer) {
        try {
            this.rustpotter.addWakeword(key, new Uint8Array(data));
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    private removeWakeword(key: string) {
        try {
            return this.rustpotter.removeWakeword(key);
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    private removeWakewords() {
        try {
            return this.rustpotter.removeWakewords();
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    private workletAudioCallback = ({ data }: { data: WorkletOutMsg } & Event) => {
        switch (data[0]) {
            case WorkletOutCommands.AUDIO:
                this.process(data[1]);
                break;
        }
    }
    private handleDetection(detection?: RustpotterDetection) {
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
}

let implementation: RustpotterWorkerImpl | null = null;
let starting: boolean;
onmessage = ({ data }: { data: WorkerInMsg }) => {
    switch (data[0]) {
        case WorkerInCmd.START:
            try {
                if (implementation != null) {
                    throw new Error("Already started");
                }
                if (starting != null) {
                    throw new Error("Starting");
                }
                starting = true;
                implementation = new RustpotterWorkerImpl(
                    data[1].wasmBytes,
                    data[1].config,
                    (msg) => postMessage(msg),
                );
                postMessage([WorkerOutCmd.STARTED, true] as WorkerOutMsg);
            } catch (err) {
                console.error(err);
                postMessage([WorkerOutCmd.STARTED, false] as WorkerOutMsg);
            } finally {
                starting = false;
            }
            break;
        default:
            if (!implementation) {
                console.warn("Rustpotter worker not started");
                return;
            }
            implementation.handleCommand(data);
            break;
    }
};