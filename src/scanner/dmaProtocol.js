/**
 * @fileoverview BCT15X DMA (Dynamic Memory Architecture) protocol definitions and parser
 * @description Generates programming commands and parses responses for Uniden BCT15X programming mode.
 */

/**
 * System type definitions
 * @enum {string}
 */
const SystemTypes = {
  CONVENTIONAL: 'CNV',
  MOTOROLA: 'MOT',
  EDACS_NARROW_WIDE: 'EDC',
  EDACS_SCAT: 'EDS',
  LTR: 'LTR',
};

/**
 * Modulation type definitions
 * @enum {string}
 */
const Modulations = {
  AUTO: 'AUTO',
  AM: 'AM',
  FM: 'FM',
  NFM: 'NFM',
  WFM: 'WFM',
  FMB: 'FMB',
};

/**
 * CTCSS / DCS code table (conforms to BCT15X specification)
 */
const CTCSS_DCS_TABLE = {
  0: 'None / All',
  127: 'Search',
  // CTCSS (64 - 113)
  64: 'CTCSS 67.0Hz',
  65: 'CTCSS 69.3Hz',
  66: 'CTCSS 71.9Hz',
  67: 'CTCSS 74.4Hz',
  68: 'CTCSS 77.0Hz',
  69: 'CTCSS 79.7Hz',
  70: 'CTCSS 82.5Hz',
  71: 'CTCSS 85.4Hz',
  72: 'CTCSS 88.5Hz',
  73: 'CTCSS 91.5Hz',
  74: 'CTCSS 94.8Hz',
  75: 'CTCSS 97.4Hz',
  76: 'CTCSS 100.0Hz',
  77: 'CTCSS 103.5Hz',
  78: 'CTCSS 107.2Hz',
  79: 'CTCSS 110.9Hz',
  80: 'CTCSS 114.8Hz',
  81: 'CTCSS 118.8Hz',
  82: 'CTCSS 123.0Hz',
  83: 'CTCSS 127.3Hz',
  84: 'CTCSS 131.8Hz',
  85: 'CTCSS 136.5Hz',
  86: 'CTCSS 141.3Hz',
  87: 'CTCSS 146.2Hz',
  88: 'CTCSS 151.4Hz',
  89: 'CTCSS 156.7Hz',
  90: 'CTCSS 159.8Hz',
  91: 'CTCSS 162.2Hz',
  92: 'CTCSS 165.5Hz',
  93: 'CTCSS 167.9Hz',
  94: 'CTCSS 171.3Hz',
  95: 'CTCSS 173.8Hz',
  96: 'CTCSS 177.3Hz',
  97: 'CTCSS 179.9Hz',
  98: 'CTCSS 183.5Hz',
  99: 'CTCSS 186.2Hz',
  100: 'CTCSS 189.9Hz',
  101: 'CTCSS 192.8Hz',
  102: 'CTCSS 196.6Hz',
  103: 'CTCSS 199.5Hz',
  104: 'CTCSS 203.5Hz',
  105: 'CTCSS 206.5Hz',
  106: 'CTCSS 210.7Hz',
  107: 'CTCSS 218.1Hz',
  108: 'CTCSS 225.7Hz',
  109: 'CTCSS 229.1Hz',
  110: 'CTCSS 233.6Hz',
  111: 'CTCSS 241.8Hz',
  112: 'CTCSS 250.3Hz',
  113: 'CTCSS 254.1Hz',
  // DCS (128 - 231)
  128: 'DCS 023',
  129: 'DCS 025',
  130: 'DCS 026',
  131: 'DCS 031',
  132: 'DCS 032',
  133: 'DCS 036',
  134: 'DCS 043',
  135: 'DCS 047',
  136: 'DCS 051',
  137: 'DCS 053',
  138: 'DCS 054',
  139: 'DCS 065',
  140: 'DCS 071',
  141: 'DCS 072',
  142: 'DCS 073',
  143: 'DCS 074',
  144: 'DCS 114',
  145: 'DCS 115',
  146: 'DCS 116',
  147: 'DCS 122',
  148: 'DCS 125',
  149: 'DCS 131',
  150: 'DCS 132',
  151: 'DCS 134',
  152: 'DCS 143',
  153: 'DCS 145',
  154: 'DCS 152',
  155: 'DCS 155',
  156: 'DCS 156',
  157: 'DCS 162',
  158: 'DCS 165',
  159: 'DCS 172',
  160: 'DCS 174',
  161: 'DCS 205',
  162: 'DCS 212',
  163: 'DCS 223',
  164: 'DCS 225',
  165: 'DCS 226',
  166: 'DCS 243',
  167: 'DCS 244',
  168: 'DCS 245',
  169: 'DCS 246',
  170: 'DCS 251',
  171: 'DCS 252',
  172: 'DCS 255',
  173: 'DCS 261',
  174: 'DCS 263',
  175: 'DCS 265',
  176: 'DCS 266',
  177: 'DCS 271',
  178: 'DCS 274',
  179: 'DCS 306',
  180: 'DCS 311',
  181: 'DCS 315',
  182: 'DCS 325',
  183: 'DCS 331',
  184: 'DCS 332',
  185: 'DCS 343',
  186: 'DCS 346',
  187: 'DCS 351',
  188: 'DCS 356',
  189: 'DCS 364',
  190: 'DCS 365',
  191: 'DCS 371',
  192: 'DCS 411',
  193: 'DCS 412',
  194: 'DCS 413',
  195: 'DCS 423',
  196: 'DCS 431',
  197: 'DCS 432',
  198: 'DCS 445',
  199: 'DCS 446',
  200: 'DCS 452',
  201: 'DCS 454',
  202: 'DCS 455',
  203: 'DCS 462',
  204: 'DCS 464',
  205: 'DCS 465',
  206: 'DCS 466',
  207: 'DCS 503',
  208: 'DCS 506',
  209: 'DCS 516',
  210: 'DCS 523',
  211: 'DCS 526',
  212: 'DCS 532',
  213: 'DCS 546',
  214: 'DCS 565',
  215: 'DCS 606',
  216: 'DCS 612',
  217: 'DCS 624',
  218: 'DCS 627',
  219: 'DCS 631',
  220: 'DCS 632',
  221: 'DCS 654',
  222: 'DCS 662',
  223: 'DCS 664',
  224: 'DCS 703',
  225: 'DCS 712',
  226: 'DCS 723',
  227: 'DCS 731',
  228: 'DCS 732',
  229: 'DCS 734',
  230: 'DCS 743',
  231: 'DCS 754',
};

