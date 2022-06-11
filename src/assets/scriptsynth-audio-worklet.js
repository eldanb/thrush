/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthEngine.ts":
/*!**********************************************************************!*\
  !*** ./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthEngine.ts ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"ScriptSynthEngine\": () => (/* binding */ ScriptSynthEngine)\n/* harmony export */ });\n/* harmony import */ var _ScriptSynthToneGenerator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ScriptSynthToneGenerator */ \"./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthToneGenerator.ts\");\n\nclass ScriptSynthEngine {\n    constructor(sampleRate, numChannels) {\n        this._eventQueue = [];\n        this._instruments = [];\n        this._toneGenerator = new _ScriptSynthToneGenerator__WEBPACK_IMPORTED_MODULE_0__.ScriptSynthToneGenerator(sampleRate, numChannels);\n        this._sampleRate = sampleRate;\n    }\n    clearQueue() {\n        this._eventQueue = [];\n    }\n    enqueueEvent(event) {\n        this._eventQueue.push(event);\n    }\n    registerInstrument(instrument) {\n        return this._instruments.push(instrument) - 1;\n    }\n    get toneGenerator() {\n        return this._toneGenerator;\n    }\n    pumpEvents(currentTime) {\n        while (this._eventQueue.length &&\n            this._eventQueue[0].time <= currentTime) {\n            const event = this._eventQueue.shift();\n            if (event.newNote) {\n                console.debug(`Play note ${event.newNote.note} at ${currentTime}; instrument = ${event.newNote.instrumentId}; channel = ${event.channel}; latency=${currentTime - event.time}`);\n                this._toneGenerator.playNoteOnChannel(event.channel, this._instruments[event.newNote.instrumentId], event.newNote.note);\n            }\n            if (event.volume != null) {\n                this._toneGenerator.setVolumeOnChannel(event.channel, event.volume);\n            }\n            if (event.panning != null) {\n                this._toneGenerator.setPanningOnChannel(event.channel, event.panning);\n            }\n        }\n    }\n    fillSampleBuffer(currentTime, leftChannel, rightChannnel, ofs, len) {\n        var _a;\n        let curOfs = ofs;\n        let remainingLen = len;\n        while (remainingLen) {\n            //console.debug(`Num events ${this._eventQueue.length}`);\n            this.pumpEvents(currentTime);\n            const nextEventTime = (_a = this._eventQueue[0]) === null || _a === void 0 ? void 0 : _a.time;\n            const fillSamples = nextEventTime != null ?\n                Math.min(Math.ceil((nextEventTime - currentTime)) * this._sampleRate, len) :\n                len;\n            this.toneGenerator.readBuffer(leftChannel, rightChannnel, curOfs, fillSamples);\n            remainingLen -= fillSamples;\n            curOfs += fillSamples;\n            currentTime += (fillSamples / this._sampleRate);\n        }\n    }\n}\n\n\n//# sourceURL=webpack://thrush/./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthEngine.ts?");

/***/ }),

/***/ "./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthInstrument.ts":
/*!**************************************************************************!*\
  !*** ./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthInstrument.ts ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"ScriptSynthInstrument\": () => (/* binding */ ScriptSynthInstrument),\n/* harmony export */   \"ScriptSynthWaveInstrument\": () => (/* binding */ ScriptSynthWaveInstrument)\n/* harmony export */ });\nclass ScriptSynthInstrument {\n}\nclass ScriptSynthWaveInstrument extends ScriptSynthInstrument {\n    constructor(sample, sampleRate, sampleStart, loopStart, loopLen, volume = 1) {\n        super();\n        this._audioBuffer = null;\n        this._sample = sample;\n        this._sampleRate = sampleRate;\n        this._sampleStartOffset = sampleStart || 0;\n        this._sampleLoopStart = loopStart || 0;\n        this._sampleLoopLen = loopLen || 0;\n        this._volume = volume;\n    }\n    configureToneGenerationParams(outputParams, note) {\n        outputParams.samplePitch = Math.pow(2, note / 12);\n        outputParams.sample = this.sample;\n        outputParams.sampleLoopStart = this._sampleLoopStart;\n        outputParams.sampleStartOffset = this._sampleStartOffset;\n        outputParams.sampleLoopLen = this.sampleLoopLen;\n        outputParams.sampleRate = this._sampleRate;\n        outputParams.volume = this._volume;\n    }\n    get sample() {\n        return this._sample;\n    }\n    get sampleLoopStart() {\n        return this._sampleLoopStart;\n    }\n    get sampleLoopLen() {\n        return this._sampleLoopLen;\n    }\n    getAudioBuffer(minDuration) {\n        var _a;\n        if (((_a = this._audioBuffer) === null || _a === void 0 ? void 0 : _a.duration) || 0 <= minDuration) {\n            // Todo generate loop\n            const buff = new AudioBuffer({ sampleRate: this._sampleRate, numberOfChannels: 1, length: this._sample.length });\n            buff.copyToChannel(this._sample, 0, 0);\n            this._audioBuffer = buff;\n        }\n        return this._audioBuffer;\n    }\n    static fromWavFileContent(instrumentBuff) {\n        const blobArrayBuffer = instrumentBuff;\n        var hdr = new Uint32Array(blobArrayBuffer.slice(0, 36));\n        var samples = new Uint8Array(blobArrayBuffer.slice(58, blobArrayBuffer.byteLength - 58));\n        const smp = [];\n        const smp_rate = hdr[6];\n        for (var i = 0; i < samples.length; i++) {\n            smp[i] = (samples[i]) / 256;\n        }\n        return new ScriptSynthWaveInstrument(new Float32Array(smp), smp_rate, 0, (blobArrayBuffer).byteLength - 1000);\n    }\n    static fromSampleBuffer(sampleBuffer, sampleRate, sampleStart, loopStart, loopEnd, volume) {\n        return new ScriptSynthWaveInstrument(new Float32Array(sampleBuffer), sampleRate, sampleStart, loopStart, loopEnd, volume);\n    }\n}\n\n\n//# sourceURL=webpack://thrush/./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthInstrument.ts?");

