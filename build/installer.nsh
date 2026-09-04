!macro customHeader
  BrandingText "App MyQ Desktop Suite • Minimalist Pro Edition"
!macroend

!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Selamat Datang di App MyQ"
  !define MUI_WELCOMEPAGE_TEXT "Aplikasi Desktop Media Compressor, AI Super-Resolution, Converter, dan Adobe Downgrader.$\r$\n$\r$\nSetup wizard ini akan memandu proses pemasangan App MyQ pada komputer Anda.$\r$\n$\r$\nKlik Lanjut untuk melanjutkan instalasi."
  !insertmacro MUI_PAGE_WELCOME
!macroend
