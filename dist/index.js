import { ScoreMode } from 'rustpotter-web-slim';
export { ScoreMode, VADMode } from 'rustpotter-web-slim';

var WorkerOutCmd;
(function (WorkerOutCmd) {
    WorkerOutCmd["STARTED"] = "started";
    WorkerOutCmd["STOPPED"] = "stopped";
    WorkerOutCmd["DETECTION"] = "detection";
    WorkerOutCmd["PORT_STARTED"] = "port_started";
    WorkerOutCmd["PORT_STOPPED"] = "port_stopped";
    WorkerOutCmd["WAKEWORD_ADDED"] = "wakeword_added";
})(WorkerOutCmd || (WorkerOutCmd = {}));
var WorkerInCmd;
(function (WorkerInCmd) {
    WorkerInCmd["START"] = "start";
    WorkerInCmd["STOP"] = "stop";
    WorkerInCmd["WAKEWORD"] = "wakeword";
    WorkerInCmd["PORT"] = "port";
    WorkerInCmd["STOP_PORT"] = "stop_port";
})(WorkerInCmd || (WorkerInCmd = {}));

class RustpotterService {
    static async new(config = {}) {
        const instance = new RustpotterService(config);
        await instance.registerWorker();
        return instance;
    }
    constructor(config) {
        this.spotListener = (detection) => { };
        this.workerCallback = ({ data }) => {
            switch (data[0]) {
                case WorkerOutCmd.DETECTION:
                    return this.spotListener(data[1]);
            }
        };
        this.config = Object.assign({
            workletPath: '/rustpotterWorklet.js',
            workerPath: '/rustpotterWorker.js',
            wasmPath: '/rustpotter_wasm_bg.wasm',
            monitorGain: 0,
            recordingGain: 1,
            // rustpotter options
            sampleRate: 16000,
            minScores: 5,
            threshold: 0.5,
            averagedThreshold: 0.25,
            scoreRef: 0.22,
            bandSize: 6,
            vadMode: null,
            scoreMode: ScoreMode.max,
            gainNormalizerEnabled: false,
            minGain: 0.1,
            maxGain: 1,
            gainRef: undefined,
            bandPassEnabled: false,
            bandPassLowCutoff: 85,
            bandPassHighCutoff: 400,
        }, config);
    }
    onDetection(cb) {
        this.spotListener = cb;
    }
    close() {
        var _a;
        if (this.workerPort) {
            (_a = this.audioProcessorNode) === null || _a === void 0 ? void 0 : _a.disconnect();
            this.workerPort([WorkerInCmd.STOP, undefined]);
        }
        return Promise.resolve();
    }
    async registerWorker() {
        const worker = this.worker = new window.Worker(this.config.workerPath);
        this.workerPort = (msg, t) => worker.postMessage(msg, t);
        return new Promise(async (resolve, reject) => {
            const callback = ({ data }) => {
                switch (data[0]) {
                    case WorkerOutCmd.STARTED:
                        if (data[1]) {
                            worker.addEventListener("message", this.workerCallback);
                            return resolve();
                        }
                        else {
                            return reject(new Error("Unable to start rustpotter worker"));
                        }
                }
            };
            try {
                worker.addEventListener("message", callback, { once: true });
                this.fetchResource(this.config.wasmPath)
                    .then(wasmBytes => this.workerPort([WorkerInCmd.START, {
                        wasmBytes,
                        config: this.config,
                    }]));
            }
            catch (error) {
                reject(error);
            }
        });
    }
    initWorklet(audioContext) {
        if (audioContext.sampleRate != this.config.sampleRate) {
            throw new Error("Audio context sample rate is not correct");
        }
        return new Promise(async (resolve, reject) => {
            try {
                await audioContext.audioWorklet.addModule(this.config.workletPath);
                this.audioProcessorNode = new AudioWorkletNode(audioContext, 'rustpotter-worklet', { numberOfOutputs: 0 });
                const workletPort = this.audioProcessorNode.port;
                const callback = this.getWorkerMsgCallback(WorkerOutCmd.PORT_STARTED, resolve, () => reject(new Error("Unable to setup rustpotter worklet")));
                this.worker.addEventListener("message", callback, { once: true });
                this.workerPort([WorkerInCmd.PORT, workletPort], [workletPort]);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async getProcessorNode(audioContext) {
        if (this.audioProcessorNode) {
            throw new Error("Can not create multiple processor nodes");
        }
        await this.initWorklet(audioContext);
        return this.audioProcessorNode;
    }
    async disposeProcessorNode() {
        if (!this.audioProcessorNode) {
            throw new Error("Processor node already disposed");
        }
        return new Promise((resolve, reject) => {
            try {
                this.audioProcessorNode.disconnect();
            }
            catch (_a) {
            }
            this.audioProcessorNode = null;
            const callback = this.getWorkerMsgCallback(WorkerOutCmd.PORT_STOPPED, resolve, () => reject(new Error("Unable to stop worklet")));
            this.worker.addEventListener("message", callback, { once: true });
            this.workerPort([WorkerInCmd.STOP_PORT, undefined]);
        });
    }
    async addWakewordByPath(path, headers) {
        return this.fetchResource(path, headers)
            .then(buffer => this.addWakeword(buffer));
    }
    async addWakeword(wakewordBytes) {
        return new Promise((resolve, reject) => {
            const callback = this.getWorkerMsgCallback(WorkerOutCmd.WAKEWORD_ADDED, resolve, () => reject(new Error("Unable to load wakeword")));
            this.worker.addEventListener("message", callback, { once: true });
            this.workerPort([WorkerInCmd.WAKEWORD, wakewordBytes], [wakewordBytes]);
        });
    }
    fetchResource(path, headers) {
        return window.fetch(path, { headers })
            .then(response => {
            if (response.ok) {
                return response.arrayBuffer();
            }
            else {
                throw new Error(`Failed with http status ${response.status}: ${response.statusText}`);
            }
        });
    }
    getWorkerMsgCallback(cmd, resolve, reject) {
        return ({ data }) => {
            if (data[0] == cmd) {
                if (data[1]) {
                    return resolve();
                }
                else {
                    return reject();
                }
            }
        };
    }
}

export { RustpotterService };
