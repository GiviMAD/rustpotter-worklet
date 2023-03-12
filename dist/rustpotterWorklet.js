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

// TextEncoder/TextDecoder polyfills for utf-8 - an implementation of TextEncoder/TextDecoder APIs
// Written in 2013 by Viktor Mukhachev <vic99999@yandex.ru>
// To the extent possible under law, the author(s) have dedicated all copyright and related and neighboring rights to this software to the public domain worldwide. This software is distributed without any warranty.
// You should have received a copy of the CC0 Public Domain Dedication along with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.
// Some important notes about the polyfill below:
// Native TextEncoder/TextDecoder implementation is overwritten
// String.prototype.codePointAt polyfill not included, as well as String.fromCodePoint
// TextEncoder.prototype.encode returns a regular array instead of Uint8Array
// No options (fatal of the TextDecoder constructor and stream of the TextDecoder.prototype.decode method) are supported.
// TextDecoder.prototype.decode does not valid byte sequences
// This is a demonstrative implementation not intended to have the best performance
// http://encoding.spec.whatwg.org/#textencoder
(function (window) {
    function TextEncoder() { }
    TextEncoder.prototype.encode = function (string) {
        var octets = [];
        var length = string.length;
        var i = 0;
        while (i < length) {
            var codePoint = string.codePointAt(i);
            var c = 0;
            var bits = 0;
            if (codePoint <= 0x0000007f) {
                c = 0;
                bits = 0x00;
            }
            else if (codePoint <= 0x000007ff) {
                c = 6;
                bits = 0xc0;
            }
            else if (codePoint <= 0x0000ffff) {
                c = 12;
                bits = 0xe0;
            }
            else if (codePoint <= 0x001fffff) {
                c = 18;
                bits = 0xf0;
            }
            octets.push(bits | (codePoint >> c));
            c -= 6;
            while (c >= 0) {
                octets.push(0x80 | ((codePoint >> c) & 0x3f));
                c -= 6;
            }
            i += codePoint >= 0x10000 ? 2 : 1;
        }
        return octets;
    };
    globalThis.TextEncoder = TextEncoder;
    if (!window["TextEncoder"])
        window["TextEncoder"] = TextEncoder;
    function TextDecoder() { }
    TextDecoder.prototype.decode = function (octets) {
        if (!octets)
            return "";
        var string = "";
        var i = 0;
        while (i < octets.length) {
            var octet = octets[i];
            var bytesNeeded = 0;
            var codePoint = 0;
            if (octet <= 0x7f) {
                bytesNeeded = 0;
                codePoint = octet & 0xff;
            }
            else if (octet <= 0xdf) {
                bytesNeeded = 1;
                codePoint = octet & 0x1f;
            }
            else if (octet <= 0xef) {
                bytesNeeded = 2;
                codePoint = octet & 0x0f;
            }
            else if (octet <= 0xf4) {
                bytesNeeded = 3;
                codePoint = octet & 0x07;
            }
            if (octets.length - i - bytesNeeded > 0) {
                var k = 0;
                while (k < bytesNeeded) {
                    octet = octets[i + k + 1];
                    codePoint = (codePoint << 6) | (octet & 0x3f);
                    k += 1;
                }
            }
            else {
                codePoint = 0xfffd;
                bytesNeeded = octets.length - i;
            }
            string += String.fromCodePoint(codePoint);
            i += bytesNeeded + 1;
        }
        return string;
    };
    globalThis.TextDecoder = TextDecoder;
    if (!window["TextDecoder"])
        window["TextDecoder"] = TextDecoder;
})(typeof globalThis == "" + void 0
    ? typeof global == "" + void 0
        ? typeof self == "" + void 0
            ? this
            : self
        : global
    : globalThis);

let wasm;

const cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

function getObject(idx) { return heap[idx]; }

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedUint32Memory0 = null;

function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.byteLength === 0) {
        cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4);
    getUint32Memory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedUint16Memory0 = null;

function getUint16Memory0() {
    if (cachedUint16Memory0 === null || cachedUint16Memory0.byteLength === 0) {
        cachedUint16Memory0 = new Uint16Array(wasm.memory.buffer);
    }
    return cachedUint16Memory0;
}

