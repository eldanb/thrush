
export function Base64ToUint8Array(b64: string): Uint8Array {
  const binaryContent = atob(b64);
  const uintBuffer = new Uint8Array(binaryContent.length);
  for(let index = 0; index < binaryContent.length; index++) {
    uintBuffer[index] = binaryContent.charCodeAt(index);
  }

  return uintBuffer;
}

export function Base64ToFloat32ArrayLe(b64: string) {  
  const uintBuffer = Base64ToUint8Array(b64);

  const dataView = new DataView(uintBuffer.buffer);
  const result = new Float32Array(dataView.byteLength / Float32Array.BYTES_PER_ELEMENT);
  for(let index = 0; index < result.length; index++) {
    result[index] = dataView.getFloat32(index * Float32Array.BYTES_PER_ELEMENT, true);
  }
  
  return result;
}
  
export function Float32ArrayToBase64Le(arr: Float32Array) {
  const binaryBuffer = new ArrayBuffer(arr.length * Float32Array.BYTES_PER_ELEMENT);
  const dataView = new DataView(binaryBuffer);
  arr.forEach((value, index) => {
    dataView.setFloat32(index * Float32Array.BYTES_PER_ELEMENT, value, true);
  });

  const binaryString = Array.from(new Uint8Array(binaryBuffer)).map(b => String.fromCharCode(b)).join('');
  return btoa(binaryString);
}