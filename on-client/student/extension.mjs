// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
// 13단계 · 로그인 사용자·기기·세션 표시에 쓰는 보조 값과 함수입니다. DOM은 createElement 와 textContent 로만 만듭니다.
const DEVICE_STATUS = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
const SESSION_STATUS = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
const MODE_NOTICE = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
// 서버가 응답 형식이나 엔진 결과를 확인하지 못했다는 오류 코드: 연결 실패가 아니라 확인 불가로 안내합니다.
const UNVERIFIED_CODES = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'];

function text(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value;
  return node;
}

// 값(상태)을 글자로 구분합니다. 색만으로 구분하지 않으며, 기준 미충족·만료·철회됨은 정상처럼 보이지 않게 오류 모양으로, 확인 불가는 별도 모양으로 보입니다.
function statusTag(labels, value, goodValue) {
  const label = Object.prototype.hasOwnProperty.call(labels, value) ? labels[value] : labels.unknown;
  const kind = value === goodValue ? 'state-ok' : label === labels.unknown ? 'state-empty' : 'state-error';
  return text('span', `state ${kind}`, label);
}

function nameWithId(entry) {
  const label = typeof entry?.label === 'string' ? entry.label : '';
  const id = typeof entry?.id === 'string' ? entry.id : '';
  if (label && id && label !== id) return `${label} (${id})`;
  return label || id || '확인 불가';
}

function row(term, ...values) {
  const group = document.createElement('div');
  group.append(text('dt', '', term));
  const detail = document.createElement('dd');
  for (const value of values) detail.append(value, ' ');
  group.append(detail);
  return group;
}

// 자료 하나(me·devices·sessions)의 loading / ok / error 를 각각 처리합니다. 모드 안내는 loading·error 에서도 받은 값이면 함께 보입니다.
function section(title, resource, renderOk) {
  const box = document.createElement('div');
  box.append(text('h3', '', title));
  const mode = resource?.mode;
  if (typeof mode === 'string' && Object.prototype.hasOwnProperty.call(MODE_NOTICE, mode)) {
    box.append(text('p', mode === 'demo' ? 'tag tag-demo' : 'muted', MODE_NOTICE[mode]));
  }
  if (!resource || resource.status === 'loading') {
    box.append(text('p', 'state state-loading', '불러오는 중'));
  } else if (resource.status === 'error') {
    const unverified = UNVERIFIED_CODES.includes(resource.error?.code);
    const message = typeof resource.error?.message === 'string' && resource.error.message ? resource.error.message : '서버 메시지 없음';
    box.append(text('p', 'state state-error', `${unverified ? '확인 불가' : '연결 실패'}: ${message}`));
  } else if (resource.status === 'ok') {
    box.append(renderOk(resource.data));
  } else {
    box.append(text('p', 'state state-empty', '확인 불가'));
  }
  return box;
}

// 14단계 · 업무 앱 접속 판정 표시에 쓰는 보조 값과 함수입니다. renderIdentity 쪽 코드는 바꾸지 않습니다.
// 판정은 한국어 뜻과 원래 코드값을 함께 보여 줍니다. 네 값이 아니면 확인 불가(unknown)로 처리합니다.
const DECISION_LABEL = { allow: '허용', deny: '거부', challenge: '추가 확인 필요', unknown: '확인 불가' };
const DECISION_NOTE = {
  allow: '정책상 접근이 허용되었습니다. 실제 앱 접속 성공을 보장하는 것은 아닙니다.',
  deny: '정책상 접근이 거부되었습니다.',
  challenge: '추가 인증 또는 확인이 필요합니다. 이 앱이 확인 절차를 대신 수행하지 않습니다.',
  unknown: '판정을 확인할 수 없습니다. 접근 가능 여부를 알 수 없는 상태입니다.',
};
const DECISION_KIND = { allow: 'state-ok', deny: 'state-error', challenge: 'state-empty', unknown: 'state-empty' };

