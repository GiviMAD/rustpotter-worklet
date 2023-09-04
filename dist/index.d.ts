import { Detection, RustpotterConfig, RustpotterResources } from "./worker-cmds";
export { ScoreMode, VADMode } from "rustpotter-web-slim";
export { Detection, RustpotterConfig, RustpotterResources } from "./worker-cmds";
export declare class RustpotterService {
    private sampleRate;
    private resources;
    private worker;
    private workerPort;
    private audioProcessorNode?;
    private config;
    private spotListener;
    private readonly workerCallback;
    static new(sampleRate: number, resources: RustpotterResources, config?: Partial<RustpotterConfig>): Promise<RustpotterService>;
    private constructor();
    onDetection(cb: (detection: Detection) => void): void;
    close(): Promise<void>;
    getProcessorNode(audioContext: AudioContext): Promise<AudioWorkletNode>;
    disposeProcessorNode(): Promise<void>;
    addWakewordByPath(key: string, path: string, headers?: HeadersInit): Promise<boolean>;
    addWakeword(key: string, wakewordBytes: ArrayBuffer): Promise<boolean>;
    removeWakeword(key: string): Promise<boolean>;
    removeWakewords(): Promise<boolean>;
    updateConfig(config: Partial<RustpotterConfig>): Promise<void>;
    private initWorker;
    private initWorklet;
    private fetchResource;
    private resolveOnWorkerMsg;
}
