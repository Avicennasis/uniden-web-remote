/**
 * @fileoverview スキャナー設定モジュール (トーンアウト / サーチ設定)
 * @description トーンアウト10ch (TON) とカスタム/サービスサーチ (CSP/SSP) の
 *   閲覧・編集・実機書込みを行うモーダルパネル。バックエンドは
 *   /api/scanner/toneout, /api/scanner/custom-searches, /api/scanner/service-searches。
 *   コマンド形式は BCT15X 実機プローブで検証済み (docs/protocol_probe/findings_s2.md)。
 */

const scannerSettings = (function () {
  /** @type {Array} トーンアウトチャンネル (GET /scanner/toneout の結果) */
  let toneOuts = [];

  /** @type {Array} カスタムサーチ (GET /scanner/settings の customSearches) */
  let customSearches = [];

  /** @type {Array} サービスサーチ (GET /scanner/settings の serviceSearches) */
  let serviceSearches = [];

  /** @type {string} アクティブタブ ('toneout' | 'search') */
  let activeTab = 'toneout';

  /** @type {boolean} ロード済みかどうか */
  let loaded = { toneout: false, search: false };

  /** サービスサーチの標準名称 (プロトコル上 name フィールドは返さないため) */
  const SERVICE_SEARCH_NAMES = [
    'Public Safety', 'News', 'HAM Radio', 'Marine', 'Railroad',
    'Air', 'CB Radio', 'FRS/GMRS', 'Racing', 'TV Broadcast',
  ];

  /** ステップ選択肢 (kHz) */
  const STEP_OPTIONS = ['AUTO', '5', '6.25', '7.5', '8.33', '10', '12.5', '15', '20', '25', '50', '100'];

  /** 変調選択肢 */
  const MOD_OPTIONS = ['AUTO', 'AM', 'FM', 'NFM', 'WFM', 'FMB'];

  /**
   * i18n ヘルパー (フォールバック付き)
   */
  function t(key, params = {}, fallback = '') {
    if (typeof i18n !== 'undefined') {
      const res = i18n.t(key, params);
      if (res !== key) return res;
    }
    if (params && typeof params === 'object' && fallback) {
      return fallback.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
    }
    return fallback || key;
  }

  /**
   * モーダルを開く
   */
  function open() {
    const modal = document.getElementById('modal-scanner-settings');
    if (modal) modal.classList.remove('hidden');
    reload();
  }

  /**
   * モーダルを閉じる
   */
  function close() {
    const modal = document.getElementById('modal-scanner-settings');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * タブ切替
   * @param {string} tab - 'toneout' | 'search'
   */
  function switchTab(tab) {
    activeTab = tab;
    document.getElementById('settings-tab-toneout').classList.toggle('active', tab === 'toneout');
    document.getElementById('settings-tab-search').classList.toggle('active', tab === 'search');
    document.getElementById('settings-panel-toneout').classList.toggle('hidden', tab !== 'toneout');
    document.getElementById('settings-panel-search').classList.toggle('hidden', tab !== 'search');
    if (!loaded[tab]) reload();
  }

  /**
   * 現在のタブのデータを読み直す
   */
  async function reload() {
    if (activeTab === 'toneout') {
      await loadToneOuts();
    } else {
      await loadSearchSettings();
    }
  }

  /**
   * トーンアウト設定を読み込んで描画
   */
  async function loadToneOuts() {
    setStatus('toneout-status', t('settings.statusLoading', {}, '読み込み中...'), 'info');
    try {
      const data = await app.fetchApi('/scanner/toneout');
      toneOuts = data.toneOuts || [];
      renderToneOuts();
      loaded.toneout = true;
      setStatus('toneout-status', '', '');
    } catch (err) {
      setStatus('toneout-status', t('settings.statusLoadError', { error: err.message }, '読み込み失敗: {error}'), 'error');
    }
  }

  /**
   * サーチ設定を読み込んで描画
   */
  async function loadSearchSettings() {
    setStatus('search-status', t('settings.statusLoading', {}, '読み込み中...'), 'info');
    try {
      const data = await app.fetchApi('/scanner/settings');
      customSearches = data.customSearches || [];
      serviceSearches = data.serviceSearches || [];
      renderCustomSearches();
      renderServiceSearches();
      loaded.search = true;
      setStatus('search-status', '', '');
    } catch (err) {
      setStatus('search-status', t('settings.statusLoadError', { error: err.message }, '読み込み失敗: {error}'), 'error');
    }
  }

  /**
   * トーンアウトテーブル描画
   */
  function renderToneOuts() {
    const tbody = document.getElementById('toneout-tbody');
    tbody.innerHTML = '';
    toneOuts.forEach((ch) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="settings-rownum">${ch.id}</td>
        <td><input type="text" class="settings-input" data-field="name" data-id="${ch.id}" value="${escapeAttr(ch.name)}" maxlength="16"></td>
        <td><input type="text" class="settings-input settings-input-freq" data-field="frequency" data-id="${ch.id}" value="${escapeAttr(ch.frequency)}"></td>
        <td><input type="text" class="settings-input settings-input-num" data-field="toneA" data-id="${ch.id}" value="${ch.toneA || 0}"></td>
        <td><input type="text" class="settings-input settings-input-num" data-field="toneB" data-id="${ch.id}" value="${ch.toneB || 0}"></td>
        <td><input type="text" class="settings-input settings-input-num" data-field="delay" data-id="${ch.id}" value="${ch.delay}"></td>`;
      tbody.appendChild(tr);
    });
  }

  /**
   * カスタムサーチテーブル描画
   */
  function renderCustomSearches() {
    const tbody = document.getElementById('csp-tbody');
    tbody.innerHTML = '';
    customSearches.forEach((csp) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="settings-rownum">${csp.id}</td>
        <td><input type="text" class="settings-input" data-field="name" data-id="${csp.id}" value="${escapeAttr(csp.name)}" maxlength="16"></td>
        <td><input type="text" class="settings-input settings-input-freq" data-field="lowerFrequency" data-id="${csp.id}" value="${escapeAttr(csp.lowerFrequency)}"></td>
        <td><input type="text" class="settings-input settings-input-freq" data-field="upperFrequency" data-id="${csp.id}" value="${escapeAttr(csp.upperFrequency)}"></td>
        <td>${buildSelect('step', csp.id, STEP_OPTIONS, csp.step)}</td>
        <td>${buildSelect('modulation', csp.id, MOD_OPTIONS, csp.modulation)}</td>
        <td><input type="text" class="settings-input settings-input-num" data-field="delay" data-id="${csp.id}" value="${csp.delay}"></td>
        <td class="settings-check"><input type="checkbox" data-field="lockout" data-id="${csp.id}" ${csp.lockout ? 'checked' : ''}></td>`;
      tbody.appendChild(tr);
    });
  }

  /**
   * サービスサーチテーブル描画
   */
  function renderServiceSearches() {
    const tbody = document.getElementById('ssp-tbody');
    tbody.innerHTML = '';
    serviceSearches.forEach((ssp) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="settings-rownum">${ssp.id}</td>
        <td class="settings-name">${escapeHtml(SERVICE_SEARCH_NAMES[ssp.id - 1] || ssp.name || `Service ${ssp.id}`)}</td>
        <td><input type="text" class="settings-input settings-input-num" data-field="delay" data-id="${ssp.id}" value="${ssp.delay}"></td>
        <td class="settings-check"><input type="checkbox" data-field="lockout" data-id="${ssp.id}" ${ssp.lockout ? 'checked' : ''}></td>`;
      tbody.appendChild(tr);
    });
  }

  /**
   * セレクトボックス生成
   */
  function buildSelect(field, id, options, current) {
    const opts = options.map((o) => `<option value="${o}" ${o === current ? 'selected' : ''}>${o}</option>`).join('');
    return `<select class="settings-select" data-field="${field}" data-id="${id}">${opts}</select>`;
  }

  /**
   * テーブルから指定フィールドの入力値を収集
   * @param {string} tbodyId - tbody の id
   * @param {number} id - 行 id
   * @param {string} field - フィールド名
   */
  function collectField(tbodyId, id, field) {
    const el = document.querySelector(`#${tbodyId} [data-field="${field}"][data-id="${id}"]`);
    if (!el) return undefined;
    if (el.type === 'checkbox') return el.checked;
    return el.value;
  }

  /**
   * 現在のタブを保存
   */
  async function save() {
    if (activeTab === 'toneout') {
      await saveToneOuts();
    } else {
      await saveSearches();
    }
  }

  /**
   * トーンアウト保存
   */
  async function saveToneOuts() {
    const statusId = 'toneout-status';
    setStatus(statusId, t('settings.statusSaving', {}, '実機へ書き込み中... (PRGモード)'), 'info');
    try {
      const payload = toneOuts.map((ch) => {
        const frequency = String(collectField('toneout-tbody', ch.id, 'frequency')).trim();
        const toneA = parseFloat(collectField('toneout-tbody', ch.id, 'toneA')) || 0;
        const toneB = parseFloat(collectField('toneout-tbody', ch.id, 'toneB')) || 0;
        if (!/^\d{2,3}\.\d{3,4}$/.test(frequency)) {
          throw new Error(t('settings.errFreq', { id: ch.id, freq: frequency }, 'ch{id}: 周波数の形式が不正です ({freq})。例: 154.1900'));
        }
        if (toneA < 0 || toneA > 9999.9 || toneB < 0 || toneB > 9999.9) {
          throw new Error(t('settings.errTone', { id: ch.id }, 'ch{id}: トーンは 0〜9999.9 Hz の範囲で入力してください'));
        }
        return {
          id: ch.id === 10 ? 0 : ch.id,
          name: String(collectField('toneout-tbody', ch.id, 'name')).trim(),
          frequency,
          modulation: ch.modulation || 'FM',
          delay: parseInt(collectField('toneout-tbody', ch.id, 'delay'), 10) || 2,
          toneA,
          toneB,
        };
      });
      const result = await app.fetchApi('/scanner/toneout', {
        method: 'POST',
        body: JSON.stringify({ toneOuts: payload }),
      });
      setStatus(statusId, t('settings.statusSaved', { count: result.written }, '実機へ書き込みました ({count}件)'), 'success');
    } catch (err) {
      setStatus(statusId, t('settings.statusSaveError', { error: err.message }, '書き込み失敗: {error}'), 'error');
    }
  }

  /**
   * サーチ設定保存 (CSP + SSP)
   */
  async function saveSearches() {
    const statusId = 'search-status';
    setStatus(statusId, t('settings.statusSaving', {}, '実機へ書き込み中... (PRGモード)'), 'info');
    try {
      const cspPayload = customSearches.map((csp) => {
        const lowerFrequency = String(collectField('csp-tbody', csp.id, 'lowerFrequency')).trim();
        const upperFrequency = String(collectField('csp-tbody', csp.id, 'upperFrequency')).trim();
        if (!/^\d{2,3}\.\d{3,4}$/.test(lowerFrequency) || !/^\d{2,3}\.\d{3,4}$/.test(upperFrequency)) {
          throw new Error(t('settings.errFreq', { id: ` (${csp.name})`, freq: `${lowerFrequency}-${upperFrequency}` }, 'カスタム{id}: 周波数の形式が不正です ({freq})'));
        }
        if (parseFloat(lowerFrequency) >= parseFloat(upperFrequency)) {
          throw new Error(t('settings.errRange', { id: csp.id }, 'カスタム{id}: 下限は上限より小さくしてください'));
        }
        return {
          name: String(collectField('csp-tbody', csp.id, 'name')).trim(),
          lowerFrequency,
          upperFrequency,
          step: collectField('csp-tbody', csp.id, 'step'),
          modulation: collectField('csp-tbody', csp.id, 'modulation'),
          delay: parseInt(collectField('csp-tbody', csp.id, 'delay'), 10) || 2,
          lockout: collectField('csp-tbody', csp.id, 'lockout'),
        };
      });
      const sspPayload = serviceSearches.map((ssp) => ({
        id: ssp.id,
        delay: parseInt(collectField('ssp-tbody', ssp.id, 'delay'), 10) || 2,
        lockout: collectField('ssp-tbody', ssp.id, 'lockout'),
      }));

      const cspResult = await app.fetchApi('/scanner/custom-searches', {
        method: 'POST',
        body: JSON.stringify({ customSearches: cspPayload }),
      });
      const sspResult = await app.fetchApi('/scanner/service-searches', {
        method: 'POST',
        body: JSON.stringify({ serviceSearches: sspPayload }),
      });
      setStatus(
        statusId,
        t('settings.statusSavedSearch', { csp: cspResult.written, ssp: sspResult.written }, '実機へ書き込みました (カスタム{csp}件 / サービス{ssp}件)'),
        'success'
      );
    } catch (err) {
      setStatus(statusId, t('settings.statusSaveError', { error: err.message }, '書き込み失敗: {error}'), 'error');
    }
  }

  /**
   * 本体メニューへダイレクトジャンプ (MNU)
   * @param {string} menu - メニュー名 (SVC_MENU 等)
   */
  async function jump(menu) {
    try {
      const result = await app.fetchApi('/scanner/menu-jump', {
        method: 'POST',
        body: JSON.stringify({ menu }),
      });
      if (!result.ok) {
        console.warn('[ScannerSettings] menu-jump failed:', result.response);
      }
    } catch (err) {
      console.error('[ScannerSettings] menu-jump error:', err.message);
    }
  }

  /**
   * ステータス表示
   * @param {string} elementId - 要素 id
   * @param {string} message - メッセージ
   * @param {string} kind - 'info' | 'success' | 'error' | ''
   */
  function setStatus(elementId, message, kind) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `settings-status${kind ? ' status-' + kind : ''}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, '&#96;');
  }

  return {
    open,
    close,
    switchTab,
    reload,
    save,
    jump,
  };
})();
