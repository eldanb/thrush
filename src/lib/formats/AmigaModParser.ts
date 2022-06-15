import { NativeSynthesizer } from "../thrush_engine/synth/native/NativeSynthesizer";
import { ScriptSynthEngineEvent } from "../thrush_engine/synth/scriptsynth/ScriptSynthEngine";
import { ScriptSynthesizer } from "../thrush_engine/synth/scriptsynth/ScriptSynthesizer";
import { ThrushPattern, ThrushPatternBinding, ThrushPatternChannelCommand, ThrushPatternChannelEffectSetVolume, ThrushPatternRow } from "../thrush_engine/ThrushPatternSequenceGenerator";
import { ThrushSequenceEvent, ThrushSequenceGenerator, ThrushSequencer } from "../thrush_engine/ThrushSequencer";
import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerInterface } from "../thrush_engine/ThrushSynthesizerInterface";

// File format taken from:
// See https://www.ocf.berkeley.edu/~eek/index.html/tiny_examples/ptmod/ap12.html
// https://www.fileformat.info/format/mod/spec/3bc11a4842e342498a6230e60187b463/view.htm

const textDecoder = new TextDecoder('ascii');


type AmigaModSampleInfo = {
  sampleName: string;
  sampleLen: number;
  fineTune: number;
  volume: number;
  loopStart: number;
  loopLen: number;
  content: ArrayBuffer | null;
}

type AmigaModPatternChannelCommand = {
  sampleNumber: number;
  noteInfo: { name: string; num: number };
  noteEffect: number;
  noteEffectParam: number;
}

type AmigaModPatternRow = AmigaModPatternChannelCommand[];
type AmigaModPattern = AmigaModPatternRow[];

export type AmigaModFile = {
  songName: string;
  samples: AmigaModSampleInfo[];
  songPatterns: number[];
  patterns: AmigaModPattern[];
};

export function parseModFile(file: ArrayBuffer): AmigaModFile {
  const fileSig = textDecoder.decode(file.slice(1080, 1084));
  
  const numSamples = fileSig == 'M.K.' ? 31 : 15;
  const postSamples = 50+30*(numSamples-1);
  const fileSigLen = fileSig == 'M.K.' ? 4 : 0;

  const dv = new DataView(file);
  const songName = textDecoder.decode(file.slice(0, 20));
  const samples = [];

  for(let sampleIdx=0; sampleIdx<numSamples; sampleIdx++) {
    samples.push(loadSample(file.slice(20 + 30*sampleIdx, 50 + 30*sampleIdx)))
  }

  const songLength = dv.getUint8(postSamples);
  const songPatterns = Array.from(new Uint8Array(file.slice(postSamples+2, postSamples+2+songLength)));

  const numPatterns = Math.max(...songPatterns) + 1;

  const patterns = [];
  for(let patternIndex = 0; patternIndex<numPatterns; patternIndex++) {
    patterns.push(loadPattern(file.slice(postSamples+130+fileSigLen + patternIndex*1024, postSamples+130+fileSigLen+1024+patternIndex*1024)));
  }

  let sampleOffset = postSamples+130+fileSigLen+numPatterns*1024;
  samples.forEach((sample) => {
    sample.content = file.slice(sampleOffset, sampleOffset + sample.sampleLen);
    sampleOffset+=sample.sampleLen;
  })

  return {
    songName,
    samples,
    songPatterns,
    patterns
  }
}

function loadSample(sampleDescriptorArrayBuffer: ArrayBuffer): AmigaModSampleInfo {
  const dv = new DataView(sampleDescriptorArrayBuffer);
  const sampleName = textDecoder.decode(sampleDescriptorArrayBuffer.slice(0, 22));
  const sampleLen = dv.getUint16(22) * 2;
  const fineTune = dv.getUint8(24);
  const volume = dv.getUint8(25);
  const loopStart = dv.getUint16(26) * 2;
  const loopLen = dv.getUint16(28) > 1 ? dv.getUint16(28) * 2 : 0;

  return {
    sampleName,
    sampleLen,
    fineTune,
    volume,
    loopStart,
    loopLen,
    content: null
  };
}