// Reverse lookup map
const REVERSE_CTCSS_DCS_TABLE = {};
for (const [code, label] of Object.entries(CTCSS_DCS_TABLE)) {
  REVERSE_CTCSS_DCS_TABLE[label] = parseInt(code, 10);
  // Support abbreviated representations (e.g. "88.5" or "D023")
  const simpleMatch = label.match(/^(?:CTCSS\s+)?(\d+\.?\d*Hz?)|^(?:DCS\s+)?(\d+)/i);
  if (simpleMatch) {
    if (simpleMatch[1]) REVERSE_CTCSS_DCS_TABLE[simpleMatch[1].replace('Hz', '')] = parseInt(code, 10);
    if (simpleMatch[2]) REVERSE_CTCSS_DCS_TABLE[simpleMatch[2]] = parseInt(code, 10);
  }
}

/**
 * Convert frequency in MHz to 8-digit BCT15X raw format (MHz -> 8 digits)
 * @param {string|number} freqMhz - e.g. "155.7000" or 155.7
 * @returns {string} 8-digit frequency string (e.g. "01557000")
 */
function toRawFrequency(freqMhz) {
  if (!freqMhz) return '00000000';
  const num = parseFloat(String(freqMhz).replace(/[^\d.]/g, ''));
  if (isNaN(num)) return '00000000';
  const val = Math.round(num * 10000);
  return String(val).padStart(8, '0');
}

