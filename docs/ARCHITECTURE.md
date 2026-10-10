# Heron 구조

한 파일은 한 가지 기능만 맡는다. 파일이 약 150줄을 넘으면 기능 단위로 쪼갠다.
계산 로직(그리드 배치, 배치 flush 규칙 등)은 DOM, Tauri API와 분리해서 순수 함수로 둔다.

터미널 안쪽은 꾸미지 않는다. xterm 기본 색, Cascadia Mono 글꼴, 셸이 출력한 바이트만 그린다.
초록 테마와 상태 표시는 앱 틀(타이틀바, pane 테두리와 헤더)에만 둔다.

## 프론트엔드 `src/`

| 경로 | 역할 |
| --- | --- |
| `main.ts` | 부트스트랩만. 모듈을 만들고 서로 연결한다 |
| `wire-agents.ts` | `main.ts`처럼 연결만: 에이전트 소식과 pane 신호를 에이전트 보드에 넣고, 보드가 바뀌면 에이전트가 있는 pane의 줄(번호, 폴더, 에이전트)을 만들어 사이드바, 하단바, pane 점(`pane-signals.ts`의 표시 함수)을 다시 그린다. 에이전트가 나를 기다리거나 끝나면 작업 표시줄 버튼을 깜빡인다(`ipc/attention.ts`). 사이드바 줄에 마우스를 올리면 그 pane 테두리를 밝힌다. 시작할 때 Claude Code 훅 상태를 맞춘다(`app/agent-hooks.ts`) |
| `agent/agent-model.ts` | 순수 함수: pane 하나의 에이전트 상태(쉬는 중, 작업 중, 권한 필요, 질문, 입력 대기, 끝남), 모델 확인, 컨텍스트 사용률, 작업 폴더, 급한 순서, 상태별 색. 신호 두 가지: 백엔드의 에이전트 소식(정확. Heron 훅이 쓴 상태, 백엔드의 모델 확인, heron-limits 플러그인의 컨텍스트 사용률)과 터미널 제목(`✳`은 쉬는 중, `◐◑`는 작업 중. 아무것도 설치하지 않아도 동작). 훅이 한 번 보고하면 훅이 상태를 정한다. 단 Esc나 Ctrl+C는 작업을 멈춘 것으로 본다(Claude Code는 중단된 턴에 Stop 훅을 보내지 않는다). 작업 표시줄을 깜빡일 변화인지도 여기서 정한다 |
| `agent/usage.ts` | 순수 함수: heron-limits 플러그인의 상태 파일에서 계정의 사용 한도(5시간, 주간)와 컨텍스트 사용률, 막대 색(70%부터 노랑, 90%부터 빨강) |
| `agent/agent-board.ts` | pty별 에이전트와 가장 최근 한도를 보관. 모든 신호를 `agent-model.ts`와 `usage.ts`로 계산하고, 바뀌면 구독자에게 어느 pane이 어떤 상태에서 어떤 상태로 바뀌었는지 알린다 |
| `app/paths.ts` | 경로에서 마지막 폴더 이름 |
| `app/perf-monitor.ts` | dev 전용 long task(50ms 초과) 로그 |
| `app/theme.ts` | 앱 틀 테마(green, black) 적용과 저장 |
| `app/file-drop.ts` | 파일을 pane에 끌어다 놓으면 경로를 입력(Windows Terminal 방식). Tauri 드래그 이벤트 사용 |
| `app/log.ts` | 범위별 로거. dev에서는 콘솔과 `tauri dev` 터미널로, prod에서는 warn/error만 콘솔로 |
| `app/shells.ts` | 셸 표시 이름, + 버튼 기본 셸 저장 |
| `app/font-size.ts` | 터미널 글씨 크기(10~24px) 저장 |
| `app/uptime-clock.ts` | 앱 전체에 1초 `setInterval` 1개. 창이 숨거나 최소화되면 멈춘다 |
| `app/prefs.ts` | 작은 설정값 저장: 설정 창(애니메이션, exit 0이면 닫기)과 화면이 스스로 기억하는 것(사이드바 접힘, 안내 숨김), Claude Code 훅을 켰는지(초기화해도 남는다). 실패하면 기본값 |
| `app/agent-hooks.ts` | Heron의 Claude Code 훅이 켜졌는지(사이드바와 설정이 함께 본다), 켜고 끄기. 켠 선택을 기억해서, 시작할 때 업데이트로 빠졌거나 다른 heron.exe를 가리키는 훅을 다시 넣는다 |
| `app/motion.ts` | 설정 > Animations. 끄면 `<html class="no-motion">`으로 CSS 전환·애니메이션을 멈추고, pane 등장·FLIP·출력 글로우도 끈다 |
| `app/reset.ts` | 설정 > Reset: 저장된 `heron.*` 값을 모두 지워 기본값으로. 화면 적용은 `main.ts`가 한다 |
| `app/visibility.ts` | 창 숨김·최소화 감지(WebView2는 최소화해도 `document.hidden`이 false라 Tauri 창 상태도 본다), `app-hidden` class, 애니메이션 허용 여부 |
| `ui/titlebar.ts` | macOS식 타이틀바. 왼쪽 로고, 오른쪽 action 슬롯과 신호등(Windows 순서). 비활성 표시는 Tauri 창 포커스 이벤트로 |
| `ui/new-terminal-button.ts` | [+ 새 터미널 (선택된 셸)][▾] split 버튼. + 를 눌러야 생성 |
| `ui/shell-menu.ts` | 설치된 셸 목록 드롭다운. 고르면 선택만 하고 기억한다(생성은 + 버튼) |
| `ui/popover.ts` | 타이틀바 버튼 아래 패널 열고 닫기(바깥 클릭, Esc, 창 blur) |
| `ui/settings-panel.ts` | 톱니 버튼과 설정 창. 열 때마다, Reset 뒤에, 열린 채 언어가 바뀌면 행을 다시 만든다 |
| `ui/settings-rows.ts` | 설정 행: 테마, 언어, 글씨 크기, 애니메이션, exit 0이면 닫기, Claude Code 훅(못 바꾸면 이유를 아래에), 설정 Reset. 저장된 값으로 만들고, 바꾸면 로그 |
| `ui/lang-toggle.ts` | 언어 선택 버튼 두 개(English, 한국어). 언어 이름은 그 언어로 적어 어느 언어에서든 찾을 수 있다 |
| `ui/confirm-button.ts` | 되돌릴 수 없는 동작용 버튼: 첫 클릭은 "Sure?"(정말요?), 3초 안에 다시 누르면 실행하고 결과를 잠깐 보인다 |
| `ui/switch.ts` | 설정 창 켜기/끄기 스위치. 바꾸는 일이 실패할 수 있으면(Promise) 기다렸다가 실제 상태를 보여 준다 |
| `ui/font-size-control.ts` | `A−` `A+` 버튼(설정 창 안) |
| `ui/terminal-count.ts` | 실행 중 터미널 개수 |
| `ui/tidy-button.ts` | 자동 격자로 되돌리는 버튼. 수동 배치일 때만 보이고, action 맨 왼쪽이라 나타나도 다른 버튼 위치가 안 바뀐다 |
| `ui/theme-toggle.ts` | 테마 선택 동그라미 두 개(설정 창 안) |
| `ui/empty-state.ts` | 터미널 0개일 때 큰 + 버튼과 깜빡이는 `_` |
| `ui/agent-sidebar.ts` | 왼쪽 사이드바: 에이전트가 있는 pane을 급한 순(나를 기다림, 끝남, 작업 중, 쉬는 중)으로, 맨 아래에 안내(`agent-hints.ts`). 에이전트가 없으면 숨는다. 번호 배지만 남게 접을 수 있고 기억한다. 줄은 보드가 바뀔 때만 새로 만들고, 1초 갱신은 경과 시간만 바꾼다 |
| `ui/agent-item.ts` | 사이드바 한 줄: 상태 색 배지에 든 pane 번호, 폴더, 경과 시간, 상태(권한 요청과 질문이면 무엇인지도), 모델 경고. 누르면 그 pane으로, 마우스를 올리면 그 pane 강조 |
| `ui/usage-bar.ts` | 창 아래 하단바(heron-limits 플러그인): 한도 블록 두 개와 에이전트마다 컨텍스트 사용률 칩(pane 순서, 누르면 그 pane으로). 한도도 컨텍스트도 없으면 숨고, 한도가 있을 때만 1초 시계를 구독한다 |
| `ui/limit-meter.ts` | 하단바의 한도 하나(5시간, 주간): 이름, 초기화까지 남은 시간, 큰 사용률 숫자와 막대. 70%부터 노랑, 90%부터 빨강 |
| `i18n/strings.ts` | 화면에 보이는 모든 글자의 영어·한국어 표. 셸 이름과 로그는 번역하지 않는다 |
| `i18n/hooks-error.ts` | Claude Code 훅 명령의 오류 코드를 문장으로 |
| `i18n/lang.ts` | 현재 언어와 `t()`. 저장된 선택이 없으면 Windows 표시 언어를 따른다. 화면 모듈은 `onLangChange`로 글자를 다시 쓴다 |
| `ipc/launch.ts` | 시작 폴더 받기(`take_launch_dir`), 켜진 창으로 온 폴더(`open-folder` 이벤트) |
| `ipc/pty.ts` | PTY 명령 타입 래퍼, 출력 Channel(ArrayBuffer), `pty-exit` 구독, 셸 목록 |
| `ipc/agent.ts` | `agent-update` 이벤트 구독. 종류는 `state`(Heron 훅), `check`(백엔드의 모델 확인), `status`(heron-limits 플러그인). JSON을 검사 없이 넘기고, 검사는 `agent-model.ts`와 `usage.ts`가 한다 |
| `ipc/agent-hooks.ts` | Claude Code 훅 명령(`agent_hooks_presence`, `install_agent_hooks`, `remove_agent_hooks`). 실패하면 오류 코드 |
| `ipc/attention.ts` | 작업 표시줄 깜빡임 명령(`flash_taskbar`) |
| `terminal/terminal-view.ts` | xterm 생성, fit·webgl addon, context loss 시 DOM 렌더러로 fallback |
| `terminal/flow-control.ts` | `write` 콜백으로 대기 바이트 추적, 256KB 넘으면 pause, 32KB 밑이면 resume |
| `terminal/keys.ts` | WebView 단축키 차단, Ctrl+C/V |
| `terminal/clipboard.ts` | 복사·붙여넣기, 우클릭(선택 있으면 복사, 없으면 붙여넣기. 앱이 마우스 추적 중이면 앱에 넘김, Shift+우클릭은 항상 처리) |
| `terminal/links.ts` | 출력 속 URL과 OSC 8 링크를 Ctrl+클릭으로 브라우저에서 열기(opener 플러그인, http/https만. 앱이 마우스 추적 중이어도 링크 위 Ctrl+클릭은 앱에 넘기지 않음) |
| `terminal/cwd.ts` | 셸이 보내는 현재 폴더 신호(OSC 9;9, OSC 7) 해석. 신호는 프롬프트마다 오므로 "프롬프트로 돌아옴"도 알린다 |
| `pane/pane-item.ts` | pane 매니저, 배치, 끌기가 pane(`pane.ts`)에 요구하는 것. 이 모듈들이 터미널에 직접 기대지 않게 한다 |
| `pane/pane.ts` | 터미널 pane 하나: 헤더, TerminalView, PtyLink, 글로우를 묶는다. 에이전트 상태 색, 폴더 이름 |
| `pane/pane-signals.ts` | 터미널 제목과 폴더를 헤더에, 신호(제목, 프롬프트, 키 입력과 그 키가 단독 Esc나 Ctrl+C인지, 포커스, 닫힘)를 에이전트 보드로. 에이전트 상태에 따른 점 색과 사이드바에서 가리킬 때의 테두리 class |
| `pane/shell-exits.ts` | 셸 종료 처리: exit 0이면 pane 닫기(설정으로 끌 수 있음), 실패면 남기고 뱃지 |
| `pane/pane-counts.ts` | 타이틀바 개수와 빈 화면용 숫자(터미널, 실행 중) |
| `pane/pty-link.ts` | TerminalView와 백엔드 PTY 연결: 출력, 입력, 크기, kill |
| `pane/pane-header.ts` | 헤더 DOM: 상태 점, 셸 이름, exit 뱃지, 폴더, 터미널 제목, 실행 시간(시계 구독, 셸이 끝나면 멈춤), 닫기 |
| `pane/pane-motion.ts` | pane 등장·퇴장 애니메이션 |
| `pane/output-glow.ts` | 출력 시 테두리 글로우(0.3초)와 상태 점 pulse(3초). 조용한 셸에는 도는 애니메이션이 없다. pane당 최대 150ms에 한 번 class 토글 |
| `pane/pane-drag.ts` | 헤더를 잡고 다른 pane에 놓기: 가장자리면 그쪽으로 분할, 가운데면 자리 교체, Esc 취소. Tauri 파일 드롭 때문에 HTML5 drag가 안 와서 pointer 이벤트와 pointer capture를 쓴다 |
| `pane/pane-manager.ts` | pane 목록, 추가·닫기, 포커스, 글씨 크기. pane 신호를 pty id와 함께 넘긴다. 배치는 `SplitLayout`, 셸 종료는 `shell-exits.ts`에 맡긴다 |
| `layout/grid.ts` | 순수 함수: 자동 격자에서 줄마다 pane 몇 개인지 계산 |
| `layout/split-tree.ts` | 순수 함수: 분할 트리(가로 `row`, 세로 `column`, 비율 `sizes`). 자동 격자 트리, 삽입, 제거(형제가 공간을 나눠 가짐), 이동, 교체 |
| `layout/split-rects.ts` | 순수 함수: 트리를 px 박스와 경계선 박스로. 가장자리를 정수로 반올림해 글자가 흐려지지 않게 한다 |
| `layout/drop-zone.ts` | 순수 함수: 끌어 놓은 위치가 어느 쪽인지(바깥 1/4은 분할, 가운데는 교체), 미리보기 박스 |
| `layout/split-layout.ts` | 트리를 workspace에 적용. 자동 모드는 추가·닫기마다 격자로 다시 만들고, 첫 끌기나 경계선 이동부터 수동 모드. pane은 workspace 바로 아래에 두고 절대 좌표만 준다(터미널을 다른 부모로 옮기지 않음) |
| `layout/dividers.ts` | pane 사이 틈의 경계선. 끌면 이웃 두 pane 비율 조절(최소 80px), 더블클릭은 반반 |
| `layout/box-style.ts` | 절대 위치 요소에 px 박스 적용 |
| `layout/fit-scheduler.ts` | ResizeObserver + requestAnimationFrame으로 fit을 묶음. 프레임당 10ms 예산, 남으면 다음 프레임 |
| `layout/flip.ts` | 재배치 시 이전 위치에서 새 위치로 transform 애니메이션 |
| `styles/*.css` | 기능별 스타일: `themes`(색 토큰, green/black), `base`, `titlebar`, `controls`, `shell-menu`, `workspace`(사이드바와 작업 영역을 나란히), `pane`, `split`(경계선, 드롭 미리보기), `settings`, `empty-state`, `agent-sidebar`(사이드바 틀), `agent-item`(사이드바 한 줄), `agent-marks`(배지와 pane 점의 에이전트 상태 색, 가리킨 pane 테두리), `agent-hints`(사이드바 아래 안내), `usage-bar`(하단바, 한도 블록, 컨텍스트 칩), `effects`(Animations 끄기 규칙 포함) |