// 판정 시각은 받은 값을 그대로 쓰고, 날짜로 읽을 수 있으면 한국 시간 표기를 앞에 붙입니다.
function checkedAtText(value) {
  if (typeof value !== 'string' || !value) return '확인 불가';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (${value})`;
}

function modeLine(mode) {
  if (typeof mode === 'string' && Object.prototype.hasOwnProperty.call(MODE_NOTICE, mode)) {
    return text('p', mode === 'demo' ? 'tag tag-demo' : 'muted', MODE_NOTICE[mode]);
  }
  return null;
}

// 15단계 · 접속 기록·XDR 경보 목록과 상세 보기에 쓰는 보조 값과 함수입니다. 앞 단계 코드는 바꾸지 않습니다.
// 이 화면은 본인의 최근 기록(최대 40건)만 받습니다. 전체 직원 이력이나 실시간 탐지가 아닙니다.
const KIND_LABEL = { access: '접속', xdr: 'XDR 경보' };
const ACCESS_STATE = { allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' };
const ALL = 'all';
const NO_APP = '';

// 값의 한국어 뜻과 받은 원래 값을 함께 적습니다. 목록에 없는 값은 확인 불가로 처리하고 원래 값을 남깁니다.
function labeled(labels, value) {
  if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(labels, value)) return `${labels[value]}(${value})`;
  return `확인 불가(${typeof value === 'string' && value ? value : 'unknown'})`;
}

function appText(appId) {
  return typeof appId === 'string' && appId ? appId : '앱을 확인할 수 없음(appId 없음)';
}

function option(value, label) {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = label;
  return node;
}

function filterBox(label, options) {
  const wrap = document.createElement('label');
  wrap.append(text('span', '', `${label} `));
  const select = document.createElement('select');
  select.setAttribute('aria-label', label);
  for (const [value, name] of options) select.append(option(value, name));
  wrap.append(select);
  return { wrap, select };
}

function textList(title, rows) {
  const box = document.createElement('div');
  box.append(text('h5', '', title));
  if (!Array.isArray(rows) || rows.length === 0) {
    box.append(text('p', 'muted', '없음'));
    return box;
  }
  const list = document.createElement('ul');
  for (const entry of rows) {
    const item = document.createElement('li');
    item.append(`${typeof entry?.id === 'string' ? entry.id : '(id 없음)'}: ${typeof entry?.text === 'string' ? entry.text : ''}`);
    list.append(item);
  }
  box.append(list);
  return box;
}

// 선택한 기록 하나의 근거·규칙·세 가지 상태를 따로 보여 줍니다.
function eventDetail(event) {
  const box = document.createElement('div');
  box.setAttribute('data-student-event-detail', event.id);
  box.append(text('h4', '', `${event.id} 상세`));
  const info = document.createElement('dl');
  info.append(row('사건 ID', event.id), row('업무 앱', appText(event.appId)));
  box.append(info);
  box.append(textList('근거(evidence)', event.evidence), textList('규칙(rules)', event.rules));
  const state = document.createElement('dl');
  state.append(
    row('접속 상태(access)', labeled(ACCESS_STATE, event.state?.access)),
    row('세션 상태(session)', labeled(SESSION_STATUS, event.state?.session)),
    row('기기 상태(device)', labeled(DEVICE_STATUS, event.state?.device)),
  );
  box.append(text('h5', '', '현재 상태'), state);
  // 16단계: 연결되지 않은 조치가 전달된 경우에만 안내합니다. 비활성 버튼이라 어떤 요청도 보내지 않습니다.
  const actions = Array.isArray(event.supportedActions) ? event.supportedActions.filter((a) => typeof a === 'string' && a) : [];
  if (actions.length > 0) {
    const area = document.createElement('div');
    area.append(text('h5', '', '조치'));
    area.append(text('p', 'muted', '조치 실행 연결은 준비 중입니다. 아직 지원하지 않는 조치이며, 이 화면은 어떤 요청도 보내지 않습니다.'));
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = true;
      button.textContent = `${action} 미지원`;
      area.append(button, ' ');
    }
    box.append(area);
  }
  return box;
}

function eventsView(data) {
  // 받은 배열은 복사해서 정렬합니다. 원본 배열과 서버 데이터는 바꾸지 않습니다.
  const all = [...data].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const root = document.createElement('div');

  const kinds = [...new Set(all.map((e) => e.kind))];
  const apps = [...new Set(all.map((e) => (typeof e.appId === 'string' && e.appId ? e.appId : NO_APP)))];
  const accesses = [...new Set(all.map((e) => e.state?.access))];
  const kindFilter = filterBox('기록 종류', [[ALL, '전체'], ...kinds.map((k) => [k, labeled(KIND_LABEL, k)])]);
  const appFilter = filterBox('업무 앱', [[ALL, '전체'], ...apps.map((a) => [a, a === NO_APP ? '앱을 확인할 수 없음(appId 없음)' : a])]);
  const accessFilter = filterBox('접속 상태', [[ALL, '전체'], ...accesses.map((s) => [s, labeled(ACCESS_STATE, s)])]);
  const filters = document.createElement('div');
  filters.append(kindFilter.wrap, ' ', appFilter.wrap, ' ', accessFilter.wrap);

  const count = text('p', 'muted', '');
  const list = document.createElement('ul');
  const detailArea = document.createElement('div');
  let selectedId = null;

  function draw() {
    const shown = all.filter((e) => (kindFilter.select.value === ALL || e.kind === kindFilter.select.value)
      && (appFilter.select.value === ALL || (typeof e.appId === 'string' && e.appId ? e.appId : NO_APP) === appFilter.select.value)
      && (accessFilter.select.value === ALL || e.state?.access === accessFilter.select.value));
    // 필터로 가려진 기록의 상세는 남기지 않습니다.
    if (selectedId !== null && !shown.some((e) => e.id === selectedId)) selectedId = null;
    count.textContent = `기록 ${shown.length}건 표시 (받은 기록 ${all.length}건 중)`;
    list.replaceChildren();
    detailArea.replaceChildren();
    if (shown.length === 0) {
      list.append(text('p', 'state state-empty', '조건에 맞는 기록이 없습니다.'));
    }
    for (const event of shown) {
      const item = document.createElement('li');
      item.setAttribute('data-student-event-id', event.id);
      item.append(
        text('strong', '', event.id), ' · ',
        checkedAtText(event.at), ' · ',
        text('span', 'state state-empty', labeled(KIND_LABEL, event.kind)), ' · ',
        `앱: ${appText(event.appId)}`, ' · ',
        event.summary, ' ',
      );
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${event.id} 상세`;
      button.setAttribute('aria-expanded', event.id === selectedId ? 'true' : 'false');
      button.addEventListener('click', () => {
        selectedId = selectedId === event.id ? null : event.id;
        draw();
      });
      item.append(button);
      list.append(item);
    }
    const selected = shown.find((e) => e.id === selectedId);
    if (selected) detailArea.append(eventDetail(selected));
  }

  for (const f of [kindFilter, appFilter, accessFilter]) f.select.addEventListener('change', draw);
  root.append(filters, count, list, detailArea);
  draw();
  return root;
}

