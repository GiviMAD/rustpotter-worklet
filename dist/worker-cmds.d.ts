import type { ScoreMode, VADMode } from "rustpotter-web-slim";
export declare enum WorkerOutCmd {
    STARTED = "started",
    STOPPED = "stopped",
    DETECTION = "detection",
    PORT_STARTED = "port_started",
    PORT_STOPPED = "port_stopped",
    WAKEWORD_ADDED = "wakeword_added"
}
export type WorkerOutData<T = WorkerOutCmd> = T extends WorkerOutCmd.STARTED ? boolean : T extends WorkerOutCmd.STOPPED ? boolean : T extends WorkerOutCmd.DETECTION ? Detection : T extends WorkerOutCmd.WAKEWORD_ADDED ? boolean : T extends WorkerOutCmd.PORT_STARTED ? boolean : T extends WorkerOutCmd.PORT_STOPPED ? boolean : undefined;
export type Started = {
    ok: true;
    samplesPerFrame: number;
} | {
    ok: false;
};
export type WorkerOutMsg = WorkerOutCmd extends infer R ? R extends WorkerOutCmd ? [
    cmd: R,
    data: WorkerOutData<R>
] : never : never;
export type Detection = {
    name: string;
    score: number;
    avgScore: number;
    scores: {
        [string: string]: number;
    };
    counter: number;
    gain: number;
};
export type WakewordAdded = {
    id: string;
    ok: boolean;
};
export declare enum WorkerInCmd {
    START = "start",
    STOP = "stop",
    WAKEWORD = "wakeword",
    PORT = "port",
    STOP_PORT = "stop_port"
}
export type WorkerInData<T = WorkerInCmd> = T extends WorkerInCmd.WAKEWORD ? ArrayBuffer : T extends WorkerInCmd.START ? Start : T extends WorkerInCmd.PORT ? MessagePort : undefined;
export type RustpotterConfigInternal = {
    workletPath: string;
    workerPath: string;
    wasmPath: string;
    sampleRate: number;
    threshold: number;
    averagedThreshold: number;
    scoreRef: number;
    bandSize: number;
    minScores: number;
    scoreMode: ScoreMode;
    vadMode: VADMode | undefined;
    gainNormalizerEnabled: boolean;
    minGain: number;
    maxGain: number;
    gainRef?: number;
    bandPassEnabled: boolean;
    bandPassLowCutoff: number;
    bandPassHighCutoff: number;
};
export type Start = {
    wasmBytes: ArrayBuffer;
    config: RustpotterConfigInternal;
};
export type WorkerInMsg = WorkerInCmd extends infer R ? R extends WorkerInCmd ? [
    cmd: R,
    data: WorkerInData<R>
] : never : never;
