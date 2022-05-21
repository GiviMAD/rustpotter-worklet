# Rustpotter Worklet

<div align="center">
    <img src="https://raw.githubusercontent.com/GiviMAD/rustpotter/0f1094278c36953cd265dbfe33430a42b176fe0e/logo.png" width="400px"> 
</div>

## Description

Run [Rustpotter](https://github.com/GiviMAD/rustpotter) (a free and open source wake word spotter forged in rust) in the browser as a AudioWorkletProcessor.

This package exposed a RustpotterService class that you can use to create and communicate with a worklet that runs rustpotter on its thread.

The RustpotterService should be able to download the code for the worklet and the rustpotter wasm module, by default it assumes the files "/rustpotterWorklet.js" and "/rustpotter_wasm_bg.wasm" are available for download. 

This is an example of how to include the required files automatically using webpack 5 (for webpack 4 you can use file-loader to achieve something similar):


```js
    const wasmModuleUrl = new URL('../node_modules/rustpotter-worklet/dist/rustpotter_wasm_bg.wasm', import.meta.url);
    const workletUrl = new URL('../node_modules/rustpotter-worklet/dist/rustpotterWorklet.js', import.meta.url);
    const { RustpotterService } = await import("rustpotter-worklet");
    if (!RustpotterService.isRecordingSupported()) {
        alert("Unable to record in this browser :(");
    }
    const rustpotterService = new RustpotterService({
        workletPath: workletUrl.href,
        wasmPath: wasmModuleUrl.href,
        averagedThreshold: 0.25,
        threshold: 0.5,
    });
    rustpotterService.onspot = (name, score) => {
        console.log(`detection: '${name}'[${score}]`);
    };
    rustpotterService.onstart = function () {
        console.info('rustpotterService is started');
    };

    rustpotterService.onstop = function () {
        console.info('rustpotterService is stopped');
    };

    rustpotterService.onpause = function () {
        console.info('rustpotterService is paused');
    };

    rustpotterService.onresume = function () {
        console.info('rustpotterService is resuming');
    };
    rustpotterService
        .start()
        .then(() => rustpotterService.addWakewordByPath("wakeword.rpw")) // a wakeword file available for download
        .catch(err => console.error(err));
```