// 16단계 · 알림·빈 상태·오류·진단 정보 정리에 쓰는 보조 값과 함수입니다. 앞 단계 함수는 바꾸지 않습니다.
// 화면과 복사 내용에 열쇠·토큰 같은 값이 섞이지 않도록 한 번 더 가립니다.
const SECRET_PATTERN = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|secret|token|비밀번호|토큰)\s*[:=]\s*\S+)/gi;
const RETRY_GUIDE = '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.';

function safeText(value) {
  if (value === null || value === undefined) return '확인 불가';
  return String(value).replace(SECRET_PATTERN, '[가려짐]');
}

function isTimeout(error) {
  return typeof error?.code === 'string' && error.code.includes('TIMEOUT');
}

// 자료 하나(기기·세션·진단)의 loading / error / 빈 목록을 서로 다른 문장으로 보여 줍니다.
function statusSection(title, what, resource, renderOk, loadingText) {
  const box = document.createElement('div');
  box.append(text('h4', '', title));
  const notice = modeLine(resource?.mode);
  if (notice) box.append(notice);
  if (!resource || resource.status === 'loading') {
    box.append(text('p', 'state state-loading', loadingText || '불러오는 중'));
  } else if (resource.status === 'error') {
    const unverified = UNVERIFIED_CODES.includes(resource.error?.code);
    const message = safeText(typeof resource.error?.message === 'string' && resource.error.message ? resource.error.message : '서버 메시지 없음');
    const head = unverified ? `${what} 조회 결과 확인 불가` : isTimeout(resource.error) ? `${what} 조회 시간 초과` : `${what} 조회 실패`;
    box.append(text('p', 'state state-error', `${head}: ${message}`));
    box.append(text('p', 'muted', RETRY_GUIDE));
  } else if (resource.status === 'ok') {
    box.append(renderOk(resource.data));
  } else {
    box.append(text('p', 'state state-empty', '아직 불러오지 않았습니다'));
  }
  return box;
}

