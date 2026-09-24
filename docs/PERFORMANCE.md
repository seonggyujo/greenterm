# 성능 측정 결과

측정일 2026-09-24. Windows 11, 논리 코어 12개, release 빌드(`npm run tauri build -- --no-bundle`).
셸은 Windows PowerShell 5.1.

- 앱 = `greenterm.exe`와 WebView2 프로세스들(총 6개)
- 셸 = 그 아래 셸과 conhost
- CPU는 작업 관리자 방식(전체 코어 대비 %)
- 메모리는 private working set(작업 관리자 "메모리" 열)

## 대기

| 상태 | 앱 CPU | 앱 메모리 | 셸 메모리 |
| --- | --- | --- | --- |
| pane 1개 | 0.01% | 69.7 MB | 26.6 MB |
| pane 6개 | 0.03% | 87.5 MB | 159.4 MB |

pane 하나가 늘 때 앱 메모리는 약 3.6 MB 늘어난다. 셸 메모리는 PowerShell 자체 크기(개당 약 26 MB)다.

## 대량 출력: pane 6개에서 `Get-ChildItem -Recurse C:\Windows` 동시 실행

| 항목 | 값 |
| --- | --- |
| 앱 메모리 | 대기 87.5 MB, 부하 중 최고 99.0 MB, 끝난 뒤 89.7 MB |
| 전체 CPU(부하 구간) | 약 45%. 그중 앱 몫은 약 15%(전체 코어 대비 6~7%), 나머지는 PowerShell의 파일 탐색 |
| UI | 부하 중 창 이동, 클릭이 부드러움(사용자 확인) |
| flow control pause | 0회. 프론트가 한 번도 뒤처지지 않음 |

## long task (dev 빌드, `app/perf-monitor.ts`)

| 상황 | 결과 |
| --- | --- |
| pane 6개 대량 출력 | 0건 |
| 최대화·복원, 수정 전 | 94ms, 60ms. 6개 fit을 한 프레임에서 처리 |
| 최대화·복원 4회, 수정 후(프레임당 fit 예산 10ms) | 0건 |
| 앱 시작 | 1건(78ms, 첫 로딩) |

## 개선 기록

| 문제 | 원인 | 조치 | 결과 |
| --- | --- | --- | --- |
| 대기 CPU 0.56~0.9% | 상태 점 무한 pulse 때문에 WebView가 매 프레임 다시 그림 | 출력 뒤 3초 동안만 pulse | 0.01% |
| 최소화해도 CPU 그대로 | WebView2는 최소화해도 `document.hidden`이 false | Tauri 창 최소화 이벤트로 감지 | 최소화 시 애니메이션·타이머 정지 |
| 최대화 때 long task 94ms | pane 6개 fit을 한 프레임에 몰아서 처리 | 프레임당 10ms 예산 | 0건 |

## 다시 재는 법

1. `npm run tauri build -- --no-bundle`
2. `src-tauri\target\release\greenterm.exe` 실행
3. 작업 관리자 "세부 정보" 탭에서 `greenterm.exe`와 그 아래 `msedgewebview2.exe`들의 CPU와 메모리 합계를 본다.
4. long task는 `npm run tauri:dev` 로그에서 `[perf] long task` 줄을 본다.
