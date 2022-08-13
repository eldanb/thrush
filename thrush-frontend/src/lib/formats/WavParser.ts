export function parseWav(wavFile: ArrayBuffer) {
  var hdr = new Uint32Array(wavFile.slice(0,36));
  var samples = new Uint8Array(wavFile.slice(58,
    wavFile.byteLength-58));

  const smp = [];

  const smp_rate = hdr[6];
  for(var i =0 ; i<samples.length; i++)
  {
      smp[i] = (samples[i]-128) / 256;
  }

  return {
    samples: new Float32Array(smp),
    sampleRate: smp_rate
  };
}