function loadPattern(patternArrayBuffer: ArrayBuffer) {
  const ret = [];
  const dv = new DataView(patternArrayBuffer);
  let baseOfs = 0;


  for(let noteIndex = 0; noteIndex<64; noteIndex++) {
    const note = [];
    for(let channelIndex=0; channelIndex<4; channelIndex++) {
      note.push(loadChannelNote(dv, baseOfs));
      baseOfs += 4;
    }

    ret.push(note);
  }

  return ret;
}

const PeriodToNoteLookup: { [period: string]: any } = {
  '113': { name: 'B-3', num: 35 },
  '120': { name: 'A#3', num: 34 },
  '127': { name: 'A-3', num: 33 },
  '135': { name: 'G#3', num: 32 },
  '143': { name: 'G-3', num: 31 },
  '151': { name: 'F#3', num: 30 },
  '160': { name: 'F-3', num: 29 },
  '170': { name: 'E-3', num: 28 },
  '180': { name: 'D#3', num: 27 },
  '190': { name: 'D-3', num: 26 },
  '202': { name: 'C#3', num: 25 },
  '214': { name: 'C-3', num: 24 },
  '226': { name: 'B-2', num: 23 },
  '240': { name: 'A#2', num: 22 },
  '254': { name: 'A-2', num: 21 },
  '269': { name: 'G#2', num: 20 },
  '285': { name: 'G-2', num: 19 },
  '302': { name: 'F#2', num: 18 },
  '320': { name: 'F-2', num: 17 },
  '339': { name: 'E-2', num: 16 },
  '360': { name: 'D#2', num: 15 },
  '381': { name: 'D-2', num: 14 },
  '404': { name: 'C#2', num: 13 },
  '428': { name: 'C-2', num: 12 },
  '453': { name: 'B-1', num: 11 },
  '480': { name: 'A#1', num: 10 },
  '508': { name: 'A-1', num: 9 },
  '538': { name: 'G#1', num: 8 },
  '570': { name: 'G-1', num: 7 },
  '604': { name: 'F#1', num: 6 },
  '640': { name: 'F-1', num: 5 },
  '678': { name: 'E-1', num: 4 },
  '720': { name: 'D#1', num: 3 },
  '762': { name: 'D-1', num: 2 },
  '808': { name: 'C#1', num: 1 },
  '856': { name: 'C-1', num: 0 }
}

function loadChannelNote(dv: DataView, baseOfs: number) {

  const sampleNumber = (dv.getUint8(baseOfs) & 0xf0) | (dv.getUint8(baseOfs+2) >> 4);
  const notePeriod = (((dv.getUint8(baseOfs) & 0xf) << 8) + dv.getUint8(baseOfs+1)).toString();
  const noteInfo = PeriodToNoteLookup[notePeriod];
  const noteEffect = dv.getUint8(baseOfs+2) & 0xf;
  const noteEffectParam = dv.getUint8(baseOfs+3);

  if(notePeriod !== '0' && !noteInfo) {
    console.warn(`invalid note period ${notePeriod}`)
  }

  return {
    sampleNumber,
    noteInfo,
    noteEffect,
    noteEffectParam
  };
}

type ModChannelState = {
  sample: number;
  volume: number;
}

export class AmigaModPlayer implements ThrushSequenceGenerator {
  private _time: number = 0;
  private _songPatternIndex: number = 0;
  private _patternRowIndex: number = 0;

  private _lastChannelState: ModChannelState[];

  private _ticksPerDiv = 6;
  private _bpm = 125;

  constructor(private _modFile: AmigaModFile) {
    this._sampleInstrumentIndex = [];
    this._lastChannelState = [];
    for(let i=0; i<4; i++) {
      this._lastChannelState.push({
        sample: 0,
        volume: 0
      })
    }
  }

  async loadInstruments(sequencer: ThrushSequencer): Promise<void> {
    await Promise.all(this._modFile.samples.map(async (sample, index) => {
      this._sampleInstrumentIndex[index] =
        await sequencer.tsynthToneGenerator.createInstrument(
          new Float32Array(Array.from(new Int8Array(sample.content!)).map((s) => (s)/256)).buffer,
          4143,
          0,
          sample.loopStart,
          sample.loopLen,
          (sample.volume/64)
        )
    }));
  }

