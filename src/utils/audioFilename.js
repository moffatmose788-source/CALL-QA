const AUDIO_FILENAME_REGEX = /^(?:out|in)-(\d+)-(\d+)-(\d{8})-(\d{6})-(\d+)\.([^./\\]+)\.wav$/i;

export function parseAudioFilename(filename) {
  const basename = filename.replace(/^.*[\\/]/, '');
  const match = AUDIO_FILENAME_REGEX.exec(basename);
  if (!match) {
    return {
      filename: basename,
      error: 'Filename does not match expected Asterisk/PBX pattern',
    };
  }

  const [, customerPhone, agentExtension, dateRaw, timeRaw, unixTs, callId] = match;
  return {
    filename: basename,
    customerPhone,
    agentExtension,
    unixTs,
    callId,
    date: `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`,
    time: `${timeRaw.slice(0, 2)}:${timeRaw.slice(2, 4)}:${timeRaw.slice(4, 6)}`,
  };
}
