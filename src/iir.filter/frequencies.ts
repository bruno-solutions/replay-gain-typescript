// The supported Infinite Impulse Response (IIR) filter frequencies

enum FrequencyFilterIndexes {
  HZ8000 = 0,
  HZ11025 = 1,
  HZ12000 = 2,
  HZ16000 = 3,
  HZ22050 = 4,
  HZ24000 = 5,
  HZ32000 = 6,
  HZ44100 = 7,
  HZ48000 = 8
}

function frequencyFilterIndex(frequency: number): FrequencyFilterIndexes {
  switch (frequency) {
    case  8000:
      return FrequencyFilterIndexes.HZ8000;
    case 11025:
      return FrequencyFilterIndexes.HZ11025;
    case 12000:
      return FrequencyFilterIndexes.HZ12000;
    case 16000:
      return FrequencyFilterIndexes.HZ16000;
    case 22050:
      return FrequencyFilterIndexes.HZ22050;
    case 24000:
      return FrequencyFilterIndexes.HZ24000;
    case 32000:
      return FrequencyFilterIndexes.HZ32000;
    case 44100:
      return FrequencyFilterIndexes.HZ44100;
    case 48000:
      return FrequencyFilterIndexes.HZ48000;
    default:
      throw('Supported frequencies are 8000 hz, 11025 hz, 12000 hz, 16000 hz, 22050 hz, 24000 hz, 32000 hz, 44100 hz, and 48000 hz');
  }
}