/**
 * Convert 8-digit BCT15X raw frequency format to formatted MHz string
 * @param {string} rawFreq - 8-digit frequency string (e.g. "01557000")
 * @returns {string} Formatted frequency (e.g. "155.7000")
 */
function fromRawFrequency(rawFreq) {
  if (!rawFreq) return '0.0000';
  const num = parseInt(rawFreq.trim(), 10);
  if (isNaN(num)) return rawFreq;
  return (num / 10000).toFixed(4);
}

/**
 * Convert tone code to human-readable label
 * @param {number|string} code - Code number (0-231)
 * @returns {string} Tone label (e.g. "CTCSS 88.5Hz", "None / All")
 */
function fromToneCode(code) {
  const num = parseInt(code, 10);
  return CTCSS_DCS_TABLE[num] || 'None / All';
}

/**
 * Convert tone label string to code number
 * @param {string} label - Tone label
 * @returns {number} Code number
 */
function toToneCode(label) {
  if (!label) return 0;
  if (typeof label === 'number') return label;
  const trimmed = label.trim();
  if (REVERSE_CTCSS_DCS_TABLE[trimmed] !== undefined) {
    return REVERSE_CTCSS_DCS_TABLE[trimmed];
  }
  const parsed = parseInt(trimmed, 10);
  if (!isNaN(parsed) && CTCSS_DCS_TABLE[parsed]) return parsed;
  return 0;
}

/**
 * Parse SIH (System Index Head) response
 * @param {string} response - "SIH,10" or "SIH,-1"
 * @returns {number} System head index (-1 indicates empty)
 */
function parseSihResponse(response) {
  const parts = response.trim().split(',');
  if (parts.length >= 2 && parts[0] === 'SIH') {
    return parseInt(parts[1], 10);
  }
  return -1;
}

/**
 * Parse SIN (System Information) response
 * Format: SIN,[SYS_TYPE],[NAME],[QUICK_KEY],[HLD],[LOUT],[DLY],...,[REV_INDEX],[FWD_INDEX],[CHN_GRP_HEAD],[CHN_GRP_TAIL],...
 * @param {string} response - Response string
 * @param {number} index - Queried system index
 * @returns {Object|null}
 */
function parseSinResponse(response, index) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'SIN' || parts.length < 15) {
    return null;
  }

  return {
    id: index,
    type: parts[1], // CNV, MOT, EDC, EDS, LTR
    name: parts[2] ? parts[2].trim() : `System ${index}`,
    quickKey: parts[3] === '.' ? null : parseInt(parts[3], 10),
    holdTime: parseInt(parts[4], 10) || 0,
    lockout: parts[5] === '1',
    delay: parseInt(parts[6], 10) || 2,
    revIndex: parseInt(parts[12], 10),
    fwdIndex: parseInt(parts[13], 10),
    groupHead: parseInt(parts[14], 10),
    groupTail: parseInt(parts[15], 10),
    rawParts: parts,
  };
}

/**
 * Parse GIN (Group Information) response
 * Format: GIN,[GRP_TYPE],[NAME],[QUICK_KEY],[LOUT],[REV_INDEX],[FWD_INDEX],[SYS_INDEX],[CHN_HEAD],[CHN_TAIL],...
 * @param {string} response - Response string
 * @param {number} index - Group index
 * @returns {Object|null}
 */
