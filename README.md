# replay-gain-typescript
## A TypeScript implementation of the [ReplayGain specification](https://wiki.hydrogenaud.io/index.php?title=ReplayGain_1.0_specification)

The ReplayGain specification calculates volume adjustments to audio sources such as an album, title (track), or chapter (clip) are calculated to enable audio players to replay the audio sources at a consistent volume. The volume adjustments are based upon the loudness profile of a pink noise signal with an RMS level of -14 dB relative to a full-scale sinusoid. Audio clipping is prevented when the calculated gain would exceed the digital audio range.

https://wiki.hydrogenaud.io/index.php?title=ReplayGain_1.0_specification
