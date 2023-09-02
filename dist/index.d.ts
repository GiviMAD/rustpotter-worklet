import { Detection, RustpotterConfigInternal } from "./worker-cmds";
export { ScoreMode, VADMode } from "rustpotter-web-slim";
export { Detection } from "./worker-cmds";
export type RustpotterServiceConfig = Partial<RustpotterConfigInternal>;
export declare class RustpotterService {
    private worker;
    private workerPort;
    private audioProcessorNode?;
    private config;
    private spotListener;
    static new(config?: RustpotterServiceConfig): Promise<RustpotterService>;
    private constructor();
    private readonly workerCallback;
    onDetection(cb: (detection: Detection) => void): void;
    close(): Promise<void>;
    getProcessorNode(audioContext: AudioContext): Promise<AudioWorkletNode>;
    disposeProcessorNode(): Promise<unknown>;
    addWakewordByPath(key: string, path: string, headers?: HeadersInit): Promise<boolean>;
    addWakeword(key: string, wakewordBytes: ArrayBuffer): Promise<boolean>;
    removeWakeword(key: string): Promise<boolean>;
    removeWakewords(): Promise<boolean>;
    private initWorker;
    private initWorklet;
    private fetchResource;
    private getWorkerMsgCallback;
}
