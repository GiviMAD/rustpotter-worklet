import type { ScoreMode, VADMode } from "rustpotter-web-slim";
export declare enum WorkerOutCmd {
    STARTED = "started",
    STOPPED = "stopped",
    DETECTION = "detection",
    PORT_STARTED = "port_started",
    PORT_STOPPED = "port_stopped",
    WAKEWORD_ADDED = "wakeword_added",
    WAKEWORD_REMOVED = "wakeword_removed",
    WAKEWORDS_REMOVED = "wakewords_removed",
    CONFIG_UPDATED = "config_updated"
}
export type WorkerOutData<T = WorkerOutCmd> = T extends WorkerOutCmd.STARTED ? boolean : T extends WorkerOutCmd.STOPPED ? boolean : T extends WorkerOutCmd.DETECTION ? Detection : T extends WorkerOutCmd.WAKEWORD_ADDED ? boolean : T extends WorkerOutCmd.WAKEWORD_REMOVED ? boolean : T extends WorkerOutCmd.WAKEWORDS_REMOVED ? boolean : T extends WorkerOutCmd.PORT_STARTED ? boolean : T extends WorkerOutCmd.PORT_STOPPED ? boolean : T extends WorkerOutCmd.CONFIG_UPDATED ? boolean : undefined;
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
    ADD_WAKEWORD = "add_wakeword",
    REMOVE_WAKEWORD = "remove_wakeword",
    REMOVE_WAKEWORDS = "remove_wakewords",
    START_PORT = "start_port",
    STOP_PORT = "stop_port",
    UPDATE_CONFIG = "update_config"
}
export type WorkerInData<T = WorkerInCmd> = T extends WorkerInCmd.ADD_WAKEWORD ? [string, ArrayBuffer] : T extends WorkerInCmd.REMOVE_WAKEWORD ? string : T extends WorkerInCmd.START ? Start : T extends WorkerInCmd.UPDATE_CONFIG ? RustpotterConfig : T extends WorkerInCmd.START_PORT ? MessagePort : undefined;
export type RustpotterResources = {
    workletPath: string;
    workerPath: string;
    wasmPath: string;
};
export type RustpotterConfig = {
    threshold: number;
    averagedThreshold: number;
    scoreRef: number;
    bandSize: number;
    minScores: number;
    eager: boolean;
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
    sampleRate: number;
    config: RustpotterConfig;
};
export type WorkerInMsg = WorkerInCmd extends infer R ? R extends WorkerInCmd ? [
    cmd: R,
    data: WorkerInData<R>
] : never : never;
