<p align="center">
  <img src="src-tauri/icons/128x128.png" width="96" alt="greenterm 아이콘">
</p>

<h1 align="center">greenterm</h1>

<p align="center">
  <b>+</b> 버튼만 누르면 알아서 화면을 나누는 가벼운 Windows 터미널 앱.
  <br>
  <a href="README.md">English</a> · <b>한국어</b>
</p>

---

greenterm은 한 창에 셸 여러 개를 나란히 띄우고 배치를 자동으로 맞춰 줘요. 외울 분할 단축키는
없고 모든 조작은 버튼과 끌기로 해요. 터미널 안쪽은 건드리지 않아요. 기본 색 그대로, 셸이 출력한
그대로 보여 줘요. 대신 터미널을 감싼 창에 초록(또는 블랙) 테마를 입혀서 어떤 셸이 살아서
일하고 있는지 한눈에 보이게 했어요.

Tauri v2, vanilla TypeScript, xterm.js(WebGL), ConPTY로 만들었어요.

## 기능

### 자동 분할

**+ New terminal**을 누르면 배치를 다시 계산해요. 1개면 전체 화면, 2개는 좌우, 3개는 위 2개와
아래 넓은 1개, 4개는 2x2, 5~6개는 3x2예요. 마지막 줄이 비면 남은 pane이 넓어져서 채워요.
pane을 닫으면 나머지가 부드럽게 자리를 옮겨요.

![자동 분할](docs/media/split.gif)

### 끌어서 배치

pane 헤더를 잡고 다른 pane 위에 놓아요. 가장자리 쪽에 놓으면 그쪽으로 나누고(놓일 자리를 미리
보여 줘요), 가운데에 놓으면 두 pane 자리를 바꿔요. Esc를 누르면 취소돼요. pane 사이 틈을 끌면
크기가 바뀌고, 더블클릭하면 반반으로 돌아가요. 직접 배치한 뒤에는 **+**가 선택된 pane의 긴
쪽을 반으로 나눠 새 pane을 넣고, 타이틀바에 격자 버튼이 생겨요. 누르면 자동 분할로 돌아가요.

![끌어서 배치](docs/media/arrange.gif)

### 셸 선택, 폴더, 실행 시간

▾ 메뉴에는 이 PC에 설치된 셸(PowerShell 7, Windows PowerShell, cmd, Git Bash)만 나오고,
여기서 고른 셸을 **+** 버튼이 열어요. pane 헤더에는 셸 이름, 현재 폴더, 실행 중인 프로그램이
정한 제목, 실행 시간이 보여요.

![셸 메뉴와 pane 헤더](docs/media/shells.gif)

### 살아 있는 표시

출력이 들어오면 pane 테두리가 반짝이고 상태 점이 몇 초간 깜빡여서 바쁜 터미널이 눈에 띄어요.
`exit`하면 Windows Terminal처럼 pane이 닫히고(설정에서 끌 수 있어요), 오류 코드로 끝나면
pane을 남긴 채 붉은 exit 뱃지를 보여 줘요.

![출력 표시](docs/media/activity.gif)

### 웹 페이지

▾ 메뉴 맨 아래 **Web page**를 누르면 웹 페이지가 pane으로 열려요. 기본은 YouTube예요.
헤더에 뒤로, 새로고침, 주소창(검색어도 돼요)이 있고, 터미널처럼 끌어서 나누고 옮기고 크기를
바꿀 수 있어요. 새 창으로 열리는 링크는 기본 브라우저로 열려요.

웹 pane은 WebView2로 돌아가고, 쓰시는 브라우저와도 greenterm 설정과도 분리된 전용 프로필을
써요. Google이 앱에 넣은 브라우저의 로그인을 막아서 YouTube는 로그인 없이 쓰게 돼요. 메뉴나 설정 창을 열거나 pane을 끄는
동안에는 웹 화면이 잠깐 비켜 있다가 닫으면 돌아와요.

![웹 페이지 pane](docs/media/web.gif)

### 설정

타이틀바의 톱니 버튼을 누르면 설정 창이 열려요. 창 테마(초록, 블랙), 터미널 글씨 크기,
애니메이션 켜고 끄기, 정상 `exit` 때 pane 닫기, 웹 시작 페이지를 바꿀 수 있어요. 바꾸면 바로
적용되고 다음 실행에도 기억해요. 아래 두 버튼은 한 번 더 물어본 뒤에 동작해요. **Clear**는 웹
pane의 쿠키, 방문 기록, 사이트 데이터를 지우고, **Reset**은 모든 설정을 기본값으로 되돌려요.

![설정](docs/media/settings.gif)

### 그 밖에

- 탐색기에서 폴더나 드라이브를 우클릭하면 **Open in greenterm**이 있어요(Windows 11은 "추가 옵션 표시" 안). greenterm이 이미 켜져 있으면 그 창에 새 pane으로 열려요.
- 출력에 나온 링크는 Ctrl+클릭하면 기본 브라우저로 열려요(http, https만).
- 파일을 pane에 끌어다 놓으면 Windows Terminal처럼 경로가 입력돼요. CLI 도구에 이미지를 첨부할 때 편해요.
- 우클릭: 선택한 글자가 있으면 복사, 없으면 붙여넣기(Windows 콘솔과 같음). Ctrl+C는 선택이
  있으면 복사, 없으면 중단. Ctrl+V는 붙여넣기.
- 터미널에서는 브라우저 단축키(F5, Ctrl+R, Ctrl+F 등)가 WebView에서 동작하지 않고 셸로 가요.
- macOS 스타일 타이틀바와 신호등 버튼(Windows 순서).
- 한글 IME 입력이 되고, 출력을 바이트 그대로 다뤄서 한글이 중간에 잘려 깨지지 않아요.

## 성능

Windows 11, 논리 코어 12개, release 빌드에서 측정했어요. 자세한 내용은
[docs/PERFORMANCE.md](docs/PERFORMANCE.md)에 있어요.

| | pane 1개 | pane 6개 |
| --- | --- | --- |
| 대기 CPU | 0.01% | 0.03% |
| 앱 메모리(앱 + WebView2) | 69.7 MB | 87.5 MB |

pane 6개에서 `Get-ChildItem -Recurse C:\Windows`를 동시에 돌려도 앱 메모리는 최고 99 MB에서
다시 내려왔고, 50ms를 넘는 long task는 한 번도 없었어요.

## 필요한 것

- WebView2 런타임이 있는 Windows 10 또는 11(Windows 11에는 기본 설치)
- 빌드하려면: [Node.js](https://nodejs.org/) 20 이상, [Rust](https://rustup.rs/) stable,
  [Tauri Windows 사전 준비](https://tauri.app/start/prerequisites/)

## 빌드와 실행

```powershell
npm install
npm run tauri:dev                    # 개발 실행, 로그가 터미널에 나옴
npm run tauri build -- --no-bundle   # release exe: src-tauri\target\release\greenterm.exe
npm run tauri build                  # release exe와 설치 프로그램
```

개발 실행 중에는 Rust와 프론트 로그가 `tauri:dev` 터미널에 함께 나와요. 로그 레벨은
`GREENTERM_LOG` 환경변수(`error`, `warn`, `info`, `debug`(기본), `trace`)로 바꿔요.

## 구조

파일 하나는 기능 하나만 맡고 약 150줄 안쪽으로 유지해요. 모듈별 지도는
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)에 있어요.
README의 GIF는 [scripts/demo](scripts/demo/README.md)의 스크립트로 녹화해요.

## 라이선스

[MIT](LICENSE)