function parseGinResponse(response, index) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'GIN' || parts.length < 10) {
    return null;
  }

  return {
    id: index,
    groupType: parts[1], // C: Channel, T: TGID
    name: parts[2] ? parts[2].trim() : `Group ${index}`,
    quickKey: parts[3] === '.' ? null : parts[3] === '0' ? 10 : parseInt(parts[3], 10),
    lockout: parts[4] === '1',
    revIndex: parseInt(parts[5], 10),
    fwdIndex: parseInt(parts[6], 10),
    systemId: parseInt(parts[7], 10),
    channelHead: parseInt(parts[8], 10),
    channelTail: parseInt(parts[9], 10),
    rawParts: parts,
  };
}

/**
 * Parse CIN (Channel Information) response for Conventional Channel
 * Format: CIN,[NAME],[FRQ],[MOD],[CTCSS/DCS],[TLOCK],[LOUT],[PRI],[ATT],[ALT],[ALTL],[REV_INDEX],[FWD_INDEX],[SYS_INDEX],[GRP_INDEX],...
 * @param {string} response - Response string
 * @param {number} index - Channel index
 * @returns {Object|null}
 */
function parseCinResponse(response, index) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'CIN' || parts.length < 15) {
    return null;
  }

  const toneCode = parseInt(parts[4], 10) || 0;

  return {
    id: index,
    name: parts[1] ? parts[1].trim() : '',
    frequency: fromRawFrequency(parts[2]),
    rawFrequency: parts[2],
    modulation: parts[3] || 'AUTO',
    toneCode,
    tone: fromToneCode(toneCode),
    toneLockout: parts[5] === '1',
    lockout: parts[6] === '1',
    priority: parts[7] === '1',
    attenuator: parts[8] === '1',
    alertTone: parseInt(parts[9], 10) || 0,
    alertLevel: parts[10] === 'AUTO' ? 'AUTO' : parseInt(parts[10], 10) || 0,
    revIndex: parseInt(parts[11], 10),
    fwdIndex: parseInt(parts[12], 10),
    systemId: parseInt(parts[13], 10),
    groupId: parseInt(parts[14], 10),
    rawParts: parts,
  };
}

/**
 * Parse CSY (Create System) response
 * @param {string} response - "CSY,[SYS_INDEX]"
 * @returns {number} Created system index (-1 on failure)
 */
function parseCsyResponse(response) {
  const parts = response.trim().split(',');
  if (parts[0] === 'CSY' && parts.length >= 2) {
    return parseInt(parts[1], 10);
  }
  return -1;
}

/**
 * Parse SHK (Search Key Settings) response
 * Format: SHK,[SRCH_KEY_1],[SRCH_KEY_2],[SRCH_KEY_3],[RSV],[RSV],[RSV]
 * Verified on BCT15X: SHK,CUSTOM_1,PublicSafety,B_SCOPE,,,
 * @param {string} response - Response string
 * @returns {Object|null} {searchKey1, searchKey2, searchKey3, rawParts}
 */
function parseShkResponse(response) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'SHK' || parts.length < 4) {
    return null;
  }
  return {
    searchKey1: parts[1] || null,
    searchKey2: parts[2] || null,
    searchKey3: parts[3] || null,
    rawParts: parts,
  };
}

/**
 * Parse SSP (Service Search Settings) response
 * Verified on BCT15X (GET echoes the index): SSP,1,2,0,2,1,.,.,1,NONE,,,
 * @param {string} response - Response string
 * @param {number} index - Queried search index
 * @returns {Object|null}
 */
function parseSspResponse(response, index) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'SSP' || parts.length < 8) {
    return null;
  }
  // BCT15X echoes the queried index as field 1 (unlike the BCT15 doc)
  const off = parts[1] === String(index) ? 2 : 1;
  return {
    id: index,
    delay: parseInt(parts[off], 10) || 0,
    attenuator: parts[off + 1] === '1',
    holdTime: parseInt(parts[off + 2], 10) || 0,
    lockout: parts[off + 3] === '1',
    quickKey: parts[off + 4] === '.' || parts[off + 4] === undefined ? null : parseInt(parts[off + 4], 10),
    startKey: parts[off + 5] === '.' || parts[off + 5] === undefined ? null : parts[off + 5],
    record: parts[off + 6] === '1',
    name: parts[off + 7] && parts[off + 7] !== '' ? parts[off + 7] : null,
    rawParts: parts,
  };
}

