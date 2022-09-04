export function parseWav(wavFile: ArrayBuffer): { samples: Float32Array[]; sampleRate: number; } {
  var wavDataView = new DataView(wavFile);

  if(wavDataView.getUint32(0, true) != 0x46464952 ||
     wavDataView.getUint32(8, true) != 0x45564157) {
      throw new Error('Invalid WAV file signatures');
  }

  const isLittleEndian = true;  

  if(wavDataView.getUint32(12, true) != 0x20746d66) {
    throw new Error('Expected fmt chunk');
  }
  const fmtSize = wavDataView.getUint32(16, true);
  
  const wavType = wavDataView.getUint16(20, isLittleEndian);
  if(wavType != 1) {
    throw new Error("Can't read non-PCM wav files: " + wavType);
  }

  const numChannels = wavDataView.getUint16(22, isLittleEndian);
  const sampleRate = wavDataView.getUint32(24, isLittleEndian);
  const bitsPerSample = wavDataView.getUint16(34, isLittleEndian);
  
  let nextChunk = 20 + fmtSize;
  if(wavDataView.getUint32(nextChunk, true) == 0x74636166) {
    nextChunk += 8 + wavDataView.getUint32(nextChunk + 4, isLittleEndian);
  }

  if(wavDataView.getUint32(nextChunk, true) != 0x61746164) {
    throw new Error("Expected data chunk");
  }
  
  const totalSampleSize = wavDataView.getUint32(nextChunk+4, isLittleEndian);
  const channelSampleSize = totalSampleSize / numChannels;
  const channelNumSamples = channelSampleSize / (bitsPerSample/8);
    
  const channelArrays: Float32Array[] = [];
  for(let channel = 0; channel < numChannels; channel++) {
    channelArrays.push(new Float32Array(channelNumSamples));
  }

  let sampleCursor = nextChunk + 8;  
  switch(bitsPerSample) {
    case 8:
      for(let sample = 0; sample < channelNumSamples; sample++) {
        for(let channel = 0; channel < numChannels; channel++) {
          channelArrays[channel][sample] = (wavDataView.getUint8(sampleCursor) - 128) / 128      
          sampleCursor++;
        }
      }
      break;

    case 16:
      for(let sample = 0; sample < channelNumSamples; sample++) {
        for(let channel = 0; channel < numChannels; channel++) {
          channelArrays[channel][sample] = wavDataView.getInt16(sampleCursor, isLittleEndian) / 32768;
          sampleCursor+=2;
        }
      }
      break;
        
    default:
      throw Error(`Invalid bitsPerSample: ${bitsPerSample}`);
  }
  
  return {
    samples: channelArrays,
    sampleRate: sampleRate
  };
}
