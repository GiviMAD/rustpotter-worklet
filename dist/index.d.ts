export { NoiseDetectionMode } from "rustpotter-web-slim";
export declare type RustpotterServiceConfig = {
    workletPath?: string;
    wasmPath?: string;
    threshold?: number;
    averagedThreshold?: number;
    comparatorRef?: number;
    comparatorBandSize?: number;
    eagerMode?: boolean;
    noiseMode?: NoiseDetectionMode;
    noiseSensitivity: number;
};
export declare class RustpotterService {
    private customSourceNode?;
    private state;
    private initialize;
    private stream;
    private audioContext;
    private sourceNode?;
    private processor;
    private processorNode;
    private config;
    constructor(config?: RustpotterServiceConfig, customSourceNode?: MediaStreamAudioSourceNode);
    static isRecordingSupported(): typeof WebAssembly;
    private readonly defaultCallback;
    clearStream(): void;
    close(): Promise<void>;
    private postBuffers;
    private initAudioContext;
    private initEncoder;
    private initSourceNode;
    private setupListener;
    private initWorker;
    private initWorklet;
    pause(): Promise<void>;
    resume(): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    getState(): string;
    addWakewordByPath(path: string): Promise<void>;
    addWakeword(wakewordBytes: ArrayBuffer): Promise<void>;
    private fetchResource;
    private finish;
    onpause: () => void;
    onresume: () => void;
    onstart: () => void;
    onstop: () => void;
    onspot: (name: string, score: number) => void;
}