  start(sequencer: ThrushSequencer): void {
  }

  nextEvent(): ThrushSequenceEvent | null {
    const currentPatternIndex = this._modFile.songPatterns[this._songPatternIndex];
    const currentPattern = this._modFile.patterns[currentPatternIndex];
    const currentPatternRow = currentPattern[this._patternRowIndex];
    let jumped = false;

    this._time += 60/((24 * this._bpm)/this._ticksPerDiv);

    currentPatternRow.forEach((channelCommand, channelIndex) => {
      if(channelCommand.sampleNumber && channelCommand.noteInfo) {
        this._lastChannelState[channelIndex].sample = channelCommand.sampleNumber;
        this._lastChannelState[channelIndex].volume = this._modFile.samples[channelCommand.sampleNumber-1].volume;
      }

      switch(channelCommand.noteEffect) {
        case 0:
          break;

        case 0xc: // deferred
          break;

        case 0xd: // Break pattern
          jumped = true;
          this._songPatternIndex++;
          this._patternRowIndex = (channelCommand.noteEffectParam >> 4)*10 + channelCommand.noteEffectParam & 0xf;
          console.debug(`====== Pattern Break ======`)
          break;

        case 0xa: // Deferred
          break;

        case 0xe:
          if(channelCommand.noteEffectParam >> 4 == 0) {
            // This is Amiga Filter on / off. Nothing to do here.
          } else {
            console.warn(`Ignoring effect ${channelCommand.noteEffect.toString(16)} ${channelCommand.noteEffectParam.toString(16)}`);
          }
          break;

        case 0xf: // Set speed
          if(channelCommand.noteEffectParam <= 32) {
            this._ticksPerDiv = channelCommand.noteEffectParam;
            console.debug(`Ticks per div ${this._ticksPerDiv}`);
          } else {
            this._bpm = channelCommand.noteEffectParam;
          }
          break;

        default:
          console.warn(`Ignoring effect ${channelCommand.noteEffect.toString(16)} ${channelCommand.noteEffectParam.toString(16)}`);
      }
    });

    if(!jumped) {
      this._patternRowIndex++;

      if(this._patternRowIndex > 63) {
        this._patternRowIndex = 0;
        this._songPatternIndex++;
        console.debug("To pattern " + this._modFile.songPatterns[this._songPatternIndex])
      }
    }

    const currentTime = this._time;

    return {
      time: currentTime,
      route: async (sequencer) => {
        currentPatternRow.forEach((channelCommand, channelIndex) => {
          let hasEvent = false;

          const rowEvent: ScriptSynthEngineEvent = {
            channel: channelIndex,
            time: currentTime,
            panning: (channelIndex == 0 || channelIndex == 3) ? 0 : 1
          };

          if(channelCommand.noteInfo) {
            rowEvent.newNote = {
              instrumentId: this._sampleInstrumentIndex[(channelCommand.sampleNumber || this._lastChannelState[channelIndex].sample)-1],
              note: channelCommand.noteInfo.num
            }
            hasEvent = true;
          }

          switch(channelCommand.noteEffect) {
            case 0xa:
              let newVolume = this._lastChannelState[channelIndex].volume;
              if(channelCommand.noteEffectParam & 0xf0) {
                console.warn("Volume slide up");
                newVolume += (this._ticksPerDiv-1) * (channelCommand.noteEffectParam >> 4);
              } else {
                console.warn("Volume slide down");
                newVolume -= (this._ticksPerDiv-1) * channelCommand.noteEffectParam;
              }

              if(newVolume < 0) {
                newVolume = 0;
              } else
              if(newVolume > 63) {
                newVolume = 63;
              }

              this._lastChannelState[channelIndex].volume = newVolume;

              rowEvent.volume = (newVolume / 63);
              hasEvent = true;

              break;

            case 0xc:
              rowEvent.volume = (channelCommand.noteEffectParam / 63);
              hasEvent = true;
              break;

            default:
              break;
          }

          if(hasEvent) {
            sequencer.tsynthToneGenerator.enqueueSynthEvent(new ThrushCommonSynthesizerEvent(
              rowEvent.time,
              sequencer.tsynthToneGenerator,
              rowEvent.channel,
              {
                newNote: rowEvent.newNote,
                panning: rowEvent.panning,
                volume: rowEvent.volume
              }));
          }              
        });
      }
    }

   /*const tm = this._time;

    this._patternRowIndex++;
    this._time += 8;

    return {
      time: tm,
      route: async (sequencer) => {
        sequencer.tsynthToneGenerator.enqueueEvent({
              channel: 0,
              newNote: {
                note: 12,
                instrumentId: this._sampleInstrumentIndex[this._patternRowIndex-1]
              },              
              time: tm,
              
            });
      }
    }*/
  }