/**
 * Parse CSP (Custom Search Settings) response
 * Verified on BCT15X (GET does NOT echo the index):
 * CSP,Custom 1,00250000,00279999,AUTO,AUTO,0,2,,2,1,0,,,.,.,0,NONE,,,
 * @param {string} response - Response string
 * @param {number} index - Queried custom search index
 * @returns {Object|null}
 */
function parseCspResponse(response, index) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'CSP' || parts.length < 16) {
    return null;
  }
  return {
    id: index,
    name: parts[1] ? parts[1].trim() : `Custom ${index}`,
    lowerFrequency: fromRawFrequency(parts[2]),
    upperFrequency: fromRawFrequency(parts[3]),
    lowerRaw: parts[2],
    upperRaw: parts[3],
    step: parts[4] || 'AUTO',
    modulation: parts[5] || 'AUTO',
    attenuator: parts[6] === '1',
    delay: parseInt(parts[7], 10) || 0,
    dataSkip: parts[8] === '1',
    holdTime: parseInt(parts[9], 10) || 0,
    lockout: parts[10] === '1',
    controlChannelOnly: parts[11] === '1',
    quickKey: parts[14] === '.' || parts[14] === undefined ? null : parseInt(parts[14], 10),
    startKey: parts[15] === '.' || parts[15] === undefined ? null : parts[15],
    record: parts[16] === '1',
    rawParts: parts,
  };
}

/**
 * Build CSP (Custom Search Settings) write command
 * Mirrors the read field order verified on BCT15X
 * @param {Object} csp - Custom search data object
 * @returns {string} Command string
 */
function buildCspCommand(csp) {
  const name = (csp.name || '').substring(0, 16);
  const lower = csp.lowerRaw || toRawFrequency(csp.lowerFrequency);
  const upper = csp.upperRaw || toRawFrequency(csp.upperFrequency);
  const step = csp.step || 'AUTO';
  const mod = csp.modulation || 'AUTO';
  const att = csp.attenuator ? '1' : '0';
  const dly = csp.delay !== undefined ? csp.delay : 2;
  const skp = csp.dataSkip ? '1' : '0';
  const hld = csp.holdTime !== undefined ? csp.holdTime : 2;
  const lout = csp.lockout ? '1' : '0';
  const cch = csp.controlChannelOnly ? '1' : '0';
  const qk = csp.quickKey !== null && csp.quickKey !== undefined ? csp.quickKey : '.';
  const start = csp.startKey || '.';
  const rec = csp.record ? '1' : '0';
  return `CSP,${name},${lower},${upper},${step},${mod},${att},${dly},${skp},${hld},${lout},${cch},,,${qk},${start},${rec},NONE,,,`;
}

/**
 * Parse CSG (Custom Search Group enable) response
 * Verified on BCT15X: CSG,0000000000 (0=valid/enabled, 1=invalid/disabled)
 * @param {string} response - Response string
 * @returns {Object|null} {enabled: boolean[10]}
 */
function parseCsgResponse(response) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'CSG' || !parts[1]) {
    return null;
  }
  const flags = parts[1].padEnd(10, '0').slice(0, 10);
  return {
    enabled: flags.split('').map((f) => f === '0'),
    rawParts: parts,
  };
}

/**
 * Parse WXS (Weather Settings) response
 * Verified on BCT15X: WXS,2,0,0,0,,
 * @param {string} response - Response string
 * @returns {Object|null}
 */
function parseWxsResponse(response) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'WXS' || parts.length < 5) {
    return null;
  }
  return {
    delay: parseInt(parts[1], 10) || 0,
    attenuator: parts[2] === '1',
    alertPriority: parts[3] === '1',
    record: parts[4] === '1',
    rawParts: parts,
  };
}

