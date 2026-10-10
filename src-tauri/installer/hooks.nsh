; NSIS installer hooks (tauri.conf.json > bundle.windows.nsis.installerHooks).
; Adds "Open in Heron" to the Explorer context menu of folders, folder
; backgrounds and drives. These are classic menu entries: on Windows 11 they
; appear under "Show more options". Per-user keys, removed on uninstall.
; Uninstalling also removes Heron's Claude Code hooks.

!macro GT_MENU_KEY KEY
  WriteRegStr HKCU "${KEY}" "" "Open in Heron"
  WriteRegStr HKCU "${KEY}" "Icon" "$INSTDIR\heron.exe"
  WriteRegStr HKCU "${KEY}\command" "" '"$INSTDIR\heron.exe" "%V"'
!macroend

!macro NSIS_HOOK_POSTINSTALL
  !insertmacro GT_MENU_KEY "Software\Classes\Directory\shell\heron"
  !insertmacro GT_MENU_KEY "Software\Classes\Directory\Background\shell\heron"
  !insertmacro GT_MENU_KEY "Software\Classes\Drive\shell\heron"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Heron's Claude Code hooks in ~/.claude/settings.json, if any. Also on
  ; an upgrade; the new version puts them back when it starts.
  ExecWait '"$INSTDIR\heron.exe" --remove-agent-hooks'
  DeleteRegKey HKCU "Software\Classes\Directory\shell\heron"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\heron"
  DeleteRegKey HKCU "Software\Classes\Drive\shell\heron"
!macroend