// 진단 정보 중 안내에 있는 여섯 값만 고릅니다. 나머지 값은 화면에도 복사 내용에도 넣지 않습니다.
function diagnosticFields(data) {
  return [
    ['requestId', data?.requestId],
    ['component', data?.component],
    ['version', data?.version],
    ['checkedAt', data?.checkedAt],
    ['engine.mode', data?.engine?.mode],
    ['engine.code', data?.engine?.code],
  ].map(([name, value]) => [name, safeText(value)]);
}

function copyButton(diagnostics) {
  const wrap = document.createElement('div');
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '도움정보 복사';
  const result = text('p', 'muted', '');
  const ready = diagnostics?.status === 'ok' && diagnostics.data && typeof diagnostics.data === 'object';
  button.disabled = !ready;
  wrap.append(button, text('p', 'muted', ready
    ? '도움 요청에 쓸 위의 여섯 값만 복사합니다. 사용자가 누를 때만 복사하며 어디에도 자동으로 전송하지 않습니다.'
    : '도움정보를 먼저 불러와야 복사할 수 있습니다. 위 제공 화면의 「도움정보 불러오기」를 직접 누르세요.'), result);
  if (ready) {
    const copied = diagnosticFields(diagnostics.data).map(([name, value]) => `${name}: ${value}`).join('\n');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copied);
        result.textContent = '도움정보를 복사했습니다. 붙여 넣기 전에 열쇠·비밀번호가 없는지 직접 읽어 보세요.';
      } catch {
        result.textContent = '복사하지 못했습니다. 브라우저가 복사를 허용하지 않았습니다. 위 값을 직접 선택해 복사하세요.';
      }
    });
  }
  return wrap;
}

