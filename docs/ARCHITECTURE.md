# greenterm 구조

한 파일은 한 가지 기능만 맡는다. 파일이 약 150줄을 넘으면 기능 단위로 쪼갠다.
계산 로직(그리드 배치, 배치 flush 규칙 등)은 DOM, Tauri API와 분리해서 순수 함수로 둔다.

터미널 안쪽은 꾸미지 않는다. xterm 기본 색, Cascadia Mono 글꼴, 셸이 출력한 바이트만 그린다.
초록 테마와 상태 표시는 앱 틀(타이틀바, pane 테두리와 헤더)에만 둔다.

## 프론트엔드 `src/`

| 경로 | 역할 |
| --- | --- |
| `main.ts` | 부트스트랩만. 모듈을 만들고 서로 연결한다 |
| `app/perf-monitor.ts` | dev 전용 long task(50ms 초과) 로그 |
| `app/theme.ts` | 앱 틀 테마(green, black) 적용과 저장 |
| `app/file-drop.ts` | 파일을 pane에 끌어다 놓으면 경로를 입력(Windows Terminal 방식). Tauri 드래그 이벤트 사용 |
| `app/log.ts` | 범위별 로거. dev에서는 콘솔과 `tauri dev` 터미널로, prod에서는 warn/error만 콘솔로 |
| `app/shells.ts` | 셸 표시 이름, + 버튼 기본 셸 저장 |
| `app/font-size.ts` | 터미널 글씨 크기(10~24px) 저장 |
| `app/uptime-clock.ts` | 앱 전체에 1초 `setInterval` 1개. 창이 숨거나 최소화되면 멈춘다 |
| `app/visibility.ts` | 창 숨김·최소화 감지(WebView2는 최소화해도 `document.hidden`이 false라 Tauri 창 상태도 본다), `app-hidden` class, 애니메이션 허용 여부 |
| `ui/titlebar.ts` | macOS식 타이틀바. 왼쪽 로고, 오른쪽 action 슬롯과 신호등(Windows 순서) |
| `ui/new-terminal-button.ts` | [+ 새 터미널 (선택된 셸)][▾] split 버튼. + 를 눌러야 생성 |
| `ui/shell-menu.ts` | 설치된 셸 목록 드롭다운. 고르면 선택만 하고 기억한다(생성은 + 버튼) |
| `ui/font-size-control.ts` | `A−` `A+` 버튼 |
| `ui/terminal-count.ts` | 실행 중 터미널 개수 |
| `ui/tidy-button.ts` | 자동 격자로 되돌리는 버튼. 수동 배치일 때만 보이고, action 맨 왼쪽이라 나타나도 다른 버튼 위치가 안 바뀐다 |
| `ui/theme-toggle.ts` | 테마 선택 동그라미 두 개 |
| `ui/empty-state.ts` | 터미널 0개일 때 큰 + 버튼과 깜빡이는 `_` |
| `ipc/launch.ts` | 시작 폴더 받기(`take_launch_dir`), 켜진 창으로 온 폴더(`open-folder` 이벤트) |
| `ipc/pty.ts` | PTY 명령 타입 래퍼, 출력 Channel(ArrayBuffer), `pty-exit` 구독, 셸 목록 |
| `terminal/terminal-view.ts` | xterm 생성, fit·webgl addon, context loss 시 DOM 렌더러로 fallback |
| `terminal/flow-control.ts` | `write` 콜백으로 대기 바이트 추적, 256KB 넘으면 pause, 32KB 밑이면 resume |
| `terminal/keys.ts` | WebView 단축키 차단, Ctrl+C/V |
| `terminal/clipboard.ts` | 복사·붙여넣기, 우클릭(선택 있으면 복사, 없으면 붙여넣기) |
| `terminal/links.ts` | 출력 속 URL과 OSC 8 링크를 Ctrl+클릭으로 브라우저에서 열기(opener 플러그인, http/https만) |
| `terminal/cwd.ts` | 셸이 보내는 현재 폴더 신호(OSC 9;9, OSC 7) 해석 |
| `pane/pane.ts` | pane 하나: 헤더, TerminalView, PtyLink, 글로우, 실행 시간을 묶는다 |
| `pane/pty-link.ts` | TerminalView와 백엔드 PTY 연결: 출력, 입력, 크기, kill |
| `pane/pane-header.ts` | 헤더 DOM: 상태 점, 셸 이름, exit 뱃지, 폴더, 터미널 제목, 실행 시간, 닫기 |
| `pane/pane-motion.ts` | pane 등장·퇴장 애니메이션 |
| `pane/output-glow.ts` | 출력 시 테두리 글로우(0.3초)와 상태 점 pulse(3초). 조용한 셸에는 도는 애니메이션이 없다. pane당 최대 150ms에 한 번 class 토글 |
| `pane/pane-drag.ts` | 헤더를 잡고 다른 pane에 놓기: 가장자리면 그쪽으로 분할, 가운데면 자리 교체, Esc 취소. Tauri 파일 드롭 때문에 HTML5 drag가 안 와서 pointer 이벤트와 pointer capture를 쓴다 |
| `pane/pane-manager.ts` | pane 목록, 추가·닫기, 포커스, 글씨 크기, exit 0이면 자동 닫기. 배치는 `SplitLayout`에 맡긴다 |
| `layout/grid.ts` | 순수 함수: 자동 격자에서 줄마다 pane 몇 개인지 계산 |
| `layout/split-tree.ts` | 순수 함수: 분할 트리(가로 `row`, 세로 `column`, 비율 `sizes`). 자동 격자 트리, 삽입, 제거(형제가 공간을 나눠 가짐), 이동, 교체 |
| `layout/split-rects.ts` | 순수 함수: 트리를 px 박스와 경계선 박스로. 가장자리를 정수로 반올림해 글자가 흐려지지 않게 한다 |
| `layout/drop-zone.ts` | 순수 함수: 끌어 놓은 위치가 어느 쪽인지(바깥 1/4은 분할, 가운데는 교체), 미리보기 박스 |
| `layout/split-layout.ts` | 트리를 workspace에 적용. 자동 모드는 추가·닫기마다 격자로 다시 만들고, 첫 끌기나 경계선 이동부터 수동 모드. pane은 workspace 바로 아래에 두고 절대 좌표만 준다(터미널을 다른 부모로 옮기지 않음) |
| `layout/dividers.ts` | pane 사이 틈의 경계선. 끌면 이웃 두 pane 비율 조절(최소 80px), 더블클릭은 반반 |
| `layout/box-style.ts` | 절대 위치 요소에 px 박스 적용 |
| `layout/fit-scheduler.ts` | ResizeObserver + requestAnimationFrame으로 fit을 묶음. 프레임당 10ms 예산, 남으면 다음 프레임 |
| `layout/flip.ts` | 재배치 시 이전 위치에서 새 위치로 transform 애니메이션 |
| `styles/*.css` | 기능별 스타일: `themes`(색 토큰, green/black), `base`, `titlebar`, `controls`, `shell-menu`, `workspace`, `pane`, `split`(경계선, 드롭 미리보기), `empty-state`, `effects` |

