import './textEncodingPolyfill';
import init, { RustpotterDetection, RustpotterJS, RustpotterJSBuilder, SampleFormat, NoiseDetectionMode } from "rustpotter-web-slim";
class RustpotterWorkletImpl {
  private wasmLoadedPromise: Promise<void>;
  private rustpotterJS: RustpotterJS;
  private samples: Float32Array;
  private samplesOffset: number;
  private rustpotterFrameSize: number;
  constructor(wasmBytes: ArrayBuffer, private config: {
    sampleRate: number,
    threshold: number,
    averagedThreshold: number,
    comparatorRef: number,
    comparatorBandSize: number,
    eagerMode: boolean,
    noiseMode?: NoiseDetectionMode,
    noiseSensitivity: number,
  }, private onSpot: (name: string, score: number) => void) {
    if (!this.config['sampleRate']) {
      throw new Error("sampleRate value is required to record. NOTE: Audio is not resampled!");
    }
    this.samplesOffset = 0;
    this.wasmLoadedPromise = (async () => {
      await init(WebAssembly.compile(wasmBytes));
      const builder = RustpotterJSBuilder.new();
      builder.setSampleRate(this.config.sampleRate);
      builder.setSampleFormat(SampleFormat.float);
      builder.setBitsPerSample(32);
      builder.setChannels(1);
      builder.setAveragedThreshold(this.config.averagedThreshold);
      builder.setThreshold(this.config.threshold);
      builder.setComparatorRef(this.config.comparatorRef);
      builder.setComparatorBandSize(this.config.comparatorBandSize);
      builder.setEagerMode(this.config.eagerMode);
      if (this.config.noiseMode != null) {
        builder.setNoiseMode(this.config.noiseMode);
        builder.setNoiseSensitivity(this.config.noiseSensitivity);
      }
      this.rustpotterJS = builder.build();
      this.rustpotterFrameSize = this.rustpotterJS.getFrameSize();
      this.samples = new Float32Array(this.rustpotterFrameSize);
      builder.free();
    })();
  }
  waitReady() {
    return this.wasmLoadedPromise;
  }
  addWakeword(data: Uint8Array) {
    this.rustpotterJS.addWakewordModelBytes(data);
  }
  process(buffers: Float32Array[]) {
    const channelBuffer = buffers[0];
    const nextOffset = this.samplesOffset + channelBuffer.length;
    if (nextOffset <= this.rustpotterFrameSize) {
      this.samples.set(channelBuffer, this.samplesOffset);
      if (nextOffset == this.rustpotterFrameSize - 1) {
        this.handleDetection(this.rustpotterJS.processFloat32(this.samples));
        this.samplesOffset = 0;
      } else {
        this.samplesOffset = nextOffset;
      }
    } else {
      var requiresSamples = this.rustpotterFrameSize - this.samplesOffset;
      this.samples.set(channelBuffer.subarray(0, requiresSamples), this.samplesOffset);
      this.handleDetection(this.rustpotterJS.processFloat32(this.samples));
      var remaining = channelBuffer.subarray(requiresSamples);
      if (remaining.length >= channelBuffer.length) {
        this.samplesOffset = 0;
        this.process([remaining]);
      } else {
        this.samples.set(remaining, 0);
        this.samplesOffset = (channelBuffer.length - requiresSamples);
      }
    }
  }
  private handleDetection(detection: RustpotterDetection) {
    if (detection) {
      this.onSpot(detection.getName(), detection.getScore());
      detection.free();
    }
  }

  close() {
    this.rustpotterJS.free();
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
            this.recorder = new RustpotterWorkletImpl(
              data['wasmBytes'],
              {
                sampleRate: data['sampleRate'],
                threshold: data['threshold'],
                averagedThreshold: data['averagedThreshold'],
                comparatorRef: data['comparatorRef'],
                comparatorBandSize: data['comparatorBandSize'],
                eagerMode: data['eagerMode'],
                noiseMode: data['noiseMode'],
                noiseSensitivity: data['noiseSensitivity'],
              },
              (name, score) => {
                this.port.postMessage({ type: 'detection', name, score });
              });
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
        recorder = new RustpotterWorkletImpl(
          data['wasmBytes'],
          {
            sampleRate: data['sampleRate'],
            threshold: data['threshold'],
            averagedThreshold: data['averagedThreshold'],
            comparatorRef: data['comparatorRef'],
            comparatorBandSize: data['comparatorBandSize'],
            eagerMode: data['eagerMode'],
            noiseMode: data['noiseMode'],
            noiseSensitivity: data['noiseSensitivity'],
          },
          (name, score) => {
            postMessage({ type: 'detection', name, score });
          });
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