// 17단계 · 앱 내부 AI 연결 상태 표시에 쓰는 보조 값과 함수입니다. 앞 단계 함수는 바꾸지 않습니다.
// 연결 점검(모델 목록 응답)과 실제 사건 설명 실행은 서로 다른 일입니다. 오류는 제공 코드가 안전하게 바꿔 준 code·message만 씁니다.
const AI_CAUSES = [
  { title: '권한 준비 중 또는 확인 불가', guide: '담당자에게 계정 연결과 앱 권한 확인을 요청하세요. 학생 잘못이 아니라 운영 측 준비가 끝나지 않았거나 확인할 수 없는 상태입니다.',
    codes: ['ON_AI_PROVISIONING_PENDING', 'AI_REQUEST_UNVERIFIED', 'ON_AI_AUTHORIZATION_CHANGED', 'SUBJECT_SCOPE_UNVERIFIED', 'ON_AI_INVALID_INPUT', 'ON_AI_INVALID_OUTPUT'] },
  { title: '인증 실패', guide: '계정 연결을 다시 확인하고, 계속되면 담당자에게 확인하세요.', codes: ['WB_CLCO_AUTH_REQUIRED'] },
  { title: '접근 제한', guide: '학생 앱 AI 이용이 제한된 상태입니다. 담당자에게 확인하세요.', codes: ['WB_CLCO_ACCESS_BLOCKED'] },
  { title: '사용량·이용 한도', guide: '담당자에게 확인하세요.', codes: ['WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_LIMIT_REACHED'] },
  { title: '이용 시간 아님', guide: '이용 시간을 확인하세요.', codes: ['WB_CLCO_SESSION_CLOSED'] },
  { title: '요청 제한', guide: '잠시 뒤 직접 다시 점검하세요.', codes: ['WB_CLCO_RATE_LIMITED'] },
  { title: '시간 초과', guide: '잠시 뒤 직접 다시 점검하세요.', codes: ['WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT'] },
  { title: '네트워크 오류', guide: '앱 서버가 켜져 있는지 확인한 뒤 잠시 뒤 직접 다시 점검하세요.', codes: ['NETWORK_ERROR'] },
  { title: '취소됨', guide: '요청을 취소했습니다. 이전 결과는 현재 결과가 아닙니다.', codes: ['WB_CLCO_CANCELLED', 'CANCELLED', 'REQUEST_CANCELLED'] },
  { title: '쓸 수 있는 모델 없음', guide: '담당자에게 모델 허용 설정 확인을 요청하세요.', codes: ['ON_AI_MODEL_LIST_EMPTY', 'MODEL_NOT_CONFIGURED'] },
];

function aiCause(code) {
  return AI_CAUSES.find((cause) => cause.codes.includes(code))
    || { title: '확인 불가', guide: '원인을 확인할 수 없습니다. 담당자에게 확인하세요.' };
}

// 오류 하나를 원인·code·message·안내로 나눠 보여 줍니다. 열쇠·원문 오류는 쓰지 않습니다.
function aiErrorBox(error, heading) {
  const code = typeof error?.code === 'string' && error.code ? error.code : 'UNKNOWN';
  const cause = aiCause(code);
  const box = document.createElement('div');
  box.append(text('p', 'state state-error', `${heading}: ${cause.title}`));
  const list = document.createElement('dl');
  list.append(row('code', safeText(code)), row('message', safeText(error?.message ?? '서버 메시지 없음')), row('안내', cause.guide));
  box.append(list);
  return box;
}

