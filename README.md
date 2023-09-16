# Rustpotter Worklet

<div align="center">
    <img src="https://raw.githubusercontent.com/GiviMAD/rustpotter/0f1094278c36953cd265dbfe33430a42b176fe0e/logo.png" width="400px"> 
</div>

## Description

Run [Rustpotter](https://github.com/GiviMAD/rustpotter) (an open source wake word spotter forged in rust) in the browser as an AudioWorkletProcessor.

This package exposed a RustpotterService class that you can use to create and communicate with a worklet that runs rustpotter on its thread.

The RustpotterService should be able to download the code for the worklet and the rustpotter wasm module, by default it assumes the files "/rustpotter-worker.js", "/rustpotter-worklet.js" and "/rustpotter_wasm_bg.wasm" are available for download.

# Basic Usage Example


```js
    import { RustpotterService } from "rustpotter-worklet";
    // Urls to the requires sources
    const wasmModuleUrl = new URL('../node_modules/rustpotter-worklet/dist/rustpotter_wasm_bg.wasm', import.meta.url);
    const workletUrl = new URL('../node_modules/rustpotter-worklet/dist/rustpotter-worklet.js', import.meta.url);
    const workerUrl = new URL('../node_modules/rustpotter-worklet/dist/rustpotter-worker.js', import.meta.url);
    // Init audio context
    const audioContext = new AudioContext();
    const rustpotter = await RustpotterService.new({
        workletPath: workletUrl.href,
        workerPath: workerUrl.href,
        wasmPath: wasmModuleUrl.href,
        averagedThreshold: 0.25,
        threshold: 0.5,
        sampleRate: audioContext.sampleRate
    });
    rustpotter.onDetection(d => console.log(d));
    rustpotter.addWakewordByPath("/static/wakeword.rpw");
    let rustpotterWorklet = rustpotter.getNodeProcessor();
    // get media stream source node (requires user interaction event)
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
        },
        video: false,
    });
    const sourceNode = audioContext.createMediaStreamSource(stream);
    // chain rustpotter audio processor
    sourceNode.connect(rustpotterWorklet);
    ...
    // If you need to recreate the worklet because the audio streaming was interrupted
    rustpotter.disposeNodeProcessor();
    rustpotterWorklet = rustpotter.getNodeProcessor();
    ...
    // If you want to dispose rustpotter
    rustpotter.close();



```

