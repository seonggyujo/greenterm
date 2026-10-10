; NSIS installer hooks (tauri.conf.json > bundle.windows.nsis.installerHooks).
; Adds "Open in greenterm" to the Explorer context menu of folders, folder
; backgrounds and drives. These are classic menu entries: on Windows 11 they
; appear under "Show more options". Per-user keys, removed on uninstall.
; Uninstalling also removes greenterm's Claude Code hooks.

!macro GT_MENU_KEY KEY
  WriteRegStr HKCU "${KEY}" "" "Open in greenterm"
  WriteRegStr HKCU "${KEY}" "Icon" "$INSTDIR\greenterm.exe"
  WriteRegStr HKCU "${KEY}\command" "" '"$INSTDIR\greenterm.exe" "%V"'
!macroend

!macro NSIS_HOOK_POSTINSTALL
  !insertmacro GT_MENU_KEY "Software\Classes\Directory\shell\greenterm"
  !insertmacro GT_MENU_KEY "Software\Classes\Directory\Background\shell\greenterm"
  !insertmacro GT_MENU_KEY "Software\Classes\Drive\shell\greenterm"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; greenterm's Claude Code hooks in ~/.claude/settings.json, if any. Also on
  ; an upgrade; the new version puts them back when it starts.
  ExecWait '"$INSTDIR\greenterm.exe" --remove-agent-hooks'
  DeleteRegKey HKCU "Software\Classes\Directory\shell\greenterm"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\greenterm"
  DeleteRegKey HKCU "Software\Classes\Drive\shell\greenterm"
!macroend