의존 방향: `main.ts` → `ui/`, `pane/`, `layout/` → `terminal/`, `ipc/`, `app/`.
`ipc/`와 `layout/grid.ts`는 다른 앱 모듈을 import하지 않는다.
`layout/split-tree.ts`, `split-rects.ts`, `drop-zone.ts`는 `layout/` 안의 순수 모듈만 import한다(DOM 없음).

## 백엔드 `src-tauri/src/`

| 경로 | 역할 |
| --- | --- |
| `main.rs` | `greenterm_lib::run()` 호출만 |
| `lib.rs` | Builder 구성, 명령 등록, 페이지 로드·앱 종료 시 모든 PTY kill |
| `window.rs` | 메인 창 생성. 설정 파일로 못 켜는 옵션(클립보드 읽기 자동 허용) 때문에 코드에서 만든다 |
| `launch.rs` | 명령줄 폴더 인자("Open in greenterm"), 이미 켜져 있으면 그 창에 pane 추가(single-instance 플러그인, release 빌드만) |
| `logging.rs` | dev용 stderr 로거. release에서는 로그 호출이 컴파일에서 빠진다 |
| `commands.rs` | Tauri 명령. 인자만 넘기고 `pty` 모듈에 위임 |
| `pty/mod.rs` | `pty` 모듈 공개 API |
| `pty/registry.rs` | id → 세션 맵. 락은 조회·삽입·삭제 동안만 |
| `pty/session.rs` | 세션 하나: 생성, 입력 큐, 크기 조정, pause, kill, close |
| `pty/shell.rs` | 셸 종류(pwsh 7, Windows PowerShell, cmd, Git Bash), 설치 여부, 실행 명령 |
| `pty/cwd_report.rs` | 셸 세션에만 현재 폴더 신호(OSC 9;9) 훅을 건다. 화면과 프로필 파일은 그대로 |
| `pty/writer.rs` | 입력 스레드. 명령은 큐에 넣기만 해서 키 순서 보장, 메인 스레드 안 막음 |
| `pty/reader.rs` | 64KB 블로킹 read 스레드, 용량 4의 bounded channel로 backpressure |
| `pty/gate.rs` | pause 스위치(Mutex + Condvar) |
| `pty/batcher.rs` | 12ms 간격 또는 64KB 단위 flush, `InvokeResponseBody::Raw`로 전송 |
| `pty/waiter.rs` | 자식 종료 대기 → 콘솔 닫기 → 마지막 출력 flush → `pty-exit` 발행 |