/**
 * Parse SGP (SAME Group Settings) response
 * Verified on BCT15X: SGP,SAME 1,------,------,...(8 FIPS codes)
 * @param {string} response - Response string
 * @param {number} index - SAME group index (1-5)
 * @returns {Object|null}
 */
function parseSgpResponse(response, index) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'SGP' || parts.length < 9) {
    return null;
  }
  return {
    id: index,
    name: parts[1] ? parts[1].trim() : `SAME ${index}`,
    fipsCodes: parts.slice(2, 10).map((c) => (c === '------' || c === '' ? null : c)),
    rawParts: parts,
  };
}

/**
 * Parse SCO (Search/Close Call common options) response
 * Verified on BCT15X: SCO,,AUTO,0,2,,1,0001101111111111,1,,,100,0,,,
 * @param {string} response - Response string
 * @returns {Object|null}
 */
function parseScoResponse(response) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'SCO') {
    return null;
  }
  return {
    step: parts[1] || 'AUTO',
    modulation: parts[2] || 'AUTO',
    attenuator: parts[3] === '1',
    delay: parseInt(parts[4], 10) || 0,
    repeaterFind: parts[6] === '1',
    bandMask: parts[7] || null,
    maxAutoStore: parseInt(parts[11], 10) || 0,
    record: parts[12] === '1',
    rawParts: parts,
  };
}

/**
 * Parse BBS (Broadcast Screen Band) response
 * Verified on BCT15X: BBS,00000000,00000000
 * @param {string} response - Response string
 * @param {number} index - Band index (1-9, 0=10)
 * @returns {Object|null}
 */
function parseBbsResponse(response, index) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'BBS' || parts.length < 3) {
    return null;
  }
  return {
    id: index,
    lowerFrequency: fromRawFrequency(parts[1]),
    upperFrequency: fromRawFrequency(parts[2]),
    lowerRaw: parts[1],
    upperRaw: parts[2],
    rawParts: parts,
  };
}

/**
 * Parse CBP (Custom Search Band Plan) response
 * Verified on BCT15X: CBP,STD,,,... (STD = standard band plan)
 * @param {string} response - Response string
 * @param {number} index - Custom search index
 * @returns {Object|null}
 */
function parseCbpResponse(response, index) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'CBP') {
    return null;
  }
  if (parts[1] === 'STD') {
    return { id: index, standard: true, rawParts: parts };
  }
  return {
    id: index,
    standard: false,
    baseFrequencies: parts.slice(1, 10),
    rawParts: parts,
  };
}

/**
 * Parse TON (Tone-Out settings) response
 * Verified on BCT15X: TON,1,Tone-Out 1,01370000,FM,0,2,0,0,0,,0,,,0,,0,,,
 * @param {string} response - Response string
 * @param {number} index - Tone-out channel index (1-9, 0=10th)
 * @returns {Object|null}
 */
function parseTonResponse(response, index) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'TON' || parts.length < 12) {
    return null;
  }
  const off = parts[1] === String(index) ? 2 : 1;
  const toneA = parseFloat(parts[off + 7]);
  const toneB = parseFloat(parts[off + 9]);
  return {
    id: index,
    name: parts[off] ? parts[off].trim() : `Tone-Out ${index}`,
    frequency: fromRawFrequency(parts[off + 1]),
    rawFrequency: parts[off + 1],
    modulation: parts[off + 2] || 'FM',
    attenuator: parts[off + 3] === '1',
    delay: parseInt(parts[off + 4], 10) || 0,
    alertTone: parseInt(parts[off + 5], 10) || 0,
    alertLevel: parseInt(parts[off + 6], 10) || 0,
    toneA: !isNaN(toneA) && toneA > 0 ? toneA / 10 : 0,
    toneB: !isNaN(toneB) && toneB > 0 ? toneB / 10 : 0,
    record: parts[off + 12] === '1',
    alertColor: parts[off + 13] || null,
    alertPattern: parts[off + 14] || null,
    rawParts: parts,
  };
}