  private _sampleInstrumentIndex: number[];

}




export interface AmigaModImportSynthDriver {  
  createPatternBindings(samples: AmigaModSampleInfo[]): Promise<ThrushPatternBinding>;
}

export class AmigaModScriptSynthImportSynthDriver implements AmigaModImportSynthDriver {
  constructor(public synth: ScriptSynthesizer) {

  }


  async createPatternBindings(samples: AmigaModSampleInfo[]): Promise<ThrushPatternBinding> {
    const ret: ThrushPatternBinding = {
      sampleInsturmentHandles: [],
      synth: this.synth
    }

    await Promise.all(samples.map(async (sample, index) => {
      ret.sampleInsturmentHandles[index] =
        await this.synth.createInstrument(
          new Float32Array(Array.from(new Int8Array(sample.content!)).map((s) => (s)/256)).buffer,
          4143,
          0,
          sample.loopStart,
          sample.loopLen,
          (sample.volume/64)
        )
    }));

    return ret;
  }
}


export class AmigaModNativeSynthImportSynthDriver implements AmigaModImportSynthDriver {
  constructor(public synth: NativeSynthesizer) {

  }

  async createPatternBindings(samples: AmigaModSampleInfo[]): Promise<ThrushPatternBinding> {
    const ret: ThrushPatternBinding = {
      sampleInsturmentHandles: [],
      synth: this.synth
    }

    await Promise.all(samples.map(async (sample, index) => {
      ret.sampleInsturmentHandles[index] =
        await this.synth.registerInstrument(
          new Float32Array(Array.from(new Int8Array(sample.content!)).map((s) => (s)/256)).buffer,
          4143,
          0,
          sample.loopStart,
          sample.loopLen,
          (sample.volume/64)
        )
    }));

    return ret;
  }
}

export class AmigaModPlayer2 {

  private _ticksPerDiv = 6;
  private _bpm = 125;

  constructor(private _modFile: AmigaModFile, private _driver: AmigaModImportSynthDriver) {    
  }

  public createPatternBinding(): Promise<ThrushPatternBinding> {
    return this._driver.createPatternBindings(this._modFile.samples)
  }

