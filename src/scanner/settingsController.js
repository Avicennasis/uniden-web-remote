/**
 * @fileoverview Scanner settings controller (PRG-mode wrapped)
 * @description Reads and writes BCT15X search / tone-out / WX / SAME / GPS
 *   settings. All access is wrapped in programming mode (PRG/EPG) since these
 *   commands are only accepted while the scanner is in Program Mode.
 *   Command formats verified against real BCT15X hardware (2026-10-11 probe,
 *   see docs/protocol_probe/findings_s2.md). Note: CSC does NOT exist on the
 *   BCT15X (returns ERR) — Close Call band settings are menu-only.
 */

const {
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
} = require('./dmaProtocol');

/** Service search index order used by the scanner's 10 readable slots */
const SERVICE_SEARCH_COUNT = 10;
const CUSTOM_SEARCH_COUNT = 10;
const SAME_GROUP_COUNT = 5;
const BROADCAST_SCREEN_COUNT = 10;
const TONE_OUT_COUNT = 10;

/**
 * SettingsController class
 */
class SettingsController {
  /**
   * @param {import('./programmingController')} programmingController - Programming controller (owns PRG mode)
   */
  constructor(programmingController) {
    this.programming = programmingController;
    this.serial = programmingController.serial;
  }

  /**
   * Run a callback inside programming mode (PRG ... EPG)
   * @param {Function} fn - Async callback receiving the serial controller
   * @returns {Promise<*>} Callback result
   * @private
   */
  async _inProgramMode(fn) {
    await this.programming.enterProgramMode();
    try {
      return await fn(this.serial);
    } finally {
      await this.programming.exitProgramMode();
    }
  }

  /**
   * Read all search / close-call / WX / SAME related settings
   * @returns {Promise<Object>} Settings object
   */
  async getSearchSettings() {
    if (this.serial._mockMode) {
      return JSON.parse(JSON.stringify(this._mockSettings()));
    }

    return this._inProgramMode(async (serial) => {
      const settings = {};

      const shkRes = await serial.sendCommand('SHK');
      settings.searchKeys = parseShkResponse(shkRes);

      settings.serviceSearches = [];
      for (const idx of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
        const res = await serial.sendCommand(`SSP,${idx}`);
        const parsed = parseSspResponse(res, idx);
        if (parsed) {
          parsed.id = idx === 0 ? 10 : idx;
          settings.serviceSearches.push(parsed);
        }
      }

      settings.customSearches = [];
      for (const idx of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
        const res = await serial.sendCommand(`CSP,${idx}`);
        const parsed = parseCspResponse(res, idx);
        if (parsed) {
          parsed.id = idx === 0 ? 10 : idx;
          settings.customSearches.push(parsed);
        }
      }

      const csgRes = await serial.sendCommand('CSG');
      settings.customSearchEnabled = parseCsgResponse(csgRes);

      const wxsRes = await serial.sendCommand('WXS');
      settings.weather = parseWxsResponse(wxsRes);

      settings.sameGroups = [];
      for (let idx = 1; idx <= SAME_GROUP_COUNT; idx++) {
        const res = await serial.sendCommand(`SGP,${idx}`);
        const parsed = parseSgpResponse(res, idx);
        if (parsed) settings.sameGroups.push(parsed);
      }

      const scoRes = await serial.sendCommand('SCO');
      settings.searchOptions = parseScoResponse(scoRes);

      settings.broadcastScreen = [];
      for (const idx of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
        const res = await serial.sendCommand(`BBS,${idx}`);
        const parsed = parseBbsResponse(res, idx);
        if (parsed) {
          parsed.id = idx === 0 ? 10 : idx;
          settings.broadcastScreen.push(parsed);
        }
      }

      settings.customBandPlans = [];
      for (const idx of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
        const res = await serial.sendCommand(`CBP,${idx}`);
        const parsed = parseCbpResponse(res, idx);
        if (parsed) {
          parsed.id = idx === 0 ? 10 : idx;
          settings.customBandPlans.push(parsed);
        }
      }

      return settings;
    });
  }

