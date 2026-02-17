' Script VBS para iniciar o proxy em segundo plano (sem janela)
' Coloque um atalho deste arquivo na pasta Inicializar do Windows
'
' Para adicionar à inicialização automática:
' 1. Pressione Win+R
' 2. Digite: shell:startup
' 3. Copie um atalho deste arquivo .vbs para essa pasta

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "cmd /c node server.js > proxy-log.txt 2>&1", 0, False
