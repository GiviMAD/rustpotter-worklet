var WorkletOutCommands;
(function (WorkletOutCommands) {
    WorkletOutCommands["STARTED"] = "started";
    WorkletOutCommands["STOPPED"] = "stop";
    WorkletOutCommands["AUDIO"] = "audio";
})(WorkletOutCommands || (WorkletOutCommands = {}));
var WorkletInCmd;
(function (WorkletInCmd) {
    WorkletInCmd["START"] = "start";
    WorkletInCmd["STOP"] = "stop";
    // for scriptprocessor support
    WorkletInCmd["PROCESS"] = "process";
})(WorkletInCmd || (WorkletInCmd = {}));

class RustpotterWorkletImpl {
    constructor(samplesPerFrame, sendMsg) {
        this.samplesPerFrame = samplesPerFrame;
        this.sendMsg = sendMsg;
        this.samplesOffset = 0;
        this.samples = new Float32Array(this.samplesPerFrame);
    }
    process(buffers) {
        const channelBuffer = buffers[0];
        const requiredSamples = this.samplesPerFrame - this.samplesOffset;
        if (channelBuffer.length >= requiredSamples) {
            this.samples.set(channelBuffer.subarray(0, requiredSamples), this.samplesOffset);
            this.sendMsg(WorkletOutCommands.AUDIO, this.samples);
            const remaining = channelBuffer.subarray(requiredSamples);
            if (remaining.length >= this.samplesPerFrame) {
                this.samplesOffset = 0;
                this.process([remaining]);
            }
            else if (remaining.length > 0) {
                this.samplesOffset = remaining.length;
                this.samples.set(remaining, 0);
            }
            else {
                this.samplesOffset = 0;
            }
        }
        else {
            this.samples.set(channelBuffer, this.samplesOffset);
            this.samplesOffset += channelBuffer.length;
        }
    }
}
// register worker
if (typeof registerProcessor === 'function') {
    // Run in AudioWorkletGlobal scope
    class RustpotterWorklet extends AudioWorkletProcessor {
        constructor() {
            super();
            this.continueProcess = true;
            this.port.onmessage = ({ data }) => {
                switch (data[0]) {
                    case WorkletInCmd.START:
                        this.implementation = new RustpotterWorkletImpl(data[1], (...msg) => this.port.postMessage(msg));
                        this.port.postMessage([WorkletOutCommands.STARTED, true]);
                        break;
                    case WorkletInCmd.STOP:
                        this.continueProcess = false;
                        this.port.postMessage([WorkletOutCommands.STOPPED, undefined]);
                        break;
                    default:
                        console.warn(`Unknown command ${data[0]}`);
                }
            };
        }
        process(inputs) {
            if (this.implementation && inputs[0] && inputs[0].length && inputs[0][0] && inputs[0][0].length) {
                this.implementation.process(inputs[0]);
            }
            return this.continueProcess;
        }
    }
    registerProcessor('rustpotter-worklet', RustpotterWorklet);
}
else {
    // run in scriptProcessor worker scope
    let implementation;
    onmessage = ({ data }) => {
        switch (data[0]) {
            case WorkletInCmd.PROCESS:
                if (implementation) {
                    implementation.process(data[1]);
                }
                break;
            case WorkletInCmd.STOP:
                implementation = null;
                postMessage([WorkletOutCommands.STOPPED, undefined]);
                close();
                break;
            case WorkletInCmd.START:
                implementation = new RustpotterWorkletImpl(data[1], (...msg) => postMessage(msg));
                postMessage([WorkletOutCommands.STARTED, true]);
                break;
            default:
                console.warn(`Unknown command ${data[0]}`);
        }
    };
}
