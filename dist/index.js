import { ScoreMode } from 'rustpotter-web-slim';
export { ScoreMode, VADMode } from 'rustpotter-web-slim';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

class RustpotterService {
    constructor(config = {}, customSourceNode) {
        this.customSourceNode = customSourceNode;
        this.defaultCallback = ({ data }) => {
            switch (data['type']) {
                case 'detection':
                    const { detection } = data;
                    return this.onspot(detection);
            }
        };
        this.onpause = () => { };
        this.onresume = () => { };
        this.onstart = () => { };
        this.onstop = () => { };
        this.onspot = (detection) => { };
        if (!RustpotterService.isRecordingSupported()) {
            throw new Error("Recording is not supported in this browser");
        }
        this.state = "inactive";
        this.config = Object.assign({
            workletPath: '/rustpotterWorker.js',
            wasmPath: '/rustpotter_wasm_bg.wasm',
            monitorGain: 0,
            recordingGain: 1,
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
    static isRecordingSupported() {
        const getUserMediaSupported = window.navigator && window.navigator.mediaDevices && window.navigator.mediaDevices.getUserMedia;
        return AudioContext && getUserMediaSupported && window.WebAssembly;
    }
    clearStream() {
        if (this.stream) {
            if (this.stream.getTracks) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            else {
                this.stream.stop();
            }
        }
    }
    close() {
        if (this.sourceNode) {
            this.sourceNode.disconnect();
        }
        this.clearStream();
        if (this.processor) {
            this.processorNode.disconnect();
            this.processor.postMessage({ command: "close" });
        }
        if (!this.customSourceNode && this.audioContext) {
            return this.audioContext.close();
        }
        return Promise.resolve();
    }
    postBuffers(inputBuffer) {
        if (this.state === "recording") {
            const buffers = [];
            for (let i = 0; i < inputBuffer.numberOfChannels; i++) {
                buffers[i] = inputBuffer.getChannelData(i);
            }
            this.processor.postMessage({
                command: "process",
                buffers: buffers
            });
        }
    }
    ;
    initAudioContext() {
        var _a;
        const _AudioContext = window.AudioContext || global.webkitAudioContext;
        this.audioContext = ((_a = this.customSourceNode) === null || _a === void 0 ? void 0 : _a.context) ? this.customSourceNode.context : new _AudioContext();
    }
    ;
    registerWorker(audioContext) {
        return __awaiter(this, void 0, void 0, function* () {
            if (audioContext.audioWorklet) {
                yield audioContext.audioWorklet.addModule(this.config.workletPath);
                this.processorNode = new AudioWorkletNode(audioContext, 'rustpotter-worklet', { numberOfOutputs: 0 });
                this.processor = this.processorNode.port;
            }
            else {
                console.log('audioWorklet support not detected. Falling back to scriptProcessor');
                this.processorNode = audioContext.createScriptProcessor(4096, 1, 1);
                this.processorNode.onaudioprocess = ({ inputBuffer }) => this.postBuffers(inputBuffer);
                this.processorNode.connect(audioContext.destination);
                this.processor = new window.Worker(this.config.workletPath);
            }
        });
    }
    initSourceNode() {
        if (this.customSourceNode) {
            this.sourceNode = this.customSourceNode;
            return Promise.resolve();
        }
        return window.navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
            this.stream = stream;
            this.sourceNode = this.audioContext.createMediaStreamSource(stream);
        });
    }
    ;
    setupListener() {
        this.processor.removeEventListener("message", this.defaultCallback);
        this.processor.addEventListener("message", this.defaultCallback);
    }
    initWorker(audioContext) {
        return new Promise((resolve, reject) => {
            const callback = ({ data }) => {
                switch (data['type']) {
                    case 'rustpotter-ready':
                        this.processor.removeEventListener("message", callback);
                        this.setupListener();
                        return resolve();
                    case 'rustpotter-error':
                        this.processor.removeEventListener("message", callback);
                        return reject(new Error("Unable to start rustpotter worklet"));
                }
            };
            try {
                this.processor.addEventListener("message", callback);
                if (this.processor.start) {
                    this.processor.start();
                }
                this.fetchResource(this.config.wasmPath)
                    .then(wasmBytes => this.processor.postMessage(Object.assign({ command: 'init', wasmBytes, sampleRate: audioContext.sampleRate }, this.config)));
            }
            catch (error) {
                reject(error);
            }
        });
    }
    getProcessorNode(audioContext) {
        return __awaiter(this, void 0, void 0, function* () {
            this.state = "external";
            yield this.registerWorker(audioContext);
            yield this.initWorker(audioContext);
            return this.processorNode;
        });
    }
    pause() {
        if (this.state === "recording") {
            this.state = "paused";
            this.sourceNode.disconnect();
            this.onpause();
        }
        return Promise.resolve();
    }
    resume() {
        if (this.state === "paused") {
            this.state = "recording";
            this.sourceNode.connect(this.processorNode);
            this.onresume();
        }
    }
    start() {
        if (this.state === "inactive") {
            this.state = 'loading';
            this.initAudioContext();
            return this.audioContext.resume()
                .then(() => this.registerWorker(this.audioContext))
                .then(() => Promise.all([this.initSourceNode(), this.initWorker(this.audioContext)]))
                .then(() => {
                this.state = "recording";
                this.sourceNode.connect(this.processorNode);
                this.onstart();
            })
                .catch(error => {
                this.state = 'inactive';
                throw error;
            });
        }
        return Promise.resolve();
    }
    stop() {
        if (this.state === "paused" || this.state === "recording") {
            this.state = "inactive";
            // macOS and iOS requires the source to remain connected (in case stopped while paused)
            this.sourceNode.connect(this.processorNode);
            this.clearStream();
            return new Promise(resolve => {
                const callback = ({ data }) => {
                    if (data["type"] === 'done') {
                        this.processor.removeEventListener("message", callback);
                        resolve();
                    }
                };
                this.processor.addEventListener("message", callback);
                if (this.processor.start) {
                    this.processor.start();
                }
                this.processor.postMessage({ command: "done" });
            }).then(() => this.finish());
        }
        return Promise.resolve();
    }
    getState() {
        return this.state;
    }
    addWakewordByPath(path, headers) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetchResource(path, headers)
                .then(buffer => this.addWakeword(buffer));
        });
    }
    addWakeword(wakewordBytes) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const callback = ({ data }) => {
                    switch (data['type']) {
                        case 'wakeword-loaded':
                            this.processor.removeEventListener("message", callback);
                            return resolve();
                        case 'wakeword-error':
                            this.processor.removeEventListener("message", callback);
                            return reject(new Error("Unable to load wakeword"));
                    }
                };
                this.processor.addEventListener("message", callback);
                this.processor.postMessage({
                    command: 'wakeword',
                    wakewordBytes,
                });
            });
        });
    }
    fetchResource(path, headers) {
        return window.fetch(path, { headers })
            .then(response => response.arrayBuffer());
    }
    finish() {
        this.onstop();
    }
}

export { RustpotterService };