/***/ }),

/***/ "./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthToneGenerator.ts":
/*!*****************************************************************************!*\
  !*** ./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthToneGenerator.ts ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"ScriptSynthToneGenerator\": () => (/* binding */ ScriptSynthToneGenerator)\n/* harmony export */ });\nclass ChannelState {\n    constructor(toneGenerator) {\n        this.sample = null;\n        this.sampleStartOffset = 0;\n        this.sampleLoopStart = 0;\n        this.sampleLoopLen = 0;\n        this.samplePitch = 1;\n        this.sampleRate = 0;\n        this.volume = 0;\n        this.panning = 0.5;\n        this.sampleCursor = 0;\n        this.effectivePitch = 1;\n        this.inLoop = false;\n        this.toneGenerator = toneGenerator;\n    }\n    playNote(instrument, note) {\n        this.inLoop = false;\n        instrument.configureToneGenerationParams(this, note);\n        this.effectivePitch = (this.sampleRate / this.toneGenerator.outputSampleRate) * this.samplePitch;\n        this.sampleCursor = this.sampleStartOffset;\n    }\n}\nclass ScriptSynthToneGenerator {\n    constructor(sampleRate, numChannels) {\n        this._channelStates = [];\n        for (let channelIdx = 0; channelIdx < numChannels; channelIdx++) {\n            this._channelStates[channelIdx] = new ChannelState(this);\n        }\n        this._sampleRate = sampleRate;\n    }\n    playNoteOnChannel(channel, instrument, note) {\n        const channelState = this._channelStates[channel];\n        channelState.playNote(instrument, note);\n    }\n    setVolumeOnChannel(channel, volume) {\n        const channelState = this._channelStates[channel];\n        channelState.volume = volume;\n    }\n    setPanningOnChannel(channel, panning) {\n        const channelState = this._channelStates[channel];\n        channelState.panning = panning;\n    }\n    readBuffer(destinationLeft, destinationRight, destOffset, destLength) {\n        for (let i = destOffset; i < destOffset + destLength; i++) {\n            let leftSample = 0;\n            let rightSample = 0;\n            this._channelStates.forEach((channelState, channelIndex) => {\n                if (channelState.sample) {\n                    let sampleIndex = channelState.sampleCursor;\n                    if (sampleIndex < channelState.sample.length - 1) {\n                        const sampleIndexFloor = Math.floor(sampleIndex);\n                        const baseSample = (channelState.sample[sampleIndexFloor] +\n                            (sampleIndex - sampleIndexFloor) * (channelState.sample[sampleIndexFloor + 1] - channelState.sample[sampleIndexFloor])) *\n                            channelState.volume;\n                        leftSample += baseSample * (1 - channelState.panning);\n                        rightSample += baseSample * channelState.panning;\n                        sampleIndex += channelState.effectivePitch;\n                        if (!channelState.inLoop && sampleIndex >= channelState.sample.length - 1 && channelState.sampleLoopLen) {\n                            console.log(\"Start loop channel \" + channelIndex);\n                            sampleIndex = channelState.sampleLoopStart - (sampleIndex - channelState.sample.length);\n                            channelState.inLoop = true;\n                        }\n                        while (channelState.inLoop && sampleIndex >= channelState.sampleLoopLen + channelState.sampleLoopStart - 1) {\n                            console.log(\"loop channel \" + channelIndex);\n                            sampleIndex -= channelState.sampleLoopLen;\n                        }\n                        channelState.sampleCursor = sampleIndex;\n                    }\n                    else {\n                        channelState.sample = null;\n                        console.log(\"End sample channel \" + channelIndex);\n                    }\n                }\n            });\n            destinationLeft[i] = leftSample;\n            destinationRight[i] = rightSample;\n        }\n    }\n    get outputSampleRate() {\n        return this._sampleRate;\n    }\n}\n\n\n//# sourceURL=webpack://thrush/./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthToneGenerator.ts?");

/***/ }),

/***/ "./src/lib/thrush_engine/synth/scriptsynth/worklet/ScriptSynthWorklet.ts":
/*!*******************************************************************************!*\
  !*** ./src/lib/thrush_engine/synth/scriptsynth/worklet/ScriptSynthWorklet.ts ***!
  \*******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _ScriptSynthEngine__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../ScriptSynthEngine */ \"./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthEngine.ts\");\n/* harmony import */ var _ScriptSynthInstrument__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../ScriptSynthInstrument */ \"./src/lib/thrush_engine/synth/scriptsynth/ScriptSynthInstrument.ts\");\n/* harmony import */ var _util_MessagePortRpc__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../../util/MessagePortRpc */ \"./src/lib/util/MessagePortRpc.ts\");\n\n\n\nclass WorkletProcessor extends AudioWorkletProcessor {\n    constructor() {\n        super();\n        this._synthEngine = null;\n        this._rpcDispathcer = new _util_MessagePortRpc__WEBPACK_IMPORTED_MODULE_2__.MessagePortRpcDispatcher(this.port, this);\n    }\n    async enqueueEvent(event) {\n        if (!this._synthEngine) {\n            throw Error(\"Node not conigured\");\n        }\n        this._synthEngine.enqueueEvent(event);\n    }\n    async clearEventQueue() {\n        if (!this._synthEngine) {\n            throw Error(\"Node not conigured\");\n        }\n        this._synthEngine.clearQueue();\n    }\n    async createInstrument(instrumentBuff, sampleRate, sampleStart, loopStart, loopLen, volume) {\n        if (!this._synthEngine) {\n            throw Error(\"Node not conigured\");\n        }\n        return this._synthEngine.registerInstrument(_ScriptSynthInstrument__WEBPACK_IMPORTED_MODULE_1__.ScriptSynthWaveInstrument.fromSampleBuffer(instrumentBuff, sampleRate, sampleStart, loopStart, loopLen, volume));\n    }\n    async configure(sampleRate) {\n        this._synthEngine = new _ScriptSynthEngine__WEBPACK_IMPORTED_MODULE_0__.ScriptSynthEngine(sampleRate, 16);\n    }\n    process(inputs, outputs, parameters) {\n        this._synthEngine.fillSampleBuffer(currentTime, outputs[0][0], outputs[0][1], 0, outputs[0][0].length);\n        return true;\n    }\n}\nregisterProcessor(\"scriptsynth-audio-worker\", WorkletProcessor);\n\n\n//# sourceURL=webpack://thrush/./src/lib/thrush_engine/synth/scriptsynth/worklet/ScriptSynthWorklet.ts?");

/***/ }),

/***/ "./src/lib/util/MessagePortRpc.ts":
/*!****************************************!*\
  !*** ./src/lib/util/MessagePortRpc.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"MessagePortRpcDispatcher\": () => (/* binding */ MessagePortRpcDispatcher),\n/* harmony export */   \"createMessagePortRpcProxy\": () => (/* binding */ createMessagePortRpcProxy)\n/* harmony export */ });\nfunction generateUUID() {\n    let d = new Date().getTime(), d2 = (performance && performance.now && (performance.now() * 1000)) || 0;\n    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {\n        let r = Math.random() * 16;\n        if (d > 0) {\n            r = (d + r) % 16 | 0;\n            d = Math.floor(d / 16);\n        }\n        else {\n            r = (d2 + r) % 16 | 0;\n            d2 = Math.floor(d2 / 16);\n        }\n        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);\n    });\n}\n;\nclass MessagePortRpcDispatcher {\n    constructor(_port, _handler) {\n        this._port = _port;\n        this._handler = _handler;\n        _port.onmessage = (event) => {\n            this.dispatch(event.data);\n        };\n    }\n    async dispatch(message) {\n        const handlerName = message.type;\n        const messageId = message.id;\n        const handler = this._handler[handlerName];\n        const ret = await handler.apply(this._handler, message.args);\n        this._port.postMessage({\n            \"dir\": \"resp\",\n            \"id\": messageId,\n            \"ret\": ret\n        });\n    }\n}\nfunction createMessagePortRpcProxy(port) {\n    const state = {\n        pendingCalls: {}\n    };\n    port.onmessage = (messageEvent) => {\n        if (messageEvent.data.dir == \"resp\") {\n            const pendingCall = state.pendingCalls[messageEvent.data.id];\n            if (!messageEvent.data.error) {\n                pendingCall.accept(messageEvent.data.ret);\n            }\n        }\n        else {\n            console.warn(\"Invalid response\");\n        }\n    };\n    return new Proxy(state, {\n        get(target, functionName) {\n            return (...args) => {\n                const newId = generateUUID();\n                const retPromise = new Promise((accept, reject) => {\n                    state.pendingCalls[newId] = {\n                        accept: accept,\n                        reject: reject\n                    };\n                    port.postMessage({\n                        \"dir\": \"req\",\n                        \"id\": newId,\n                        \"type\": functionName,\n                        \"args\": args\n                    });\n                });\n                return retPromise;\n            };\n        }\n    });\n}\n\n\n//# sourceURL=webpack://thrush/./src/lib/util/MessagePortRpc.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/lib/thrush_engine/synth/scriptsynth/worklet/ScriptSynthWorklet.ts");
/******/ 	
/******/ })()
;