## 스크립트 `scripts/`

| 경로 | 역할 |
| --- | --- |
| `demo/` | README GIF 녹화. SendInput으로 앱을 조작하고 ffmpeg로 녹화, GIF 변환. 사용법은 `scripts/demo/README.md` |
| `installer/make-images.ps1` | 설치 창 이미지(NSIS 사이드바·헤더, MSI 배경·배너)를 `src-tauri/icons/icon.png`로 그려 `src-tauri/installer/`에 저장. 아이콘을 바꾸면 다시 실행 |

## 로그

- `npm run tauri:dev` 터미널에 Rust 로그와 프론트 로그(`web` 대상)가 함께 나온다.
- 레벨은 환경변수 `GREENTERM_LOG`(error, warn, info, debug, trace)로 바꾼다. 기본 debug.
  `trace`는 출력 flush마다 한 줄을 찍으니 필요할 때만 쓴다.
  PowerShell: `$env:GREENTERM_LOG = "trace"; npm run tauri:dev`
- 출력 청크마다 찍는 로그는 trace에만 둔다. 다른 레벨에서 hot path 로그 금지.

## 설정

- `src-tauri/tauri.conf.json`: 창은 `create: false`(`window.rs`에서 생성), `decorations: false`(자체 타이틀바), `shadow: true`(Windows 11 둥근 모서리와 그림자). CSP는 `'self'`와 IPC만 허용.
- `src-tauri/capabilities/default.json`: 이벤트와 창 조작(닫기, 최소화, 최대화, 드래그)만 허용.
- `tauri.conf.json` `bundle.windows`: 설치 파일 아이콘과 설치 창 이미지(`src-tauri/installer/*.bmp`).
- `src-tauri/installer/hooks.nsh`, `context-menu.wxs`: 탐색기 우클릭 "Open in greenterm" 등록과 제거(NSIS, MSI). 서명 없는 클래식 메뉴라 Windows 11에서는 "추가 옵션 표시" 안에 나온다.
- `build.rs`: `icons/`가 바뀌면 다시 실행되게 해서 exe에 새 아이콘이 들어가게 한다.
- `Cargo.toml` release 프로필: `lto = true`, `codegen-units = 1`, `panic = "abort"`, `strip = true`, `opt-level = "s"`.

## 성능 원칙 (측정으로 확인한 것)

- 계속 도는 CSS 애니메이션은 하나만 있어도 WebView가 매 프레임을 다시 그린다. 대기 CPU가 0.01%에서 0.9%로 오른다. 무한 애니메이션은 출력이 있을 때처럼 필요한 동안에만 켠다.
- 여러 터미널의 fit을 한 프레임에 몰면 long task가 된다(6개에 94ms). `fit-scheduler`의 프레임 예산을 지킨다.
- 측정 수치는 `docs/PERFORMANCE.md`에 있다.
