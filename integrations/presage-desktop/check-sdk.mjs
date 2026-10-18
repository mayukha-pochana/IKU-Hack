// Loads the real native runtime but never requests camera access or starts capture.
import { SmartSpectraSDK, breathingMetrics, cardioMetrics } from '@smartspectra/node-sdk';
if (!SmartSpectraSDK.version || !breathingMetrics.length || !cardioMetrics.length) throw new Error('SDK is incomplete');
console.log(JSON.stringify({ sdk_version: SmartSpectraSDK.version, platform: `${process.platform}-${process.arch}`, native_runtime_loaded: true, camera_started: false }));
