import { WorkerInMsg, WorkerInCmd as WorkerInCmd, WorkerOutCmd, RustpotterConfig as RustpotterConfigJS, WorkerOutMsg } from './worker-cmds';
import { RustpotterDetection, Rustpotter, RustpotterConfig, SampleFormat, initSync } from "rustpotter-web-slim";
import { WorkletInCmd, WorkletInMsg, WorkletOutCommands, WorkletOutMsg } from './worklet-cmds';
class RustpotterWorkerImpl {
    private rustpotter: Rustpotter;
    private workletPort?: MessagePort;
    private workletAudioCallback = ({ data }: { data: WorkletOutMsg } & Event) => {
        if (data[0] == WorkletOutCommands.AUDIO) {
            this.process(data[1]);
        }
    }
    constructor(sampleRate: number, wasmBytes: ArrayBuffer, config: RustpotterConfigJS, private postMessage: (msg: WorkerOutMsg) => void) {
        initSync(wasmBytes);
        const rustpotterConfig = RustpotterConfig.new();
        rustpotterConfig.setSampleRate(sampleRate);
        rustpotterConfig.setSampleFormat(SampleFormat.f32);
        rustpotterConfig.setChannels(1);
        this.setConfigOptions(rustpotterConfig, config);
        this.rustpotter = Rustpotter.new(rustpotterConfig);
        rustpotterConfig.free();
    }
    getSamplesPerFrame() {
        return this.rustpotter.getSamplesPerFrame()
    }
    process(audioSamples: Float32Array) {
        this.handleDetection(this.rustpotter?.processF32(audioSamples));
    }
    updateConfig(config: RustpotterConfigJS) {
        try {
            const rustpotterConfig = RustpotterConfig.new();
            this.setConfigOptions(rustpotterConfig, config);
            this.rustpotter.updateConfig(rustpotterConfig);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
    handleCommand(msg: WorkerInMsg) {
        switch (msg[0]) {
            case WorkerInCmd.START_PORT:
                this.startWorkletPort(msg[1]).then(result => this.postMessage([WorkerOutCmd.PORT_STARTED, result]));
                break;
            case WorkerInCmd.STOP_PORT:
                this.postMessage([WorkerOutCmd.PORT_STOPPED, this.stopWorkletPort()]);
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
            case WorkerInCmd.UPDATE_CONFIG:
                this.postMessage([WorkerOutCmd.CONFIG_UPDATED, this.updateConfig(msg[1])]);
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
        this.stopWorkletPort();
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
    private stopWorkletPort() {
        try {
            this.workletPort?.removeEventListener("message", this.workletAudioCallback);
            this.workletPort?.postMessage([WorkletInCmd.STOP, undefined] as WorkletInMsg);
            this.workletPort?.close();
            this.workletPort = undefined;
            this.rustpotter.reset();
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
    private startWorkletPort(port: MessagePort) {
        return new Promise<boolean>(resolve => {
            try {
                this.workletPort?.removeEventListener("message", this.workletAudioCallback);
                this.workletPort?.close();
                this.workletPort = port;
                port.addEventListener("message", ({ data }: { data: WorkletOutCommands; } & Event) => {
                    if (data[0] == WorkletOutCommands.STARTED) {
                        if (data[1]) {
                            port.addEventListener("message", this.workletAudioCallback);
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }
                }, { once: true });
                port.start?.();
                port.postMessage([WorkletInCmd.START, this.getSamplesPerFrame()] as WorkletInMsg);
            } catch (error) {
                resolve(false);
            }
        });
    }
    private setConfigOptions(rustpotterConfig: RustpotterConfig, config: RustpotterConfigJS) {
        rustpotterConfig.setAveragedThreshold(config.averagedThreshold);
        rustpotterConfig.setThreshold(config.threshold);
        rustpotterConfig.setScoreRef(config.scoreRef);
        rustpotterConfig.setBandSize(config.bandSize);
        rustpotterConfig.setMinScores(config.minScores);
        rustpotterConfig.setEager(config.eager);
        rustpotterConfig.setScoreMode(config.scoreMode);
        rustpotterConfig.setVADMode(config.vadMode);
        rustpotterConfig.setGainNormalizerEnabled(config.gainNormalizerEnabled);
        rustpotterConfig.setMinGain(config.minGain);
        rustpotterConfig.setMaxGain(config.maxGain);
        rustpotterConfig.setGainRef(config.gainRef);
        rustpotterConfig.setBandPassEnabled(config.bandPassEnabled);
        rustpotterConfig.setBandPassLowCutoff(config.bandPassLowCutoff);
        rustpotterConfig.setBandPassHighCutoff(config.bandPassHighCutoff);
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
                    data[1].sampleRate,
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