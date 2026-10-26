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
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
