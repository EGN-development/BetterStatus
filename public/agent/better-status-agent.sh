#!/usr/bin/env bash
# Better Status — server metrics agent (zero dependencies, Linux).
# Collects CPU/memory/disk/network + system info and pushes one report.
# Config is read from /etc/better-status-agent.env (BS_URL, BS_TOKEN).
set -euo pipefail

AGENT_VERSION="2"
CONFIG="${BS_CONFIG:-/etc/better-status-agent.env}"
[ -f "$CONFIG" ] && . "$CONFIG"

: "${BS_URL:?BS_URL not set}"
: "${BS_TOKEN:?BS_TOKEN not set}"

# ---- counters helpers ----
read_cpu() { awk '/^cpu /{idle=$5+$6; total=0; for(i=2;i<=NF;i++) total+=$i; print idle, total}' /proc/stat; }
read_net() { awk 'NR>2{gsub(/:/,""); if($1!="lo"){rx+=$2; tx+=$10}} END{print rx+0, tx+0}' /proc/net/dev; }
# sum sectors (read field 6, written field 10) for whole disks only
read_disk() { awk '$3 ~ /^(sd[a-z]+|vd[a-z]+|xvd[a-z]+|hd[a-z]+|nvme[0-9]+n[0-9]+|mmcblk[0-9]+)$/ {r+=$6; w+=$10} END{print (r+0), (w+0)}' /proc/diskstats; }

# ---- 1s sample window for rates ----
read cpu_idle1 cpu_total1 < <(read_cpu)
read net_rx1 net_tx1 < <(read_net)
read disk_r1 disk_w1 < <(read_disk)
sleep 1
read cpu_idle2 cpu_total2 < <(read_cpu)
read net_rx2 net_tx2 < <(read_net)
read disk_r2 disk_w2 < <(read_disk)

didle=$((cpu_idle2 - cpu_idle1)); dtotal=$((cpu_total2 - cpu_total1))
if [ "$dtotal" -gt 0 ]; then cpu_pct=$(awk "BEGIN{printf \"%.1f\", (1 - $didle/$dtotal)*100}"); else cpu_pct=0; fi

net_io=$(( (net_rx2 - net_rx1) + (net_tx2 - net_tx1) ))               # bytes/sec
disk_io=$(( ((disk_r2 - disk_r1) + (disk_w2 - disk_w1)) * 512 ))      # bytes/sec
[ "$net_io" -lt 0 ] && net_io=0
[ "$disk_io" -lt 0 ] && disk_io=0

# ---- memory ----
mem_total_kb=$(awk '/^MemTotal:/{print $2}' /proc/meminfo)
mem_avail_kb=$(awk '/^MemAvailable:/{print $2}' /proc/meminfo)
swap_total_kb=$(awk '/^SwapTotal:/{print $2}' /proc/meminfo)
swap_free_kb=$(awk '/^SwapFree:/{print $2}' /proc/meminfo)
mem_total=$((mem_total_kb * 1024))
mem_used=$(((mem_total_kb - mem_avail_kb) * 1024))
swap_total=$((swap_total_kb * 1024))
swap_used=$(((swap_total_kb - swap_free_kb) * 1024))

# ---- disk (root filesystem) ----
read disk_used disk_total < <(df -PB1 / | awk 'NR==2{print $3, $2}')

# ---- load / uptime / processes ----
read load1 load5 load15 _ < /proc/loadavg
uptime_sec=$(awk '{printf "%d", $1}' /proc/uptime)
proc_count=$(ls -d /proc/[0-9]* 2>/dev/null | wc -l)

# ---- system info ----
host=$(hostname 2>/dev/null || echo unknown)
if [ -r /etc/os-release ]; then os=$(. /etc/os-release; echo "${PRETTY_NAME:-$NAME}"); else os=$(uname -sr); fi
cpu_model=$(awk -F': ' '/^model name/{print $2; exit}' /proc/cpuinfo 2>/dev/null)
[ -z "$cpu_model" ] && cpu_model=$(awk -F': ' '/^Model/{print $2; exit}' /proc/cpuinfo 2>/dev/null)
[ -z "$cpu_model" ] && cpu_model="Unknown CPU"
cpu_threads=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo)

# JSON-escape the cpu model (quotes/backslashes)
cpu_model_esc=$(printf '%s' "$cpu_model" | sed 's/\\/\\\\/g; s/"/\\"/g')
host_esc=$(printf '%s' "$host" | sed 's/\\/\\\\/g; s/"/\\"/g')
os_esc=$(printf '%s' "$os" | sed 's/\\/\\\\/g; s/"/\\"/g')

payload=$(cat <<JSON
{"hostname":"$host_esc","os":"$os_esc","cpuModel":"$cpu_model_esc","cpuThreads":$cpu_threads,"cpuPct":$cpu_pct,"memUsed":$mem_used,"memTotal":$mem_total,"swapUsed":$swap_used,"swapTotal":$swap_total,"diskUsed":$disk_used,"diskTotal":$disk_total,"netRxBytes":$net_rx2,"netTxBytes":$net_tx2,"netIoBytes":$net_io,"diskIoBytes":$disk_io,"load1":$load1,"load5":$load5,"load15":$load15,"uptimeSec":$uptime_sec,"procCount":$proc_count,"agentVersion":$AGENT_VERSION}
JSON
)

curl -fsS --max-time 15 -X POST "$BS_URL/api/agent/ingest" \
  -H "Authorization: Bearer $BS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$payload" >/dev/null && echo "reported: cpu=${cpu_pct}% mem=${mem_used} net_io=${net_io}B/s disk_io=${disk_io}B/s"