  /**
   * Read all 10 tone-out channels
   * @returns {Promise<Array>} Tone-out channel array
   */
  async getToneOuts() {
    if (this.serial._mockMode) {
      return JSON.parse(JSON.stringify(this._mockSettings().toneOuts));
    }

    return this._inProgramMode(async (serial) => {
      const toneOuts = [];
      for (const idx of [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]) {
        const res = await serial.sendCommand(`TON,${idx}`);
        const parsed = parseTonResponse(res, idx);
        if (parsed) {
          parsed.id = idx === 0 ? 10 : idx;
          toneOuts.push(parsed);
        }
      }
      return toneOuts;
    });
  }

  /**
   * Write tone-out channels (accepts a subset; only provided ids are written)
   * @param {Array} toneOuts - Array of tone-out channel objects
   * @returns {Promise<Object>} {written: number}
   */
  async setToneOuts(toneOuts) {
    if (!Array.isArray(toneOuts) || toneOuts.length === 0) {
      throw new Error('toneOuts must be a non-empty array');
    }
    for (const ton of toneOuts) {
      const id = parseInt(ton.id, 10);
      if (isNaN(id) || id < 0 || id > 9) {
        throw new Error(`Invalid tone-out id: ${ton.id} (expected 1-9 or 0 for the 10th)`);
      }
    }

    if (this.serial._mockMode) {
      console.log('[SettingsController] [MOCK] Wrote', toneOuts.length, 'tone-out channels');
      return { written: toneOuts.length, mock: true };
    }

    return this._inProgramMode(async (serial) => {
      let written = 0;
      for (const ton of toneOuts) {
        const res = await serial.sendCommand(buildTonCommand({ ...ton, id: parseInt(ton.id, 10) }));
        if (!res.includes('OK')) {
          throw new Error(`TON write failed for id ${ton.id}: ${res}`);
        }
        written++;
      }
      return { written };
    });
  }

  /**
   * Read GPS display settings (GDO)
   * @returns {Promise<Object>} GPS settings
   */
  async getGpsSettings() {
    if (this.serial._mockMode) {
      return { displayMode: 0, metric: false, hour24: false, timeZone: '0.0', coordinateFormat: 'DMS' };
    }

    return this._inProgramMode(async (serial) => {
      const res = await serial.sendCommand('GDO');
      return parseGdoResponse(res);
    });
  }

  /**
   * Write GPS display settings (GDO)
   * @param {Object} gdo - GPS settings object
   * @returns {Promise<Object>} {ok: true}
   */
  async setGpsSettings(gdo) {
    if (this.serial._mockMode) {
      console.log('[SettingsController] [MOCK] Wrote GPS settings');
      return { ok: true, mock: true };
    }

    return this._inProgramMode(async (serial) => {
      const res = await serial.sendCommand(buildGdoCommand(gdo || {}));
      if (!res.includes('OK')) {
        throw new Error(`GDO write failed: ${res}`);
      }
      return { ok: true };
    });
  }

  /**
   * Write custom search settings (CSP) for provided entries, optionally with
   * the CSG enable mask
   * @param {Array} customSearches - Array of custom search objects
   * @param {boolean[]} [enabled] - Optional CSG enable flags (10 entries)
   * @returns {Promise<Object>} {written: number}
   */
  async setCustomSearches(customSearches, enabled) {
    if ((!Array.isArray(customSearches) || customSearches.length === 0) && !enabled) {
      throw new Error('customSearches or enabled is required');
    }

    if (this.serial._mockMode) {
      console.log('[SettingsController] [MOCK] Wrote', customSearches.length, 'custom searches');
      return { written: customSearches.length, mock: true };
    }

    return this._inProgramMode(async (serial) => {
      let written = 0;
      for (const csp of customSearches || []) {
        const res = await serial.sendCommand(buildCspCommand(csp));
        if (!res.includes('OK')) {
          throw new Error(`CSP write failed for ${csp.name}: ${res}`);
        }
        written++;
      }
      if (Array.isArray(enabled)) {
        const mask = enabled.slice(0, 10).map((e) => (e ? '0' : '1')).join('').padEnd(10, '1');
        const res = await serial.sendCommand(`CSG,${mask}`);
        if (!res.includes('OK')) {
          throw new Error(`CSG write failed: ${res}`);
        }
      }
      return { written };
    });
  }

