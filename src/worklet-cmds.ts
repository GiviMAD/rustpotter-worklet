export enum WorkletOutCommands {
    STARTED = "started",
    STOPPED = "stop",
    AUDIO = "audio",
}
export type WorkletOutData<T = WorkletOutCommands> =
    T extends WorkletOutCommands.STARTED ? boolean :
    T extends WorkletOutCommands.AUDIO ? Float32Array : undefined;

export type Detection = {
    name: string,
    score: number,
    avgScore: number,
    scores: { [string: string]: number },
    counter: number,
    gain: number,
};

export type WakewordAdded = {
    id: string,
    ok: boolean,
};

export type WorkletOutMsg = WorkletOutCommands extends infer R ? R extends WorkletOutCommands ?
    [cmd: R, data: WorkletOutData<R>]
    : never : never;

export enum WorkletInCmd {
    START = "start",
    STOP = "stop",
    // for scriptprocessor support
    PROCESS = "process",
}


export type WorkletInData<T = WorkletInCmd> =
    T extends WorkletInCmd.START ? number :
    T extends WorkletInCmd.STOP ? undefined :
    T extends WorkletInCmd.PROCESS ? Float32Array[] :
    undefined;

export type WorkletInMsg = WorkletInCmd extends infer R ? R extends WorkletInCmd ?
    [cmd: R, data: WorkletInData<R>]
    : never : never;