의존 방향: `main.ts`, `wire-agents.ts` → `ui/`, `pane/`, `layout/` → `agent/`, `terminal/`, `ipc/`, `app/`, `i18n/`.
`agent/`는 `ipc/`의 타입과 `app/log.ts`만 import한다(화면 모듈을 모른다).
`ipc/`, `i18n/`, `layout/grid.ts`는 다른 앱 모듈을 import하지 않는다.
`app/`에서 `ipc/`의 명령을 부르는 곳은 `app/agent-hooks.ts`뿐이다.
`layout/split-tree.ts`, `split-rects.ts`, `drop-zone.ts`는 `layout/` 안의 순수 모듈만 import한다(DOM 없음).

## 백엔드 `src-tauri/src/`

| 경로 | 역할 |
| --- | --- |
| `main.rs` | `run_cli()`가 훅 실행이나 훅 제거로 불린 것이면 창 없이 그 일만 하고 끝낸다. 아니면 `run()` |
| `lib.rs` | `run_cli()`(`--agent-hook`, `--remove-agent-hooks`), Builder 구성, 명령 등록, `AgentLink` 생성. 앱 페이지(main)가 다시 로드되거나 앱이 끝나면 모든 PTY kill과 에이전트 파일 정리 |
| `window.rs` | 메인 창 생성. 설정 파일로 못 켜는 옵션(클립보드 읽기 자동 허용) 때문에 코드에서 만든다 |
| `attention.rs` | 다른 앱이 앞에 있을 때 작업 표시줄 버튼 깜빡임(`flash_taskbar`). Tauri의 `requestUserAttention`은 창이 자기 스레드의 활성 창이기만 해도 건너뛰어서(tao#942와 같은 원인) 맨 앞 창을 확인한 뒤 user32 `FlashWindowEx`를 직접 부른다 |
| `launch.rs` | 명령줄 폴더 인자("Open in Heron"), 이미 켜져 있으면 그 창에 pane 추가(single-instance 플러그인, release 빌드만) |
| `logging.rs` | dev용 stderr 로거. release에서는 로그 호출이 컴파일에서 빠진다 |
| `commands.rs` | Tauri 명령. 인자만 넘기고 `pty`, `agent`, `claude_hooks` 모듈에 위임. 셸 명령에 pane의 에이전트 변수를 넣는 곳이 여기라 `pty`는 에이전트를 모른다 |
| `claude_version.rs` | 순수 함수: Claude Code 버전 문자열(`claude --version` 출력, 기록 파일 항목의 `version`)을 숫자 셋으로. `claude_hooks/`와 `agent/`가 함께 쓴다 |
| `agent/mod.rs` | `AgentLink`: pane마다 셸에 `HERON_PANE`(키 `<pid>-<pty id>`)와 `HERON_AGENT_DIR`(`%LOCALAPPDATA%\io.github.seonggyujo.heron\agents`)을 넣고, pane이 닫히면 그 pane 파일을 지운다. 파일은 Heron 훅(`claude_hooks/`)과 heron-limits 플러그인이 쓴다 |
| `agent/files.rs` | pane 파일 이름(`<키>.state.json`과 `<키>.model.json`은 훅, `<키>.status.json`은 플러그인 상태줄)과 키 검사(`claude_hooks/entry.rs`가 환경변수의 키로 파일 이름을 만들 때), 하루 지난 파일 정리 |
| `agent/poll.rs` | 0.7초마다 살아 있는 pane마다 `watch.rs`를 한 번 돌리고, 나온 소식을 `agent-update` 이벤트로 프론트에 보낸다 |
| `agent/watch.rs` | pane 하나를 지켜보는 일: 파일의 수정 시각을 보고 바뀐 상태 파일과 상태줄 파일은 그대로 보낸다. 상태 파일이 알려 준 기록 파일을 따라 읽고, 모델 파일의 선택 모델(훅이 모르면 상태줄 파일의 `model`)로 모델 확인을 해서 판정이 바뀌면 `check`를 보낸다. 새 답을 먼저 판정하고 그다음 새 선택을 받아서, 바꾸기 전의 답은 바꾸기 전 모델과 비교한다. 쓰는 쪽은 쓰고 나서 이름을 바꾸므로 반쯤 쓴 파일을 읽지 않는다 |
| `agent/transcript.rs` | 기록 파일 하나를 따라 읽기: 지난번 이후 새로 끝난 줄만 읽어 답을 한 번씩 돌려준다. 파일 끝에서 시작하고, 따라 읽기 전에 쓰인 답(재개한 세션, 갈래 친 세션의 사본)은 그때 선택 모델을 몰라서 판정하지 않는다 |
| `agent/answers.rs` | 순수 함수: 기록 파일 한 줄에서 본 대화의 답(`message.id`, `message.model`, 시각)을 꺼낸다. 서브에이전트(`isSidechain`), `<synthetic>`, 모델 변경 훅이 없는 Claude Code(2.1.251 미만)가 쓴 답은 뺀다. `[1m]`, 날짜 꼬리를 빼고 모델 비교 |
| `agent/model_check.rs` | 순수 함수: 답마다 그 답이 왔을 때의 선택 모델과 한 번만 비교한다. 선택 모델은 훅이 알려 준 것, 훅이 모르면(이어서 연 세션) 지금 기록 파일의 세션에서 상태줄이 알려 준 것. 판정은 ok, mismatch, pending(답이 없거나, 선택을 모르거나, 답 뒤에 모델을 바꿨을 때) |
| `claude_hooks/mod.rs` | Heron 자체 Claude Code 훅의 진입점: 상태 확인, 설치(먼저 버전 확인), 제거, 오류 코드. 플러그인 없이도 권한 요청, 질문, 끝남, 모델 확인을 하게 한다 |
| `claude_hooks/entry.rs` | `heron.exe --agent-hook`으로 실행됐을 때: 훅 입력(JSON)을 `records.rs`로 바꿔 pane의 상태 파일과 모델 파일에 쓰고 끝난다. 30초 안에 쓴 이전 상태 기록도 읽어 `records.rs`에 넘긴다. 아무것도 출력하지 않는다. Heron pane 밖이면 입력을 읽기 전에 끝난다 |
| `claude_hooks/records.rs` | 순수 함수: 훅 이벤트 하나가 쓰는 것. 상태 파일에는 상태, 권한 요청이나 알림 내용, 작업 폴더, 기록 파일 경로. 모델 파일에는 `SessionStart`의 `model`이나 `PostModelSwitch`의 `to_model`. 모델이 없는 `SessionStart`(이어서 연 세션)는 "모름"(null)을 써서 같은 pane의 이전 세션 모델이 남지 않게 하고, `/clear`는 그대로 둔다. `PermissionRequest` 바로 뒤에 오는 권한 알림은 요청의 도구와 명령을 덮어쓰지 않는다. 테스트는 `records_tests.rs` |
| `claude_hooks/config.rs` | settings.json `hooks` 안의 Heron 항목 넣기, 빼기, 있는지 보기(순수 함수). 이벤트 8개(`PostModelSwitch` 포함. 이것을 모르는 버전은 그 항목만 건너뛴다). heron.exe를 `--agent-hook`으로 부르는 항목만 우리 것으로 보고 사용자의 훅은 건드리지 않는다. 이벤트가 하나라도 빠지면 오래된 설치로 보고 앱이 시작할 때 다시 넣는다. 테스트는 `config_tests.rs` |
| `claude_hooks/settings_file.rs` | `settings.json`(CLAUDE_CONFIG_DIR 또는 `%USERPROFILE%.claude`) 읽기와 쓰기. 쓰기 전에 옆에 `.heron-backup` 사본, 임시 파일에 쓰고 이름 바꾸기. 올바른 JSON이 아니면 쓰지 않는다 |
| `claude_hooks/version.rs` | `claude --version` 확인. 2.1.139 미만은 훅 항목의 `args`를 무시해서 이벤트마다 앱을 띄울 수 있으므로 설치하지 않는다 |
| `pty/mod.rs` | `pty` 모듈 공개 API |
| `pty/ctrl_c.rs` | 시작할 때 물려받은 "Ctrl+C 무시" 상태를 푼다(`SetConsoleCtrlHandler(NULL, FALSE)`). 새 프로세스 그룹으로 실행되면 이 상태가 셸까지 물려져서 pane에서 ^C가 안 먹는다. Windows Terminal과 같은 처리 |
| `pty/registry.rs` | id → 세션 맵. 락은 조회·삽입·삭제 동안만. 새 id가 정해진 뒤 호출한 쪽에 셸 명령을 받아 실행한다 |
| `pty/session.rs` | 세션 하나: 생성, 입력 큐, 크기 조정, pause, kill, close |
| `pty/shell.rs` | 셸 종류(pwsh 7, Windows PowerShell, cmd, Git Bash), 설치 여부, 실행 명령 |
| `pty/cwd_report.rs` | 셸 세션에만 현재 폴더 신호(OSC 9;9) 훅을 건다. 화면과 프로필 파일은 그대로 |
| `pty/writer.rs` | 입력 스레드. 명령은 큐에 넣기만 해서 키 순서 보장, 메인 스레드 안 막음 |
| `pty/reader.rs` | 64KB 블로킹 read 스레드, 용량 4의 bounded channel로 backpressure |
| `pty/gate.rs` | pause 스위치(Mutex + Condvar) |
| `pty/batcher.rs` | 12ms 간격 또는 64KB 단위 flush, `InvokeResponseBody::Raw`로 전송 |
| `pty/waiter.rs` | 자식 종료 대기 → 콘솔 닫기 → 마지막 출력 flush → `pty-exit` 발행 |

의존 방향: `lib.rs`, `commands.rs` → `claude_hooks/`, `agent/`, `pty/` → `claude_version.rs`.
`claude_hooks/entry.rs`는 `agent`가 내보낸 파일 이름 함수만 쓰고, `agent/`는 `claude_hooks/`를 모른다.

## 플러그인 `plugin/` (heron-limits)

Claude Code가 상태줄로만 주는 값(5시간·주간 사용 한도, 컨텍스트 사용률)을 Heron에 넘기는 Claude Code 플러그인.
저장소 맨 위 `.claude-plugin/marketplace.json`이 이 저장소를 마켓플레이스 `heron`으로 만들고, 플러그인은 `./plugin`을 가리킨다
(`/plugin marketplace add seonggyujo/heron`, `/plugin install heron-limits@heron`). Heron 앱과 따로 버전을 매긴다(`plugin/.claude-plugin/plugin.json`).

| 경로 | 역할 |
| --- | --- |
| `setup.js` | `sync`(SessionStart 훅): 상태줄 자리를 가져오고, 쓰던 상태줄은 저장해서 우리 것 안에서 돌린다(`refreshInterval`, `padding`은 그대로). 설치된 사본을 플러그인 버전에 맞춘다. `first-run`(UserPromptSubmit 훅): 처음 한 번만 `sync`. `disable`: 쓰던 상태줄을 돌려놓고 사본을 지운다. settings.json은 `~/.claude/heron-limits/`의 사본을 가리킨다(플러그인 폴더는 버전마다 바뀌고, 플러그인을 지워도 사본은 계속 돈다) |
| `statusline.js` | 상태줄 진입점: Heron pane 안이면 `heron-file.js`로 파일을 쓰고, `previous.js`가 돌린 쓰던 상태줄의 출력을 그대로 찍는다. 없으면 아무것도 찍지 않는다 |
| `heron-file.js` | `<키>.status.json`에 한도(사용률, 초기화 시각), 컨텍스트 사용률, 선택 모델(`model.id`, 훅이 모르는 이어서 연 세션용). pane 키 모양이 아니면 쓰지 않는다 |
| `previous.js` | 저장한 사용자 상태줄을 같은 입력으로 실행(Git Bash, 없으면 기본 셸). 3초 안에 끝나지 않거나 실패하면 출력 없음 |
| `skills/disable/` | `/heron-limits:disable` |
| `test/` | `node --test "test/*.test.js"`: 설정 가져오기와 되돌리기, 출력 그대로 전달, Heron 파일 |

`plugin/package.json`은 `"type": "commonjs"`다. 저장소 맨 위 `package.json`이 ES 모듈이라서, 없으면 저장소 안에서 실행한 스크립트가 깨진다.

## 스크립트 `scripts/`

| 경로 | 역할 |
| --- | --- |
| `demo/` | README GIF 녹화. SendInput으로 앱을 조작하고 ffmpeg로 녹화, GIF 변환. 사용법은 `scripts/demo/README.md` |
| `installer/make-images.ps1` | 설치 창 이미지(NSIS 사이드바·헤더, MSI 배경·배너)를 `src-tauri/icons/icon.png`로 그려 `src-tauri/installer/`에 저장. 아이콘을 바꾸면 다시 실행 |

## 로그

- `npm run tauri:dev` 터미널에 Rust 로그와 프론트 로그(`web` 대상)가 함께 나온다.
- 레벨은 환경변수 `HERON_LOG`(error, warn, info, debug, trace)로 바꾼다. 기본 debug.
  `trace`는 출력 flush마다 한 줄을 찍으니 필요할 때만 쓴다.
  PowerShell: `$env:HERON_LOG = "trace"; npm run tauri:dev`
- 출력 청크마다 찍는 로그는 trace에만 둔다. 다른 레벨에서 hot path 로그 금지.
- 기본(debug)에서 나오는 것: 셸 시작·종료·크기, 현재 폴더 변화(`[cwd]`), 배치 변화, 막힌 링크, 설정 변경(`[settings]`), 막힌 브라우저 단축키(`[keys]`), 다음 프레임으로 밀린 fit(`[fit]`), 에이전트 파일 변화(`agent:`), 작업 표시줄 깜빡임(`attention:`).
- `trace`에서만 나오는 것: 출력 flush.

## 설정

- `src-tauri/tauri.conf.json`: 창은 `create: false`(`window.rs`에서 생성), `decorations: false`(자체 타이틀바), `shadow: true`(Windows 11 둥근 모서리와 그림자). CSP는 `'self'`와 IPC만 허용. `bundle`의 `publisher`, `copyright`가 exe 속성(회사, 저작권)과 설치 정보의 게시자가 된다. 비워 두면 게시자가 식별자의 두 번째 칸("github")이 된다.
- `src-tauri/capabilities/default.json`: 이벤트와 창 조작(닫기, 최소화, 최대화, 드래그)만 허용.
- `tauri.conf.json` `bundle.windows`: 설치 파일 아이콘과 설치 창 이미지(`src-tauri/installer/*.bmp`).
- `src-tauri/installer/hooks.nsh`, `context-menu.wxs`: 탐색기 우클릭 "Open in Heron" 등록과 제거(NSIS, MSI). 서명 없는 클래식 메뉴라 Windows 11에서는 "추가 옵션 표시" 안에 나온다.
- 삭제할 때 `heron.exe --remove-agent-hooks`로 Claude Code 훅을 뺀다(NSIS는 `hooks.nsh`, MSI는 `agent-hooks.wxs`). 업데이트할 때도 빠지지만 새 버전이 시작하면 다시 넣는다.
- `Cargo.toml`: `serde_json`의 `preserve_order`를 켜서 사용자의 settings.json 키 순서를 그대로 둔다.
- `build.rs`: `icons/`가 바뀌면 다시 실행되게 해서 exe에 새 아이콘이 들어가게 한다.
- `src-tauri/icons/icon-source.png`: 앱 아이콘 원본(1024px). `npm run tauri icon src-tauri/icons/icon-source.png`로 모든 크기를 만든 뒤 저장소에 두는 6개(`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.png`, `icon.ico`, 원본)만 남긴다. 설치 이미지는 `scripts/installer/make-images.ps1`로 다시 그린다.
- `Cargo.toml` release 프로필: `lto = true`, `codegen-units = 1`, `panic = "abort"`, `strip = true`, `opt-level = "s"`.

## 성능 원칙 (측정으로 확인한 것)

- 계속 도는 CSS 애니메이션은 하나만 있어도 WebView가 매 프레임을 다시 그린다. 대기 CPU가 0.01%에서 0.9%로 오른다. 무한 애니메이션은 출력이 있을 때처럼 필요한 동안에만 켠다.
- 여러 터미널의 fit을 한 프레임에 몰면 long task가 된다(6개에 94ms). `fit-scheduler`의 프레임 예산을 지킨다.
- 측정 수치는 `docs/PERFORMANCE.md`에 있다.