  private compilePattern(pattern: AmigaModPattern): { 
    thrushPattern: ThrushPattern,
    nextPatternOffset: number
  } {
    const patternRows: ThrushPatternRow[] = [];
    const thrushPattern: ThrushPattern = {
      bpm: this._bpm,
      ticksPerDivision: this._ticksPerDiv,
      rows: patternRows
    }
    let nextPatternOffset = 0;

    for(let rowIndex=0; rowIndex<pattern.length; rowIndex++) {
      const patternRow: ThrushPatternRow = {
        rowCommands: [],
        channelCommands: []
      }
      patternRows.push(patternRow);

      pattern[rowIndex].forEach((channelCommand, channelIndex) => {        
        const thrushChannelCommand: ThrushPatternChannelCommand =  {
          effects: []
        }
        patternRow.channelCommands[channelIndex] = thrushChannelCommand;

        if(channelCommand.sampleNumber) {
          thrushChannelCommand.sampleNumber = channelCommand.sampleNumber-1;
          thrushChannelCommand.effects!.push({type: "vol_set", value: this._modFile.samples[channelCommand.sampleNumber-1].volume/63});
          thrushChannelCommand.effects!.push({type: "pan_set", value: (channelIndex == 0 || channelIndex == 3) ? 0 : 1});
        }
        
        if(channelCommand.noteInfo) {
          thrushChannelCommand.note = channelCommand.noteInfo.num;          
        }
        
        switch(channelCommand.noteEffect) {
          case 0xa:            
            if(channelCommand.noteEffectParam & 0xf0) {
              thrushChannelCommand.effects!.push({
                type: "vol_slide",
                slide: ((this._ticksPerDiv-1) * (channelCommand.noteEffectParam >> 4))/63
              });
            } else {
              thrushChannelCommand.effects!.push({
                type: "vol_slide",
                slide: ((this._ticksPerDiv-1) * channelCommand.noteEffectParam)/63
              });
            }
            break;

          case 0xc:
            let existingVolSet: ThrushPatternChannelEffectSetVolume = 
              thrushChannelCommand.effects?.find((eff) => eff.type === "vol_set") as ThrushPatternChannelEffectSetVolume;
            if(existingVolSet) {
              existingVolSet.value = channelCommand.noteEffectParam / 63;
            } else {
              thrushChannelCommand.effects = [{
                type: "vol_set",
                value: channelCommand.noteEffectParam / 63
              }];  
            }
            break;

          case 0xd: // Break
            // Handled below.
            break;

          case 0xf: // Set speed          
            if(channelCommand.noteEffectParam <= 32) {
              this._ticksPerDiv = channelCommand.noteEffectParam;
              console.debug(`Ticks per div ${this._ticksPerDiv}`);
            } else {
              this._bpm = channelCommand.noteEffectParam;
            }
            
            patternRow.rowCommands?.push({type: "set_speed", bpm: this._bpm, ticksPerDiv: this._ticksPerDiv});
            break;

          case 0xe:
            if(channelCommand.noteEffectParam >> 4 == 0) {
              // This is Amiga Filter on / off. Nothing to do here.
            } else {
              console.warn(`Ignoring effect ${channelCommand.noteEffect.toString(16)} ${channelCommand.noteEffectParam.toString(16)}`);
            }
            break;

          default:
            console.warn(`Ignoring effect ${channelCommand.noteEffect.toString(16)} ${channelCommand.noteEffectParam.toString(16)}`);
            break;
        }
      })

      const breakRequest = pattern[rowIndex].find(channelCommand => channelCommand.noteEffect == 0xd);
      if(breakRequest) {
        nextPatternOffset = (breakRequest.noteEffectParam >> 4)*10 + breakRequest.noteEffectParam & 0xf;
        break;
      }
    }

    return {
      thrushPattern,
      nextPatternOffset
    }
  }

  public compileSong() {    
    let songPatternIndex: number = 0;
    let patternRowOffset: number = 0;
    let thrushSong: number[] = [];
    let thrushPatterns: ThrushPattern[] = [];
    let modPatternAndOfsToThrushPatternAndTargetOfs: {
      [cacheKey: string]: {
        thrushPatternIndex: number,
        nextPatternOffset: number
      }
    } = {};    
  
    while(songPatternIndex < this._modFile.songPatterns.length) {      
      const currentPatternIdx = this._modFile.songPatterns[songPatternIndex];
      const patternCacheKey = JSON.stringify({p: currentPatternIdx, o: patternRowOffset});

      let patternInfo = modPatternAndOfsToThrushPatternAndTargetOfs[patternCacheKey];
      if(!modPatternAndOfsToThrushPatternAndTargetOfs[patternCacheKey]) {
        const currentPattern = this._modFile.patterns[currentPatternIdx];
        const compilationResult = this.compilePattern(currentPattern);
        patternInfo = {
          nextPatternOffset: compilationResult.nextPatternOffset,
          thrushPatternIndex: thrushPatterns.push(compilationResult.thrushPattern)-1
        }
        modPatternAndOfsToThrushPatternAndTargetOfs[patternCacheKey] = patternInfo;
      }

      thrushSong.push(patternInfo.thrushPatternIndex);
      patternRowOffset = patternInfo.nextPatternOffset;
      songPatternIndex++;
    }

    return {
      patterns: thrushPatterns,
      song: thrushSong
    }
  }
}