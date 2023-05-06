---
sidebar_position: 1
---

# What is Thrush?

## Nothing much right now, really.

This is a plot for a collaborative, web-based programmable, multi-engine synthesizer. Currently this is mostly scaffolds and PoCs, but do check in regularly -- it is growing.

The Main Event in the current setup is CodeSynth -- allowing you to write JavaScript code to generate music. Read more on how to use it [here](sequence-generators/CodeSynth).

## In this Version

- A software-based wavetable synthesizer.  This is 'CPU intensive' but will allow accuracy and flexibility in rendering different effects.  
- A WebAudio-native wavetable synthesizer. This is more CPU optimized (since a lot of the work is offloaded to WebAudio), but as such it is somewhat restricted in flexibility. 
- An FM synthesizer.
- Buffering sequencer. Capable of operating the synthesizers in a synchronized manner, and orchestrating multiple synthesizer event sequences. Sequences may be mixed, concatenated, and otherwise transformed. Sequences may operate multiple synthesizers, and include markers / cues that can be observed and waited upon. Event sequences are lazily evaluated, buffered and streamed into the synthesizers.
- Generator function based sequence. Generates an event sequence by evaluating a JavaScript generator function.  This is useful for creating generative / procedural musical content.
- Pattern based sequences. These are sequences that are based on fixed-time slots with commands.
- Simple part notation sequences. These are sequences that are specified in a simple language for musical notation.
- Project editing UI -- with tabbed editors, resource lists, etc.


### News: May 2023 (2)
- Support for equalizer and chorus filters

### News: March 2023 (2)
- Support for note modification in part notation
- Support for pitch-bend

### News: March 2023
- Project editor UI including code and wavetable synthesis editing
- FM synthesis and instrument editor

### News: December 2022
- Support for volume envelopes for notes
- Support for auto allocate channels

### Also in POC mode (look under "Here Be Dragons"):
- An Amiga .mod file loader, that loads an Amiga music module file, extracts its instruments to the wavetable synthesizers and generates a set of seqeuncer sequences that encode the music in the module.
      
## What's futher in the plan

The following is listed roughly by current priority:
    
- Procedural sequences -- utility functions (concat, transpose, chords, ...)
- A timeline editor (editing a timeline on which other sequences can be placed)
- A pattern sequence editor.
- A sample editor
- More power to wavetable synthesizer engines: e.g effects and layers
- Realtime event ingestion (MIDI, on-screen controllers)
- Collaboration features: every asset in a tune becomes freely available for anyone to consume in their one project.
- Maintain a pedigree of assets (which asset was derived from which asset) and allow consumers to browse by pedigree.              
- An initial insturments bank, and perhaps patterns bank.
 
Track my progress on my Blog, [I Am Only Doing This So You Won't Have To](https://www.imonlydoingthis.benhaim).