/**
 * Build TON (Tone-Out settings) write command (XT-family format, verified approach
 * against FreeSCAN which programs the BCT15X with this layout)
 * @param {Object} ton - Tone-out channel object
 * @returns {string} Command string
 */
function buildTonCommand(ton) {
  const name = (ton.name || '').substring(0, 16);
  const rawFreq = ton.rawFrequency || toRawFrequency(ton.frequency);
  const mod = ton.modulation || 'FM';
  const att = ton.attenuator ? '1' : '0';
  const dly = ton.delay !== undefined ? ton.delay : 2;
  const alertTone = ton.alertTone !== undefined ? ton.alertTone : 0;
  const alertLevel = ton.alertLevel !== undefined ? ton.alertLevel : 0;
  const toneA = ton.toneA ? Math.round(parseFloat(ton.toneA) * 10) : 0;
  const toneB = ton.toneB ? Math.round(parseFloat(ton.toneB) * 10) : 0;
  const color = ton.alertColor || 'OFF';
  const pattern = ton.alertPattern !== undefined ? ton.alertPattern : 0;
  const agc = ton.agc !== undefined ? ton.agc : 1;
  return `TON,${ton.id},${name},${rawFreq},${mod},${att},${dly},${alertTone},${alertLevel},${toneA},,${toneB},,,,${color},${pattern},${agc},,`;
}

/**
 * Parse GDO (GPS display settings) response
 * Verified on BCT15X: GDO,0,0,0,-10.0,DMS
 * @param {string} response - Response string
 * @returns {Object|null}
 */
function parseGdoResponse(response) {
  const parts = response.trim().split(',');
  if (parts[0] !== 'GDO' || parts.length < 6) {
    return null;
  }
  return {
    displayMode: parseInt(parts[1], 10) || 0,
    metric: parts[2] === '1',
    hour24: parts[3] === '1',
    timeZone: parts[4] || '0.0',
    coordinateFormat: parts[5] || 'DMS',
    rawParts: parts,
  };
}

/**
 * Build GDO (GPS display settings) write command
 * @param {Object} gdo - GPS settings object
 * @returns {string} Command string
 */
function buildGdoCommand(gdo) {
  const disp = gdo.displayMode !== undefined ? gdo.displayMode : 0;
  const metric = gdo.metric ? '1' : '0';
  const hour24 = gdo.hour24 ? '1' : '0';
  const tz = gdo.timeZone !== undefined ? gdo.timeZone : '0.0';
  const fmt = gdo.coordinateFormat || 'DMS';
  return `GDO,${disp},${metric},${hour24},${tz},${fmt}`;
}

/**
 * Parse MNU (direct menu jump) response
 * @param {string} response - "MNU,OK" / "MNU,NG" / "ERR"
 * @returns {boolean} True when the menu jump was accepted
 */
function parseMnuResponse(response) {
  return response.trim().startsWith('MNU,OK');
}

/**
 * Parse AGC (Append Group Channel) response
 * @param {string} response - "AGC,[GRP_INDEX]"
 * @returns {number} Created group index (-1 on failure)
 */
function parseAgcResponse(response) {
  const parts = response.trim().split(',');
  if (parts[0] === 'AGC' && parts.length >= 2) {
    return parseInt(parts[1], 10);
  }
  return -1;
}

/**
 * Parse ACC (Append Channel) response
 * @param {string} response - "ACC,[CHN_INDEX]"
 * @returns {number} Created channel index (-1 on failure)
 */
function parseAccResponse(response) {
  const parts = response.trim().split(',');
  if (parts[0] === 'ACC' && parts.length >= 2) {
    return parseInt(parts[1], 10);
  }
  return -1;
}

