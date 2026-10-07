# One-line-per-task status for DeepSeek runs: last log write, commits on branch, report, running?
cd /c/Users/RIGGUSPIG/Desktop/ER-MASTER-TOOL-wt
run=$(powershell -NoProfile -c "(Get-CimInstance Win32_Process -Filter \"Name='opencode.exe'\").CommandLine" | grep -o "title task-[0-9]*" | sed 's/title task-//' | tr '\n' ' ')
echo "$(date +%H:%M) running: ${run:-none}"
for t in "$@"; do
  lf=$(ls -t task-$t.log task-${t}?.log 2>/dev/null | head -1)
  l=$(stat -c '%y' "$lf" 2>/dev/null | cut -c12-16)
  n=$(git -C task-$t log --oneline master..HEAD 2>/dev/null | grep -c "Task $t")
  r=$([ -f task-$t/artifacts/all-knowing/docs/tasks/$t-report.md ] && echo yes || echo no)
  err=$(tail -c 300 "$lf" 2>/dev/null | grep -o "Insufficient Balance\|Error: [^ ]*" | head -1)
  echo "$t log:${l:--} commits:$n report:$r ${err}"
done
