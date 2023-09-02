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
    private registerWorker;
    private initWorklet;
    getProcessorNode(audioContext: AudioContext): Promise<AudioWorkletNode>;
    disposeProcessorNode(): Promise<unknown>;
    addWakewordByPath(path: string, headers?: HeadersInit): Promise<void>;
    addWakeword(wakewordBytes: ArrayBuffer): Promise<void>;
    private fetchResource;
    private getWorkerMsgCallback;
}
