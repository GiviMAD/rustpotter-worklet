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
    WorkerOutCmd["WAKEWORD_REMOVED"] = "wakeword_removed";
    WorkerOutCmd["WAKEWORDS_REMOVED"] = "wakewords_removed";
    WorkerOutCmd["CONFIG_UPDATED"] = "config_updated";
})(WorkerOutCmd || (WorkerOutCmd = {}));
var WorkerInCmd;
(function (WorkerInCmd) {
    WorkerInCmd["START"] = "start";
    WorkerInCmd["STOP"] = "stop";
    WorkerInCmd["ADD_WAKEWORD"] = "add_wakeword";
    WorkerInCmd["REMOVE_WAKEWORD"] = "remove_wakeword";
    WorkerInCmd["REMOVE_WAKEWORDS"] = "remove_wakewords";
    WorkerInCmd["START_PORT"] = "start_port";
    WorkerInCmd["STOP_PORT"] = "stop_port";
    WorkerInCmd["UPDATE_CONFIG"] = "update_config";
})(WorkerInCmd || (WorkerInCmd = {}));

class RustpotterService {
    static async new(sampleRate, resources, config = {}) {
        const instance = new RustpotterService(sampleRate, resources, config);
        await instance.initWorker();
        return instance;
    }
    constructor(sampleRate, resources, config) {
        this.sampleRate = sampleRate;
        this.resources = resources;
        this.spotListener = (_) => { };
        this.workerCallback = ({ data }) => {
            switch (data[0]) {
                case WorkerOutCmd.DETECTION:
                    return this.spotListener(data[1]);
            }
        };
        this.config = Object.assign({
            // rustpotter options
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
        await new Promise((resolve, reject) => {
            try {
                this.audioProcessorNode.disconnect();
            }
            catch (_a) {
            }
            this.audioProcessorNode = null;
            this.resolveOnWorkerMsg(WorkerOutCmd.PORT_STOPPED, resolve, () => reject(new Error("Unable to stop worklet")));
            this.workerPort([WorkerInCmd.STOP_PORT, undefined]);
        });
    }
    async addWakewordByPath(key, path, headers) {
        return this.fetchResource(path, headers)
            .then(buffer => this.addWakeword(key, buffer));
    }
    async addWakeword(key, wakewordBytes) {
        return new Promise((resolve) => {
            this.resolveOnWorkerMsg(WorkerOutCmd.WAKEWORD_ADDED, resolve, () => resolve(false));
            this.workerPort([WorkerInCmd.ADD_WAKEWORD, [key, wakewordBytes]], [wakewordBytes]);
        });
    }
    async removeWakeword(key) {
        return new Promise((resolve) => {
            this.resolveOnWorkerMsg(WorkerOutCmd.WAKEWORD_REMOVED, resolve, () => resolve(false));
            this.workerPort([WorkerInCmd.REMOVE_WAKEWORD, key]);
        });
    }
    async removeWakewords() {
        return new Promise((resolve) => {
            this.resolveOnWorkerMsg(WorkerOutCmd.WAKEWORD_REMOVED, resolve, () => resolve(false));
            this.workerPort([WorkerInCmd.REMOVE_WAKEWORDS, undefined]);
        });
    }
    async updateConfig(config) {
        await new Promise((resolve, reject) => {
            this.resolveOnWorkerMsg(WorkerOutCmd.CONFIG_UPDATED, resolve, () => reject(new Error("Unable to update config")));
            this.workerPort([WorkerInCmd.UPDATE_CONFIG, config]);
        });
    }
    async initWorker() {
        const worker = this.worker = new window.Worker(this.resources.workerPath);
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
                this.fetchResource(this.resources.wasmPath)
                    .then(wasmBytes => this.workerPort([WorkerInCmd.START, {
                        wasmBytes,
                        sampleRate: this.sampleRate,
                        config: this.config,
                    }]));
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async initWorklet(audioContext) {
        if (audioContext.sampleRate != this.sampleRate) {
            throw new Error("Audio context sample rate is not correct");
        }
        await new Promise(async (resolve, reject) => {
            try {
                await audioContext.audioWorklet.addModule(this.resources.workletPath);
                this.audioProcessorNode = new AudioWorkletNode(audioContext, 'rustpotter-worklet', { numberOfOutputs: 0 });
                const workletPort = this.audioProcessorNode.port;
                this.resolveOnWorkerMsg(WorkerOutCmd.PORT_STARTED, resolve, () => reject(new Error("Unable to setup rustpotter worklet")));
                this.workerPort([WorkerInCmd.START_PORT, workletPort], [workletPort]);
            }
            catch (error) {
                reject(error);
            }
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
    resolveOnWorkerMsg(cmd, resolve, reject) {
        this.worker.addEventListener("message", ({ data }) => {
            if (data[0] == cmd) {
                if (data[1]) {
                    return resolve(data[1]);
                }
                else {
                    return reject();
                }
            }
        }, { once: true });
    }
}

export { RustpotterService };