function passArray16ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 2);
    getUint16Memory0().set(arg, ptr / 2);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedFloat32Memory0 = null;

function getFloat32Memory0() {
    if (cachedFloat32Memory0 === null || cachedFloat32Memory0.byteLength === 0) {
        cachedFloat32Memory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32Memory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4);
    getFloat32Memory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

const cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function getArrayF32FromWasm0(ptr, len) {
    return getFloat32Memory0().subarray(ptr / 4, ptr / 4 + len);
}

function isLikeNone(x) {
    return x === undefined || x === null;
}
/**
*/
const SampleFormat = Object.freeze({ int:0,"0":"int",float:1,"1":"float", });
/**
*/
class Rustpotter {

    static __wrap(ptr) {
        const obj = Object.create(Rustpotter.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rustpotter_free(ptr);
    }
    /**
    * Loads a wakeword from its model bytes.
    * @param {Uint8Array} bytes
    */
    addWakeword(bytes) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.rustpotter_addWakeword(retptr, this.ptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            if (r1) {
                throw takeObject(r0);
            }
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Process i32 audio chunks.
    *
    * Asserts that the audio chunk length should match the return
    * of the get_samples_per_frame method.
    *
    * Assumes sample rate match the configured for the detector.
    *
    * Asserts that detector bits_per_sample is one of: 8, 16, 24, 32.
    *
    * Asserts that detector sample_format is 'int'.
    * @param {Int32Array} buffer
    * @returns {RustpotterDetection | undefined}
    */
    processInt32(buffer) {
        const ptr0 = passArray32ToWasm0(buffer, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rustpotter_processInt32(this.ptr, ptr0, len0);
        return ret === 0 ? undefined : RustpotterDetection.__wrap(ret);
    }
    /**
    * Process i16 audio chunks.
    *
    * Asserts that the audio chunk length should match the return
    * of the get_samples_per_frame method.
    *
    * Assumes sample rate match the configured for the detector.
    *
    * Asserts that detector bits_per_sample is one of: 8, 16.
    *
    * Asserts that detector sample_format is 'int'.
    * @param {Int16Array} buffer
    * @returns {RustpotterDetection | undefined}
    */
    processInt16(buffer) {
        const ptr0 = passArray16ToWasm0(buffer, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rustpotter_processInt16(this.ptr, ptr0, len0);
        return ret === 0 ? undefined : RustpotterDetection.__wrap(ret);
    }
    /**
    * Process f32 audio chunks.
    *
    * Asserts that the audio chunk length should match the return
    * of the get_samples_per_frame method.
    *
    * Assumes sample rate match the configured for the detector.
    *
    * Assumes that detector bits_per_sample is 32.
    *
    * Assumes that detector sample_format is 'float'.
    * @param {Float32Array} buffer
    * @returns {RustpotterDetection | undefined}
    */
    processFloat32(buffer) {
        const ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rustpotter_processFloat32(this.ptr, ptr0, len0);
        return ret === 0 ? undefined : RustpotterDetection.__wrap(ret);
    }
    /**
    * Process bytes buffer.
    *
    * Asserts that the buffer length should match the return
    * of the get_bytes_per_frame method.
    *
    * Assumes sample rate match the configured for the detector.
    *
    * Assumes buffer endianness matches the configured for the detector.
    *
    * Assumes that detector bits_per_sample is 8, 16, 32.
    * @param {Uint8Array} buffer
    * @returns {RustpotterDetection | undefined}
    */
    processBuffer(buffer) {
        const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rustpotter_processBuffer(this.ptr, ptr0, len0);
        return ret === 0 ? undefined : RustpotterDetection.__wrap(ret);
    }
    /**
    * Returns the required number of samples.
    * @returns {number}
    */
    getFrameSize() {
        const ret = wasm.rustpotter_getFrameSize(this.ptr);
        return ret >>> 0;
    }
    /**
    * Returns the required number of bytes.
    * @returns {number}
    */
    getByteFrameSize() {
        const ret = wasm.rustpotter_getByteFrameSize(this.ptr);
        return ret >>> 0;
    }
}
/**
*/
class RustpotterBuilder {

    static __wrap(ptr) {
        const obj = Object.create(RustpotterBuilder.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rustpotterbuilder_free(ptr);
    }
    /**
    * @returns {RustpotterBuilder}
    */
    static new() {
        const ret = wasm.rustpotterbuilder_new();
        return RustpotterBuilder.__wrap(ret);
    }
    /**
    * Configures the detector threshold,
    * is the min score (in range 0. to 1.) that some of
    * the wakeword templates should obtain to trigger a detection.
    *
    * Defaults to 0.5, wakeword defined value takes prevalence if present.
    * @param {number} value
    */
    setThreshold(value) {
        wasm.rustpotterbuilder_setThreshold(this.ptr, value);
    }
    /**
    * Configures the detector averaged threshold,
    * is the min score (in range 0. to 1.) that
    * the averaged wakeword template should obtain to allow
    * to continue with the detection. This way it can prevent to
    * run the comparison of the current frame against each of the wakeword templates.
    * If set to 0. this functionality is disabled.
    *
    * Defaults to half of the configured threshold, wakeword defined value takes prevalence if present.
    * @param {number} value
    */
    setAveragedThreshold(value) {
        wasm.rustpotterbuilder_setAveragedThreshold(this.ptr, value);
    }
    /**
    * Configures the required number of partial detections
    * to consider a partial detection as a real detection.
    *
    * Defaults to 10
    * @param {number} value
    */
    setMinScores(value) {
        wasm.rustpotterbuilder_setMinScores(this.ptr, value);
    }
    /**
    * Configures the score operation to unify the score values
    * against each wakeword template.
    *
    * Defaults to max
    * @param {number} value
    */
    setScoreMode(value) {
        wasm.rustpotterbuilder_setScoreMode(this.ptr, value);
    }
    /**
    * Use a gain-normalization filter to dynamically change the input volume level.
    *
    * Defaults to false
    * @param {boolean} value
    */
    setGainNormalizerEnabled(value) {
        wasm.rustpotterbuilder_setGainNormalizerEnabled(this.ptr, value);
    }
    /**
    * Set the rms level reference used by the gain-normalizer filter.
    * If null the approximated wakewords rms level is used.
    *
    * Defaults to null
    * @param {number | undefined} value
    */
    setGainRef(value) {
        wasm.rustpotterbuilder_setGainRef(this.ptr, !isLikeNone(value), isLikeNone(value) ? 0 : value);
    }
    /**
    * Sets the min gain applied by the gain-normalizer filter.
    *
    * Defaults to 0.1
    * @param {number} value
    */
    setMinGain(value) {
        wasm.rustpotterbuilder_setMinGain(this.ptr, value);
    }
    /**
    * Sets the max gain applied by the gain-normalizer filter.
    *
    * Defaults to 1.0
    * @param {number} value
    */
    setMaxGain(value) {
        wasm.rustpotterbuilder_setMaxGain(this.ptr, value);
    }
    /**
    * Use a band-pass filter to attenuate frequencies
    * out of the configured range.
    *
    * Defaults to false
    * @param {boolean} value
    */
    setBandPassEnabled(value) {
        wasm.rustpotterbuilder_setBandPassEnabled(this.ptr, value);
    }
    /**
    * Configures the low-cutoff frequency for the band-pass
    * filter.
    *
    * Defaults to 80.0
    * @param {number} value
    */
    setBandPassLowCutoff(value) {
        wasm.rustpotterbuilder_setBandPassLowCutoff(this.ptr, value);
    }
    /**
    * Configures the high-cutoff frequency for the band-pass
    * filter.
    *
    * Defaults to 400.0
    * @param {number} value
    */
    setBandPassHighCutoff(value) {
        wasm.rustpotterbuilder_setBandPassHighCutoff(this.ptr, value);
    }
    /**
    * Configures the detector expected bit per sample for the audio chunks to process.
    *
    * When sample format is set to 'float' this is ignored as only 32 is supported.
    *
    * Defaults to 16; Allowed values: 8, 16, 24, 32
    * @param {number} value
    */
    setBitsPerSample(value) {
        wasm.rustpotterbuilder_setBitsPerSample(this.ptr, value);
    }
    /**
    * Configures the detector expected sample rate for the audio chunks to process.
    *
    * Defaults to 48000
    * @param {number} value
    */
    setSampleRate(value) {
        wasm.rustpotterbuilder_setSampleRate(this.ptr, value);
    }
    /**
    * Configures the detector expected sample format for the audio chunks to process.
    *
    * Defaults to int
    * @param {number} value
    */
    setSampleFormat(value) {
        wasm.rustpotterbuilder_setSampleFormat(this.ptr, value);
    }
    /**
    * Configures the detector expected number of channels for the audio chunks to process.
    * Rustpotter will only use data for first channel.
    *
    * Defaults to 1
    * @param {number} value
    */
    setChannels(value) {
        wasm.rustpotterbuilder_setChannels(this.ptr, value);
    }
    /**
    * Configures the band-size for the comparator used to match the samples.
    *
    * Defaults to 6
    * @param {number} value
    */
    setComparatorBandSize(value) {
        wasm.rustpotterbuilder_setComparatorBandSize(this.ptr, value);
    }
    /**
    * Configures the comparator reference.
    *
    * Defaults to 0.22
    * @param {number} value
    */
    setComparatorRef(value) {
        wasm.rustpotterbuilder_setComparatorRef(this.ptr, value);
    }
    /**
    * construct the wakeword detector
    * @returns {Rustpotter}
    */
    build() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rustpotterbuilder_build(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var r2 = getInt32Memory0()[retptr / 4 + 2];
            if (r2) {
                throw takeObject(r1);
            }
            return Rustpotter.__wrap(r0);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
/**
*/
class RustpotterDetection {

    static __wrap(ptr) {
        const obj = Object.create(RustpotterDetection.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rustpotterdetection_free(ptr);
    }
    /**
    * Get detection name
    * @returns {string}
    */
    getName() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rustpotterdetection_getName(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * Get detection score
    * @returns {number}
    */
    getScore() {
        const ret = wasm.rustpotterdetection_getScore(this.ptr);
        return ret;
    }
    /**
    * Get detection avg score
    * @returns {number}
    */
    getAvgScore() {
        const ret = wasm.rustpotterdetection_getAvgScore(this.ptr);
        return ret;
    }
    /**
    * Get score file names as a || separated string
    * @returns {string}
    */
    getScoreNames() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rustpotterdetection_getScoreNames(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * Get detection score by file name
    * @param {string} name
    * @returns {number | undefined}
    */
    getScoreByName(name) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.rustpotterdetection_getScoreByName(retptr, this.ptr, ptr0, len0);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getFloat32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Get detection scores
    * @returns {Float32Array}
    */
    getScores() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rustpotterdetection_getScores(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayF32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Get partial detections counter
    * @returns {number}
    */
    getCounter() {
        const ret = wasm.rustpotterdetection_getCounter(this.ptr);
        return ret >>> 0;
    }
}

async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function getImports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    return imports;
}

function finalizeInit(instance, module) {
    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;
    cachedFloat32Memory0 = null;
    cachedInt32Memory0 = null;
    cachedUint16Memory0 = null;
    cachedUint32Memory0 = null;
    cachedUint8Memory0 = null;


    return wasm;
}

async function init(input) {
    if (typeof input === 'undefined') {
        input = new URL('rustpotter_wasm_bg.wasm', import.meta.url);
    }
    const imports = getImports();

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    const { instance, module } = await load(await input, imports);

    return finalizeInit(instance, module);
}

class RustpotterWorkletImpl {
    constructor(wasmBytes, config, onSpot) {
        this.config = config;
        this.onSpot = onSpot;
        if (!this.config['sampleRate']) {
            throw new Error("sampleRate value is required to record. NOTE: Audio is not resampled!");
        }
        this.samplesOffset = 0;
        this.wasmLoadedPromise = (() => __awaiter(this, void 0, void 0, function* () {
            yield init(WebAssembly.compile(wasmBytes));
            const builder = RustpotterBuilder.new();
            builder.setSampleRate(this.config.sampleRate);
            builder.setSampleFormat(SampleFormat.float);
            builder.setBitsPerSample(32);
            builder.setChannels(1);
            builder.setAveragedThreshold(this.config.averagedThreshold);
            builder.setThreshold(this.config.threshold);
            builder.setComparatorRef(this.config.comparatorRef);
            builder.setComparatorBandSize(this.config.comparatorBandSize);
            builder.setGainNormalizerEnabled(this.config.gainNormalizerEnabled);
            builder.setMinGain(this.config.minGain);
            builder.setMaxGain(this.config.maxGain);
            if (this.config.gainRef != null)
                builder.setGainRef(this.config.gainRef);
            builder.setBandPassEnabled(this.config.bandPassEnabled);
            builder.setBandPassLowCutoff(this.config.bandPassLowCutoff);
            builder.setBandPassHighCutoff(this.config.bandPassHighCutoff);
            this.rustpotter = builder.build();
            this.rustpotterFrameSize = this.rustpotter.getFrameSize();
            this.samples = new Float32Array(this.rustpotterFrameSize);
            builder.free();
        }))();
    }
    waitReady() {
        return this.wasmLoadedPromise;
    }
    addWakeword(data) {
        this.rustpotter.addWakeword(data);
    }
    process(buffers) {
        const channelBuffer = buffers[0];
        const nextOffset = this.samplesOffset + channelBuffer.length;
        if (nextOffset <= this.rustpotterFrameSize) {
            this.samples.set(channelBuffer, this.samplesOffset);
            if (nextOffset == this.rustpotterFrameSize - 1) {
                this.handleDetection(this.rustpotter.processFloat32(this.samples));
                this.samplesOffset = 0;
            }
            else {
                this.samplesOffset = nextOffset;
            }
        }
        else {
            var requiresSamples = this.rustpotterFrameSize - this.samplesOffset;
            this.samples.set(channelBuffer.subarray(0, requiresSamples), this.samplesOffset);
            this.handleDetection(this.rustpotter.processFloat32(this.samples));
            var remaining = channelBuffer.subarray(requiresSamples);
            if (remaining.length >= channelBuffer.length) {
                this.samplesOffset = 0;
                this.process([remaining]);
            }
            else {
                this.samples.set(remaining, 0);
                this.samplesOffset = (channelBuffer.length - requiresSamples);
            }
        }
    }
    handleDetection(detection) {
        if (detection) {
            this.onSpot(detection.getName(), detection.getScore());
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
                        this.recorder = new RustpotterWorkletImpl(wasmBytes, Object.assign({}, data), (name, score) => {
                            this.port.postMessage({ type: 'detection', name, score });
                        });
                        this.recorder.waitReady()
                            .then(() => {
                            this.port.postMessage({ type: 'rustpotter-ready' });
                        })
                            .catch((err) => {
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
                        }
                        catch (error) {
                            console.error(error);
                            this.port.postMessage({ type: 'wakeword-error' });
                        }
                        break;
                    default:
                        // Ignore any unknown commands and continue recieving commands
                        console.error("Unknown command");
                }
            };
        }
        process(inputs) {
            if (this.recorder && inputs[0] && inputs[0].length && inputs[0][0] && inputs[0][0].length) {
                this.recorder.process(inputs[0]);
            }
            return this.continueProcess;
        }
    }
    registerProcessor('rustpotter-worklet', RustpotterWorklet);
}
else {
    // run in scriptProcessor worker scope
    let recorder;
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
                recorder = new RustpotterWorkletImpl(wasmBytes, Object.assign({}, data), (name, score) => {
                    postMessage({ type: 'detection', name, score });
                });
                recorder.waitReady()
                    .then(() => {
                    postMessage({ type: 'rustpotter-ready' });
                })
                    .catch((err) => {
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
                }
                catch (error) {
                    console.error(error);
                    postMessage({ type: 'wakeword-error' });
                }
                break;
            // Ignore any unknown commands and continue recieving commands
        }
    };
}
