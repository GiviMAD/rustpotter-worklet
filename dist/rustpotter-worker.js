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

let wasm;

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); }
let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
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

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
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

let cachedUint32Memory0 = null;

function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.byteLength === 0) {
        cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
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
    const ptr = malloc(arg.length * 2, 2) >>> 0;
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
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32Memory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

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
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

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
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32Memory0().subarray(ptr / 4, ptr / 4 + len);
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}
/**
*/
const SampleFormat = Object.freeze({ i8:0,"0":"i8",i16:1,"1":"i16",i32:2,"2":"i32",f32:3,"3":"f32", });
/**
*/
class Rustpotter {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Rustpotter.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

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
            wasm.rustpotter_addWakeword(retptr, this.__wbg_ptr, ptr0, len0);
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
    * Process int 32 bit audio chunks.
    *
    * The buffer length should match the return of the getSamplesPerFrame method.
    * @param {Int32Array} buffer
    * @returns {RustpotterDetection | undefined}
    */
    processI32(buffer) {
        const ptr0 = passArray32ToWasm0(buffer, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rustpotter_processI32(this.__wbg_ptr, ptr0, len0);
        return ret === 0 ? undefined : RustpotterDetection.__wrap(ret);
    }
    /**
    * Process int 16 bit audio chunks.
    *
    * The buffer length should match the return of the getSamplesPerFrame method.
    * @param {Int16Array} buffer
    * @returns {RustpotterDetection | undefined}
    */
    processI16(buffer) {
        const ptr0 = passArray16ToWasm0(buffer, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rustpotter_processI16(this.__wbg_ptr, ptr0, len0);
        return ret === 0 ? undefined : RustpotterDetection.__wrap(ret);
    }
    /**
    * Process float 32 bit audio chunks.
    *
    * The buffer length should match the return of the getSamplesPerFrame method.
    * @param {Float32Array} buffer
    * @returns {RustpotterDetection | undefined}
    */
    processF32(buffer) {
        const ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rustpotter_processF32(this.__wbg_ptr, ptr0, len0);
        return ret === 0 ? undefined : RustpotterDetection.__wrap(ret);
    }
    /**
    * Process byte buffer.
    *
    * The buffer length should match the return of the getByteFrameSize method.
    * @param {Uint8Array} buffer
    * @returns {RustpotterDetection | undefined}
    */
    processBytes(buffer) {
        const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.rustpotter_processBytes(this.__wbg_ptr, ptr0, len0);
        return ret === 0 ? undefined : RustpotterDetection.__wrap(ret);
    }
    /**
    * Returns the required number of samples.
    * @returns {number}
    */
    getSamplesPerFrame() {
        const ret = wasm.rustpotter_getSamplesPerFrame(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
    * Returns the required number of bytes.
    * @returns {number}
    */
    getBytesPerFrame() {
        const ret = wasm.rustpotter_getBytesPerFrame(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
    * Reset internal state.
    */
    reset() {
        wasm.rustpotter_reset(this.__wbg_ptr);
    }
}
/**
*/
class RustpotterBuilder {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RustpotterBuilder.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

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
        wasm.rustpotterbuilder_setThreshold(this.__wbg_ptr, value);
    }
    /**
    * Configures the detector averaged threshold,
    *
    * If set to 0. this functionality is disabled.
    *
    * Wakeword defined value takes prevalence if present.
    * @param {number} value
    */
    setAveragedThreshold(value) {
        wasm.rustpotterbuilder_setAveragedThreshold(this.__wbg_ptr, value);
    }
    /**
    * Configures the required number of partial detections
    * to consider a partial detection as a real detection.
    *
    * Defaults to 5
    * @param {number} value
    */
    setMinScores(value) {
        wasm.rustpotterbuilder_setMinScores(this.__wbg_ptr, value);
    }
    /**
    * Configures a basic vad detector to avoid some execution.
    *
    * Disabled by default
    * @param {number | undefined} value
    */
    setVADMode(value) {
        wasm.rustpotterbuilder_setVADMode(this.__wbg_ptr, isLikeNone(value) ? 3 : value);
    }
    /**
    * Configures the score operation to unify the score values
    * against each wakeword template.
    * Doesn't apply to trained wakewords.
    *
    * Defaults to max
    * @param {number} value
    */
    setScoreMode(value) {
        wasm.rustpotterbuilder_setScoreMode(this.__wbg_ptr, value);
    }
    /**
    * Use a gain-normalization filter to dynamically change the input volume level.
    *
    * Defaults to false
    * @param {boolean} value
    */
    setGainNormalizerEnabled(value) {
        wasm.rustpotterbuilder_setGainNormalizerEnabled(this.__wbg_ptr, value);
    }
    /**
    * Set the rms level reference used by the gain-normalizer filter.
    * If null the approximated wakewords rms level is used.
    *
    * Defaults to null
    * @param {number | undefined} value
    */
    setGainRef(value) {
        wasm.rustpotterbuilder_setGainRef(this.__wbg_ptr, !isLikeNone(value), isLikeNone(value) ? 0 : value);
    }
    /**
    * Sets the min gain applied by the gain-normalizer filter.
    *
    * Defaults to 0.1
    * @param {number} value
    */
    setMinGain(value) {
        wasm.rustpotterbuilder_setMinGain(this.__wbg_ptr, value);
    }
    /**
    * Sets the max gain applied by the gain-normalizer filter.
    *
    * Defaults to 1.0
    * @param {number} value
    */
    setMaxGain(value) {
        wasm.rustpotterbuilder_setMaxGain(this.__wbg_ptr, value);
    }
    /**
    * Use a band-pass filter to attenuate frequencies
    * out of the configured range.
    *
    * Defaults to false
    * @param {boolean} value
    */
    setBandPassEnabled(value) {
        wasm.rustpotterbuilder_setBandPassEnabled(this.__wbg_ptr, value);
    }
    /**
    * Configures the low-cutoff frequency for the band-pass
    * filter.
    *
    * Defaults to 80.0
    * @param {number} value
    */
    setBandPassLowCutoff(value) {
        wasm.rustpotterbuilder_setBandPassLowCutoff(this.__wbg_ptr, value);
    }
    /**
    * Configures the high-cutoff frequency for the band-pass
    * filter.
    *
    * Defaults to 400.0
    * @param {number} value
    */
    setBandPassHighCutoff(value) {
        wasm.rustpotterbuilder_setBandPassHighCutoff(this.__wbg_ptr, value);
    }
    /**
    * Configures the detector expected sample rate for the audio chunks to process.
    *
    * Defaults to 16000
    * @param {number} value
    */
    setSampleRate(value) {
        wasm.rustpotterbuilder_setSampleRate(this.__wbg_ptr, value);
    }
    /**
    * Configures the detector expected sample format for the audio chunks to process.
    *
    * Defaults to F32
    * @param {number} value
    */
    setSampleFormat(value) {
        wasm.rustpotterbuilder_setSampleFormat(this.__wbg_ptr, value);
    }
    /**
    * Configures the detector expected number of channels for the audio chunks to process.
    * Rustpotter will only use data from the first channel.
    *
    * Defaults to 1
    * @param {number} value
    */
    setChannels(value) {
        wasm.rustpotterbuilder_setChannels(this.__wbg_ptr, value);
    }
    /**
    * Configures the comparator the band size.
    * Doesn't apply to trained wakewords.
    *
    * Defaults to 6
    * @param {number} value
    */
    setBandSize(value) {
        wasm.rustpotterbuilder_setBandSize(this.__wbg_ptr, value);
    }
    /**
    * Value used to express the score as a percent in range 0 - 1.
    *
    * Defaults to 0.22
    * @param {number} value
    */
    setScoreRef(value) {
        wasm.rustpotterbuilder_setScoreRef(this.__wbg_ptr, value);
    }
    /**
    * construct the wakeword detector
    * @returns {Rustpotter}
    */
    build() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rustpotterbuilder_build(retptr, this.__wbg_ptr);
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
        ptr = ptr >>> 0;
        const obj = Object.create(RustpotterDetection.prototype);
        obj.__wbg_ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;

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
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rustpotterdetection_getName(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
    * Get detection score
    * @returns {number}
    */
    getScore() {
        const ret = wasm.rustpotterdetection_getScore(this.__wbg_ptr);
        return ret;
    }
    /**
    * Get detection avg score
    * @returns {number}
    */
    getAvgScore() {
        const ret = wasm.rustpotterdetection_getAvgScore(this.__wbg_ptr);
        return ret;
    }
    /**
    * Get score file names as a || separated string
    * @returns {string}
    */
    getScoreNames() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.rustpotterdetection_getScoreNames(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
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
            wasm.rustpotterdetection_getScoreByName(retptr, this.__wbg_ptr, ptr0, len0);
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
            wasm.rustpotterdetection_getScores(retptr, this.__wbg_ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayF32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * Get partial detections counter
    * @returns {number}
    */
    getCounter() {
        const ret = wasm.rustpotterdetection_getCounter(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
    * Get gain applied
    * @returns {number}
    */
    getGain() {
        const ret = wasm.rustpotterdetection_getGain(this.__wbg_ptr);
        return ret;
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getRandomValues_37fa2ca9e4e07fab = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbg_randomFillSync_dc1e9a60c158336d = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_crypto_c48a774b022d20ac = function(arg0) {
        const ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = getObject(arg0);
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbg_process_298734cf255a885d = function(arg0) {
        const ret = getObject(arg0).process;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_versions_e2e78e134e3e5d01 = function(arg0) {
        const ret = getObject(arg0).versions;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_node_1cd7a5d853dbea79 = function(arg0) {
        const ret = getObject(arg0).node;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'string';
        return ret;
    };
    imports.wbg.__wbg_msCrypto_bcb970640f50a1e8 = function(arg0) {
        const ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_require_8f08ceecec0f4fee = function() { return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
        return ret;
    };
    imports.wbg.__wbg_newnoargs_581967eacc0e2604 = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_cb65541d95d71282 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_01734de55d61e11d = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_buffer_085ec1f694018c4f = function(arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_self_1ff1d729e9aae938 = function() { return handleError(function () {
        const ret = self.self;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_window_5f4faef6c12b79ec = function() { return handleError(function () {
        const ret = window.window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_globalThis_1d39714405582d3c = function() { return handleError(function () {
        const ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_651f05c6a0944d1c = function() { return handleError(function () {
        const ret = global.global;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_6da8e527659b86aa = function(arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_8125e318e6245eed = function(arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_5cf90238115182c3 = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_newwithlength_e5d69174d6984cd7 = function(arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_subarray_13db269f57aa838d = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    cachedFloat32Memory0 = null;
    cachedInt32Memory0 = null;
    cachedUint16Memory0 = null;
    cachedUint32Memory0 = null;
    cachedUint8Memory0 = null;


    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;

    const imports = __wbg_get_imports();

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance);
}

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

class RustpotterWorkerImpl {
    constructor(wasmBytes, config, postMessage) {
        this.config = config;
        this.postMessage = postMessage;
        this.workletAudioCallback = ({ data }) => {
            switch (data[0]) {
                case WorkletOutCommands.AUDIO:
                    this.process(data[1]);
                    break;
            }
        };
        initSync(wasmBytes);
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
        if (this.config.gainRef != null)
            builder.setGainRef(this.config.gainRef);
        builder.setBandPassEnabled(this.config.bandPassEnabled);
        builder.setBandPassLowCutoff(this.config.bandPassLowCutoff);
        builder.setBandPassHighCutoff(this.config.bandPassHighCutoff);
        this.rustpotter = builder.build();
        builder.free();
    }
    getSamplesPerFrame() {
        return this.rustpotter.getSamplesPerFrame();
    }
    addWakeword(data) {
        this.rustpotter.addWakeword(data);
    }
    process(audioSamples) {
        var _a;
        this.handleDetection((_a = this.rustpotter) === null || _a === void 0 ? void 0 : _a.processF32(audioSamples));
    }
    handleCommand(msg) {
        var _a, _b, _c, _d;
        switch (msg[0]) {
            case WorkerInCmd.STOP_PORT:
                (_a = this.workletPort) === null || _a === void 0 ? void 0 : _a.removeEventListener("message", this.workletAudioCallback);
                (_b = this.workletPort) === null || _b === void 0 ? void 0 : _b.postMessage([WorkletInCmd.STOP, undefined]);
                (_c = this.workletPort) === null || _c === void 0 ? void 0 : _c.close();
                this.workletPort = undefined;
                this.rustpotter.reset();
                this.postMessage([WorkerOutCmd.PORT_STOPPED, true]);
                break;
            case WorkerInCmd.PORT:
                (_d = this.workletPort) === null || _d === void 0 ? void 0 : _d.close();
                this.workletPort = msg[1];
                const callback = ({ data }) => {
                    var _a;
                    switch (data[0]) {
                        case WorkletOutCommands.STARTED:
                            if (data[1]) {
                                (_a = this.workletPort) === null || _a === void 0 ? void 0 : _a.addEventListener("message", this.workletAudioCallback);
                                this.postMessage([WorkerOutCmd.PORT_STARTED, true]);
                            }
                            else {
                                this.postMessage([WorkerOutCmd.PORT_STARTED, false]);
                            }
                            break;
                    }
                };
                this.workletPort.addEventListener("message", callback, { once: true });
                if (this.workletPort.start) {
                    this.workletPort.start();
                }
                this.workletPort.postMessage([WorkletInCmd.START, this.getSamplesPerFrame()]);
                break;
            case WorkerInCmd.WAKEWORD:
                try {
                    this.addWakeword(new Uint8Array(msg[1]));
                    this.postMessage([WorkerOutCmd.WAKEWORD_ADDED, true]);
                }
                catch (error) {
                    console.error(error);
                    this.postMessage([WorkerOutCmd.WAKEWORD_ADDED, false]);
                }
                break;
            case WorkerInCmd.STOP:
                this.close();
                this.postMessage([WorkerOutCmd.STOPPED, true]);
                close();
                break;
            default:
                console.warn("Unsupported command " + msg[0]);
        }
    }
    close() {
        this.rustpotter.free();
    }
    handleDetection(detection) {
        if (detection) {
            const scoreNames = detection.getScoreNames().split("||");
            const scores = detection.getScores().reduce((acc, v, i) => {
                const scoreName = scoreNames[i];
                if (scoreName) {
                    acc[scoreName] = v;
                }
                return acc;
            }, {});
            this.postMessage([WorkerOutCmd.DETECTION, {
                    name: detection.getName(),
                    avgScore: detection.getAvgScore(),
                    score: detection.getScore(),
                    counter: detection.getCounter(),
                    gain: detection.getGain(),
                    scores
                }]);
            detection.free();
        }
    }
}
let implementation = null;
let starting;
onmessage = ({ data }) => {
    switch (data[0]) {
        case WorkerInCmd.START:
            try {
                if (implementation != null) {
                    throw new Error("Already started");
                }
                if (starting != null) {
                    throw new Error("Starting");
                }
                starting = true;
                implementation = new RustpotterWorkerImpl(data[1].wasmBytes, data[1].config, (msg) => postMessage(msg));
                postMessage([WorkerOutCmd.STARTED, true]);
            }
            catch (err) {
                console.error(err);
                postMessage([WorkerOutCmd.STARTED, false]);
            }
            finally {
                starting = false;
            }
            break;
        default:
            if (!implementation) {
                console.warn("Rustpotter worker not started");
                return;
            }
            implementation.handleCommand(data);
            break;
    }
};