/**
 * Build SIN configuration command string
 * @param {Object} sys - System data object
 * @returns {string} Command string
 */
function buildSinCommand(sys) {
  const qk = sys.quickKey !== null && sys.quickKey !== undefined ? sys.quickKey : '.';
  const hld = sys.holdTime !== undefined ? sys.holdTime : 2;
  const lout = sys.lockout ? '1' : '0';
  const dly = sys.delay !== undefined ? sys.delay : 2;
  const name = (sys.name || '').substring(0, 16);
  // SIN,[INDEX],[NAME],[QUICK_KEY],[HLD],[LOUT],[DLY],[RSV],[RSV],[RSV],[RSV],[RSV],[START_KEY],[RECORD],[RSV],[RSV],[RSV],[RSV],[STATE],[NUMBER_TAG],[RSV],[RSV],[RSV]
  return `SIN,${sys.id},${name},${qk},${hld},${lout},${dly},,,,,.,0,,,,00,NONE,,,`;
}

/**
 * Build GIN configuration command string
 * @param {Object} grp - Group data object
 * @returns {string} Command string
 */
function buildGinCommand(grp) {
  const qk = grp.quickKey !== null && grp.quickKey !== undefined ? (grp.quickKey === 10 ? '0' : grp.quickKey) : '.';
  const lout = grp.lockout ? '1' : '0';
  const name = (grp.name || '').substring(0, 16);
  // GIN,[GRP_INDEX],[NAME],[QUICK_KEY],[LOUT],[LATITUDE],[LONGITUDE],[RANGE],[GPS ENABLE]
  return `GIN,${grp.id},${name},${qk},${lout},,,,,0`;
}

/**
 * Build CIN configuration command string
 * @param {Object} chn - Channel data object
 * @returns {string} Command string
 */
function buildCinCommand(chn) {
  const name = (chn.name || '').substring(0, 16);
  const rawFreq = chn.rawFrequency || toRawFrequency(chn.frequency);
  const mod = chn.modulation || 'AUTO';
  const toneCode = chn.toneCode !== undefined ? chn.toneCode : toToneCode(chn.tone);
  const tlock = chn.toneLockout ? '1' : '0';
  const lout = chn.lockout ? '1' : '0';
  const pri = chn.priority ? '1' : '0';
  const att = chn.attenuator ? '1' : '0';
  const alt = chn.alertTone !== undefined ? chn.alertTone : 0;
  const altl = chn.alertLevel !== undefined ? chn.alertLevel : 'AUTO';
  // CIN,[INDEX],[NAME],[FRQ],[MOD],[CTCSS/DCS],[TLOCK],[LOUT],[PRI],[ATT],[ALT],[ALTL],[RECORD],[RSV],[RSV],[NUMBER_TAG],[RSV],[ALT_PATTERN],[VOL_OFFSET]
  return `CIN,${chn.id},${name},${rawFreq},${mod},${toneCode},${tlock},${lout},${pri},${att},${alt},${altl},0,,,NONE,,0,0`;
}

module.exports = {
  SystemTypes,
  Modulations,
  CTCSS_DCS_TABLE,
  REVERSE_CTCSS_DCS_TABLE,
  toRawFrequency,
  fromRawFrequency,
  fromToneCode,
  toToneCode,
  parseSihResponse,
  parseSinResponse,
  parseGinResponse,
  parseCinResponse,
  parseCsyResponse,
  parseAgcResponse,
  parseAccResponse,
  buildSinCommand,
  buildGinCommand,
  buildCinCommand,
  parseShkResponse,
  parseSspResponse,
  parseCspResponse,
  buildCspCommand,
  parseCsgResponse,
  parseWxsResponse,
  parseSgpResponse,
  parseScoResponse,
  parseBbsResponse,
  parseCbpResponse,
  parseTonResponse,
  buildTonCommand,
  parseGdoResponse,
  buildGdoCommand,
  parseMnuResponse,
};
