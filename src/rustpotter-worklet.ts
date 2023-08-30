import './text-encoding-polyfill';
import type { RustpotterServiceConfigInternal, Detection } from './index';
import init, { RustpotterDetection, Rustpotter, RustpotterBuilder, SampleFormat } from "rustpotter-web-slim";
class RustpotterWorkletImpl {
  private wasmLoadedPromise: Promise<void>;
  private rustpotter: Rustpotter;
  private samples: Float32Array;
  private samplesOffset: number;
  private rustpotterInputSampleNumber: number;
  constructor(wasmBytes: ArrayBuffer, private config: { sampleRate: number, } & RustpotterServiceConfigInternal, private onSpot: (detection: Detection) => void) {
    if (!this.config['sampleRate']) {
      throw new Error("sampleRate value is required to record. NOTE: Audio is not resampled!");
    }
    this.samplesOffset = 0;
    this.wasmLoadedPromise = (async () => {
      await init(WebAssembly.compile(wasmBytes));
      const builder = RustpotterBuilder.new();
      builder.setSampleRate(this.config.sampleRate);
      builder.setSampleFormat(SampleFormat.f32);
      builder.setChannels(1);
      builder.setAveragedThreshold(this.config.averagedThreshold);
      builder.setThreshold(this.config.threshold);
      builder.setScoreRef(this.config.scoreRef);
      builder.setBandSize(this.config.bandSize);
      builder.setMinScores(this.config.minScores);
      builder.setScoreMode(this.config.scoreMode);
      builder.setVADMode(this.config.vadMode);
      builder.setGainNormalizerEnabled(this.config.gainNormalizerEnabled);
      builder.setMinGain(this.config.minGain);
      builder.setMaxGain(this.config.maxGain);
      if (this.config.gainRef != null) builder.setGainRef(this.config.gainRef);
      builder.setBandPassEnabled(this.config.bandPassEnabled);
      builder.setBandPassLowCutoff(this.config.bandPassLowCutoff);
      builder.setBandPassHighCutoff(this.config.bandPassHighCutoff);
      this.rustpotter = builder.build();
      builder.free();
      this.rustpotterInputSampleNumber = this.rustpotter.getSamplesPerFrame();
      this.samples = new Float32Array(this.rustpotterInputSampleNumber);
    })();
  }
  waitReady() {
    return this.wasmLoadedPromise;
  }
  addWakeword(data: Uint8Array) {
    this.rustpotter.addWakeword(data);
  }
  process(buffers: Float32Array[]) {
    const channelBuffer = buffers[0];
    const requiredSamples = this.rustpotterInputSampleNumber - this.samplesOffset;
    if (channelBuffer.length >= requiredSamples) {
      this.samples.set(channelBuffer.subarray(0, requiredSamples), this.samplesOffset);
      this.handleDetection(this.rustpotter.processF32(this.samples));
      const remaining = channelBuffer.subarray(requiredSamples);
      if (remaining.length >= this.rustpotterInputSampleNumber) {
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
  private handleDetection(detection: RustpotterDetection) {
    if (detection) {
      const scoreNames = detection.getScoreNames().split("||");
      const scores = detection.getScores().reduce((acc, v, i) => {
        const scoreName = scoreNames[i];
        if (scoreName) {
          acc[scoreName] = v;
        }
        return acc;
      }, {} as { [key: string]: number });
      this.onSpot({
        name: detection.getName(),
        avgScore: detection.getAvgScore(),
        score: detection.getScore(),
        counter: detection.getCounter(),
        gain: detection.getGain(),
        scores
      });
      detection.free();
    }
  }

  close() {
    this.rustpotter.free();
  }
}

// register worker
if (typeof registerProcessor === 'function') {
  // Run in AudioWorkletGlobal scope
  class RustpotterWorklet extends AudioWorkletProcessor {
    continueProcess: boolean;
    recorder?: RustpotterWorkletImpl;
    constructor() {
      super();
      this.continueProcess = true;
      this.port.onmessage = ({ data }) => {
        switch (data['command']) {
          case 'close':
            this.continueProcess = false;
            break;
          case 'done':
            this.continueProcess = false;
            if (this.recorder) {
              this.recorder.close();
              this.recorder = null;
            }
            this.port.postMessage({ type: 'done' });
            break;
          case 'init':
            const wasmBytes = data['wasmBytes'];
            delete data['wasmBytes'];
            this.recorder = new RustpotterWorkletImpl(
              wasmBytes,
              data,
              detection => this.port.postMessage({ type: 'detection', detection }),
            );
            this.recorder.waitReady()
              .then(() => {
                this.port.postMessage({ type: 'rustpotter-ready' });
              })
              .catch((err: any) => {
                console.error(err);
                this.port.postMessage({ type: 'rustpotter-error' });
              });
            break;
          case 'wakeword':
            const wakewordData = new Uint8Array(data["wakewordBytes"]);
            if (!this.recorder) {
              this.port.postMessage({ type: 'wakeword-error' });
            }
            try {
              this.recorder.addWakeword(wakewordData);
              this.port.postMessage({ type: 'wakeword-loaded' });
            } catch (error) {
              console.error(error);
              this.port.postMessage({ type: 'wakeword-error' });
            }
            break;
          default:
            // Ignore any unknown commands and continue recieving commands
            console.error("Unknown command")
        }
      }
    }
    process(inputs: Float32Array[][]) {
      if (this.recorder && inputs[0] && inputs[0].length && inputs[0][0] && inputs[0][0].length) {
        this.recorder.process(inputs[0]);
      }
      return this.continueProcess;
    }
  }
  registerProcessor('rustpotter-worklet', RustpotterWorklet);
} else {
  // run in scriptProcessor worker scope
  let recorder: RustpotterWorkletImpl;
  onmessage = ({ data }) => {
    switch (data['command']) {
      case 'process':
        if (recorder) {
          recorder.process(data['buffers']);
        }
        break;
      case 'done':
        if (recorder) {
          const _recorder = recorder;
          recorder = null;
          _recorder.close();
          postMessage({ type: 'done' });
        }
        break;
      case 'close':
        close();
        break;
      case 'init':
        const wasmBytes = data['wasmBytes'];
        delete data['wasmBytes'];
        recorder = new RustpotterWorkletImpl(
          wasmBytes,
          data,
          detection => postMessage({ type: 'detection', detection }),
        );
        recorder.waitReady()
          .then(() => {
            postMessage({ type: 'rustpotter-ready' });
          })
          .catch((err: any) => {
            console.error(err);
            postMessage({ type: 'rustpotter-error' });
          });
        break;
      case 'wakeword':
        const wakewordData = new Uint8Array(data["wakewordBytes"]);
        if (!recorder) {
          postMessage({ type: 'wakeword-error' });
        }
        try {
          recorder.addWakeword(wakewordData);
          postMessage({ type: 'wakeword-loaded' });
        } catch (error) {
          console.error(error);
          postMessage({ type: 'wakeword-error' });
        }
        break;
      default:
      // Ignore any unknown commands and continue recieving commands
    }
  };
}
