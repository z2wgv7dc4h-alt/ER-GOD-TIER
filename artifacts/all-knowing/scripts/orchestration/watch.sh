# Claude's watcher: prints new supervisor.log lines, and any NEW visible console window (cmd/powershell/
# bash/terminal) so a popup is caught without the user having to report it.
WT=/c/Users/RIGGUSPIG/Desktop/ER-MASTER-TOOL-wt
n=$(wc -l < "$WT/supervisor.log")
wins() { powershell -NoProfile -c "Get-Process | Where-Object { \$_.MainWindowHandle -ne 0 -and \$_.ProcessName -match 'cmd|powershell|pwsh|bash|conhost|OpenConsole|WindowsTerminal|mintty|node|opencode' } | ForEach-Object { \"\$(\$_.ProcessName)#\$(\$_.Id)\" }" 2>/dev/null | sort; }
base=$(wins)
while true; do
  m=$(wc -l < "$WT/supervisor.log"); [ "$m" -gt "$n" ] && { tail -n $((m-n)) "$WT/supervisor.log"; n=$m; }
  now=$(wins); new=$(comm -13 <(echo "$base") <(echo "$now") | tr '\n' ' ')
  [ -n "${new// /}" ] && echo "WINDOW APPEARED: $new"
  base=$now
  age=$(( ($(date +%s) - $(stat -c %Y "$WT/supervisor.log")) / 60 )); if [ $age -ge 15 ] && [ -s "$WT/queue.tsv" ] && [ "$warned" != 1 ]; then echo "SUPERVISOR SILENT ${age}m with tasks queued"; warned=1; fi; [ $age -lt 15 ] && warned=0
  sleep 30
done