  /**
   * Write service search settings (SSP) for provided entries
   * Format verified on BCT15X read: SSP echoes the index; write follows the doc layout
   * @param {Array} serviceSearches - Array of service search objects
   * @returns {Promise<Object>} {written: number}
   */
  async setServiceSearches(serviceSearches) {
    if (!Array.isArray(serviceSearches) || serviceSearches.length === 0) {
      throw new Error('serviceSearches must be a non-empty array');
    }
    for (const ssp of serviceSearches) {
      const id = parseInt(ssp.id, 10);
      if (isNaN(id) || id < 1 || id > 10) {
        throw new Error(`Invalid service search id: ${ssp.id} (expected 1-10)`);
      }
    }

    if (this.serial._mockMode) {
      console.log('[SettingsController] [MOCK] Wrote', serviceSearches.length, 'service searches');
      return { written: serviceSearches.length, mock: true };
    }

    return this._inProgramMode(async (serial) => {
      let written = 0;
      for (const ssp of serviceSearches) {
        const id = parseInt(ssp.id, 10);
        const wireId = id === 10 ? 0 : id;
        const dly = ssp.delay !== undefined ? ssp.delay : 2;
        const att = ssp.attenuator ? '1' : '0';
        const hld = ssp.holdTime !== undefined ? ssp.holdTime : 2;
        const lout = ssp.lockout ? '1' : '0';
        const qk = ssp.quickKey !== null && ssp.quickKey !== undefined ? ssp.quickKey : '.';
        const start = ssp.startKey || '.';
        const rec = ssp.record ? '1' : '0';
        const res = await serial.sendCommand(`SSP,${wireId},${dly},${att},${hld},${lout},${qk},${start},${rec}`);
        if (!res.includes('OK')) {
          throw new Error(`SSP write failed for id ${id}: ${res}`);
        }
        written++;
      }
      return { written };
    });
  }

  /**
   * Mock settings data (UI development without hardware)
   * @returns {Object}
   * @private
   */
  _mockSettings() {
    return {
      searchKeys: { searchKey1: 'CUSTOM_1', searchKey2: 'PublicSafety', searchKey3: 'B_SCOPE' },
      serviceSearches: [],
      customSearches: [
        {
          id: 1, name: 'Custom 1', lowerFrequency: '25.0000', upperFrequency: '27.9999',
          step: 'AUTO', modulation: 'AUTO', attenuator: false, delay: 2, dataSkip: false,
          holdTime: 2, lockout: false, controlChannelOnly: false, quickKey: null, startKey: null, record: false,
        },
      ],
      customSearchEnabled: { enabled: [true, true, true, true, true, true, true, true, true, true] },
      weather: { delay: 2, attenuator: false, alertPriority: false, record: false },
      sameGroups: [{ id: 1, name: 'SAME 1', fipsCodes: [null, null, null, null, null, null, null, null] }],
      searchOptions: { step: 'AUTO', modulation: 'AUTO', attenuator: false, delay: 2, repeaterFind: true, bandMask: '0001101111111111', maxAutoStore: 100, record: false },
      broadcastScreen: [],
      customBandPlans: [{ id: 1, standard: true }],
      toneOuts: [
        {
          id: 1, name: 'Tone-Out 1', frequency: '137.0000', modulation: 'FM', attenuator: false,
          delay: 2, alertTone: 0, alertLevel: 0, toneA: 0, toneB: 0, record: false,
        },
      ],
    };
  }
}

module.exports = SettingsController;
