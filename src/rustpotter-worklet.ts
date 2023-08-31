import { WorkletInCmd, WorkletInMsg, WorkletOutCommands, WorkletOutMsg } from './worklet-cmds';
class RustpotterWorkletImpl {
  private samples: Float32Array;
  private samplesOffset: number;

  constructor(private samplesPerFrame: number, private sendMsg: (...msg: WorkletOutMsg) => void) {
    this.samplesOffset = 0;
    this.samples = new Float32Array(this.samplesPerFrame);
  }
  process(buffers: Float32Array[]) {
    const channelBuffer = buffers[0];
    const requiredSamples = this.samplesPerFrame - this.samplesOffset;
    if (channelBuffer.length >= requiredSamples) {
      this.samples.set(channelBuffer.subarray(0, requiredSamples), this.samplesOffset);
      this.sendMsg(WorkletOutCommands.AUDIO, this.samples);
      const remaining = channelBuffer.subarray(requiredSamples);
      if (remaining.length >= this.samplesPerFrame) {
        this.samplesOffset = 0;
        this.process([remaining]);
      } else if (remaining.length > 0) {
        this.samplesOffset = remaining.length;
        this.samples.set(remaining, 0);
      } else {
        this.samplesOffset = 0;
      }
    } else {
      this.samples.set(channelBuffer, this.samplesOffset);
      this.samplesOffset += channelBuffer.length;
    }
  }
}

// register worker
if (typeof registerProcessor === 'function') {
  // Run in AudioWorkletGlobal scope
  class RustpotterWorklet extends AudioWorkletProcessor {
    continueProcess: boolean;
    implementation?: RustpotterWorkletImpl;
    constructor() {
      super();
      this.continueProcess = true;
      this.port.onmessage = ({ data }: { data: WorkletInMsg }) => {
        switch (data[0]) {
          case WorkletInCmd.START:
            this.implementation = new RustpotterWorkletImpl(
              data[1],
              (...msg) => this.port.postMessage(msg),
            );
            this.port.postMessage([WorkletOutCommands.STARTED, true] as WorkletOutMsg);
            break;
          case WorkletInCmd.STOP:
            this.continueProcess = false;
            this.port.postMessage([WorkletOutCommands.STOPPED, undefined] as WorkletOutMsg);
            break;
          default:
            console.warn(`Unknown command ${data[0]}`);
        }
      }
    }
    process(inputs: Float32Array[][]) {
      if (this.implementation && inputs[0] && inputs[0].length && inputs[0][0] && inputs[0][0].length) {
        this.implementation.process(inputs[0]);
      }
      return this.continueProcess;
    }
  }
  registerProcessor('rustpotter-worklet', RustpotterWorklet);
} else {
  // run in scriptProcessor worker scope
  let implementation: RustpotterWorkletImpl;
  onmessage = ({ data }: { data: WorkletInMsg }) => {
    switch (data[0]) {
      case WorkletInCmd.PROCESS:
        if (implementation) {
          implementation.process(data[1]);
        }
        break;
      case WorkletInCmd.STOP:
        implementation = null;
        postMessage([WorkletOutCommands.STOPPED, undefined] as WorkletOutMsg);
        close();
        break;
      case WorkletInCmd.START:
        implementation = new RustpotterWorkletImpl(
          data[1],
          (...msg) => postMessage(msg),
        );
        postMessage([WorkletOutCommands.STARTED, true]);
        break;
      default:
        console.warn(`Unknown command ${data[0]}`);
    }
  };
}