export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      // 호출마다 새 요소를 만들어 돌려주므로 이전 사용자·기기·세션 DOM이 남지 않습니다. 이 함수는 이전 값을 따로 보관하지 않습니다.
      const root = document.createElement('div');
      root.append(
        section('현재 계정·기기·세션', me, (data) => {
          if (!data?.user || !data?.device || !data?.session) return text('p', 'state state-empty', '확인 불가');
          const list = document.createElement('dl');
          list.append(
            row('사용자', nameWithId(data.user)),
            row('기기', nameWithId(data.device), statusTag(DEVICE_STATUS, data.device.status, 'compliant')),
            row('세션', typeof data.session.id === 'string' && data.session.id ? data.session.id : '확인 불가', statusTag(SESSION_STATUS, data.session.status, 'active')),
          );
          return list;
        }),
        section('내 기기 목록', devices, (data) => {
          if (!Array.isArray(data) || data.length === 0) return text('p', 'state state-empty', '표시할 기기가 없습니다.');
          const list = document.createElement('ul');
          for (const device of data) {
            const item = document.createElement('li');
            item.append(nameWithId(device), ' ', statusTag(DEVICE_STATUS, device?.status, 'compliant'));
            list.append(item);
          }
          return list;
        }),
        section('내 세션 목록', sessions, (data) => {
          if (!Array.isArray(data) || data.length === 0) return text('p', 'state state-empty', '표시할 세션이 없습니다.');
          const list = document.createElement('ul');
          for (const session of data) {
            const item = document.createElement('li');
            item.append(typeof session?.id === 'string' && session.id ? session.id : '확인 불가', ' ', statusTag(SESSION_STATUS, session?.status, 'active'));
            list.append(item);
          }
          return list;
        }),
      );
      return root;
    },
    renderDecision({ status, mode, data, error, appId } = {}) {
      // 호출마다 새 요소를 만들어 돌려주므로 이전 앱의 판정이 남지 않습니다. 이 함수는 이전 값을 따로 보관하지 않습니다.
      const root = document.createElement('div');
      root.append(text('h3', '', '업무 앱 접속 판정'));
      const notice = modeLine(mode);
      if (notice) root.append(notice);
      const app = typeof appId === 'string' && appId ? appId : typeof data?.appId === 'string' ? data.appId : '';

      if (status === 'idle' || (!status && !data && !error)) {
        root.append(text('p', 'state state-empty', '앱을 골라 접속을 요청하세요'));
      } else if (status === 'loading') {
        if (app) root.append(text('p', 'muted', `대상 앱: ${app}`));
        root.append(text('p', 'state state-loading', '판정 확인 중'));
      } else if (status === 'error') {
        // 요청 실패는 서버가 접근을 거부한 판정이 아닙니다. 이전 판정도 보이지 않게 합니다.
        const unverified = UNVERIFIED_CODES.includes(error?.code);
        const message = typeof error?.message === 'string' && error.message ? error.message : '서버 메시지 없음';
        if (app) root.append(text('p', 'muted', `대상 앱: ${app}`));
        root.append(text('p', 'state state-error', `${unverified ? '확인 불가' : '요청 실패'}: ${message}`));
        root.append(text('p', 'muted', '이 화면은 접근 거부 판정이 아닙니다. 접근 가능 여부를 확인하지 못한 상태입니다.'));
      } else if (status === 'ok' && data && typeof data === 'object') {
        const known = Object.prototype.hasOwnProperty.call(DECISION_LABEL, data.decision);
        const code = known ? data.decision : 'unknown';
        const list = document.createElement('dl');
        list.append(
          row('대상 앱', app || '확인 불가'),
          row('판정', text('span', `state ${DECISION_KIND[code]}`, `${DECISION_LABEL[code]}(${code})`)),
          row('설명', DECISION_NOTE[code]),
          row('판정 이유', typeof data.reason === 'string' && data.reason ? data.reason : '이유 정보 없음'),
          row('판정 시각', checkedAtText(data.checkedAt)),
        );
        // 목록에 없는 값은 확인 불가로 처리하되, 받은 원래 값도 글자로 남깁니다.
        if (!known && data.decision !== undefined) list.append(row('받은 값', String(data.decision)));
        root.append(list);
      } else {
        root.append(text('p', 'state state-empty', '확인 불가(unknown)'));
      }
      return root;
    },
    renderEvents({ status, mode, data, error } = {}) {
      // 호출마다 새 요소를 만들어 돌려주므로 이전 목록·필터·상세 선택이 남지 않습니다. 이 함수는 이전 값을 따로 보관하지 않습니다.
      const root = document.createElement('div');
      root.append(text('h3', '', '본인 접속 기록·XDR 경보'));
      const notice = modeLine(mode);
      if (notice) root.append(notice);
      if (status === 'loading' || (!status && !data && !error)) {
        root.append(text('p', 'state state-loading', '불러오는 중'));
      } else if (status === 'error') {
        // 조회 실패는 빈 목록이 아닙니다. 이전 목록은 보이지 않게 합니다.
        const unverified = UNVERIFIED_CODES.includes(error?.code);
        const message = typeof error?.message === 'string' && error.message ? error.message : '서버 메시지 없음';
        root.append(text('p', 'state state-error', `${unverified ? '확인 불가' : '기록을 불러오지 못했습니다'}: ${message}`));
        root.append(text('p', 'muted', '조회가 끝나지 않았습니다. 기록 유무를 확인하지 못한 상태입니다.'));
      } else if (status === 'ok' && Array.isArray(data)) {
        if (data.length === 0) root.append(text('p', 'state state-empty', '표시할 기록이 없습니다'));
        else root.append(eventsView(data));
      } else {
        root.append(text('p', 'state state-empty', '확인 불가(unknown)'));
      }
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      // 호출마다 새 요소를 만들어 돌려주므로 이전 오류와 목록이 남지 않습니다. 이 함수는 이전 값을 따로 보관하지 않습니다.
      const root = document.createElement('div');
      root.append(text('h3', '', '기기·세션·알림·진단 정보'));
      const overall = modeLine(mode);
      if (overall) root.append(overall);

      root.append(statusSection('등록 기기', '기기 목록', devices, (data) => {
        if (!Array.isArray(data) || data.length === 0) return text('p', 'state state-empty', '등록된 기기가 없습니다');
        const list = document.createElement('ul');
        for (const device of data) {
          const item = document.createElement('li');
          item.append(`${safeText(nameWithId(device))} `, statusTag(DEVICE_STATUS, device?.status, 'compliant'), ` (${safeText(device?.status)})`);
          list.append(item);
        }
        return list;
      }));

      root.append(statusSection('현재 세션', '세션', sessions, (data) => {
        if (!Array.isArray(data) || data.length === 0) return text('p', 'state state-empty', '현재 연결이 없습니다');
        const wrap = document.createElement('div');
        const list = document.createElement('ul');
        for (const session of data) {
          const item = document.createElement('li');
          item.append(`${safeText(typeof session?.id === 'string' && session.id ? session.id : '확인 불가')} `, statusTag(SESSION_STATUS, session?.status, 'active'), ` (${safeText(session?.status)})`);
          list.append(item);
        }
        wrap.append(list);
        return wrap;
      }));
      root.append(text('p', 'muted', '세션은 현재 검증된 연결 하나만 표시합니다. 지난 세션 목록이 아닙니다.'));

      const notificationBox = document.createElement('div');
      notificationBox.append(text('h4', '', '알림'));
      if (!Array.isArray(notifications)) {
        notificationBox.append(text('p', 'state state-empty', '알림을 확인할 수 없습니다'));
      } else if (notifications.length === 0) {
        notificationBox.append(text('p', 'state state-ok', '주의할 알림이 없습니다'));
      } else {
        const list = document.createElement('ul');
        for (const note of notifications) {
          const item = document.createElement('li');
          item.append(`자료(resource): ${safeText(note?.resource)} · 코드(code): ${safeText(note?.code)} · ${safeText(note?.message)}`);
          list.append(item);
        }
        notificationBox.append(text('p', 'muted', `알림 ${notifications.length}건`), list);
      }
      root.append(notificationBox);

      root.append(statusSection('연결 점검(진단 정보)', '진단 정보', diagnostics, (data) => {
        const list = document.createElement('dl');
        for (const [name, value] of diagnosticFields(data)) list.append(row(name, value));
        return list;
      }, '진단 정보 불러오는 중'));
      root.append(copyButton(diagnostics));
      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection({ status, mode, data, error, checkedAt } = {}) {
      // 호출마다 새 요소를 만들어 돌려주므로 이전 점검 결과와 오류 안내가 남지 않습니다. 다시 idle이 오면 점검 전 상태로 돌아갑니다.
      const root = document.createElement('div');
      root.append(text('h3', '', 'AI 연결 점검'));
      const notice = modeLine(mode);
      if (notice) root.append(notice);
      const manual = '다시 점검은 사용자가 위의 「현재 API 연결 점검」 버튼을 직접 누를 때만 실행됩니다. 자동으로 다시 점검하지 않습니다.';
      if (status === 'loading') {
        root.append(text('p', 'state state-loading', 'AI 연결 점검 중'), text('p', 'muted', '점검 중에는 「취소」를 누를 수 있습니다. 취소한 뒤 늦게 도착한 응답은 현재 결과로 쓰지 않습니다.'));
      } else if (status === 'error') {
        root.append(aiErrorBox(error, 'AI 연결 점검 실패'), text('p', 'muted', manual));
      } else if (status === 'ok' && data && typeof data === 'object') {
        const authorization = data.audienceAuthorization === 'test' ? '시험 연결 점검(test)'
          : data.audienceAuthorization === 'verified' ? '앱 권한 확인 후 점검(verified)' : '확인 불가(unknown)';
        const list = document.createElement('dl');
        list.append(
          row('점검 종류', authorization),
          row('응답 모델 수', Number.isFinite(data.modelCount) ? String(data.modelCount) : '확인 불가'),
          row('점검 시각', safeText(typeof checkedAt === 'string' && checkedAt ? checkedAt : null)),
        );
        root.append(text('p', 'state state-ok', 'AI 연결 점검 완료'), list);
        if (data.audienceAuthorization === 'test') root.append(text('p', 'muted', '시험 연결입니다. 실제 앱 권한을 확인한 결과가 아닙니다.'));
        // 모델 목록 응답은 사건 설명이 아닙니다. 설명은 보안 기록에서 따로 요청하고 확인합니다.
        root.append(text('p', 'state state-empty', '사건 설명은 아직 실행하지 않았습니다. 연결 점검만 마쳤으며, 모델 목록 응답은 사건 설명이 아닙니다.'), text('p', 'muted', manual));
      } else if (status === 'ok') {
        root.append(text('p', 'state state-empty', '확인 불가(unknown)'));
      } else {
        root.append(text('p', 'state state-empty', 'AI 연결 점검 전'), text('p', 'muted', manual));
      }
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const status = explanation?.status;
      const eventId = typeof event?.id === 'string' ? event.id : '';
      const root = document.createElement('div');
      root.append(text('h3', '', 'AI 사건 설명'));
      const notice = modeLine(explanation?.mode);
      if (notice) root.append(notice);
      if (status === 'ok' && eventId && typeof explanation.data?.summary === 'string') {
        // 성공한 설명에만 사건 ID 표식을 붙입니다.
        root.setAttribute('data-student-explanation-event', eventId);
        const list = document.createElement('dl');
        list.append(row('사건 ID', eventId), row('설명 요약', safeText(explanation.data.summary)));
        if (typeof checkedAt === 'string' && checkedAt) list.append(row('확인 시각', safeText(checkedAt)));
        root.append(text('p', 'state state-ok', 'AI 설명 수신'), list, text('p', 'muted', '설명은 참고용이며 조치를 자동으로 실행하지 않았습니다.'));
      } else if (status === 'error') {
        root.append(aiErrorBox(explanation.error, 'AI 설명 실패'), text('p', 'muted', '기록은 그대로 유지됩니다. 이 실패는 사건 기록이 바뀌었다는 뜻이 아닙니다.'));
      } else if (status === 'loading') {
        root.append(text('p', 'state state-loading', `AI 설명 요청 중${eventId ? ` (사건 ${eventId})` : ''}`));
      } else if (status === 'ok') {
        root.append(text('p', 'state state-empty', '확인 불가(unknown)'));
      } else {
        root.append(text('p', 'state state-empty', '보안 기록에서 사건을 골라 AI 설명을 요청하세요'));
      }
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
