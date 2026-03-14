#!/usr/bin/env bash
set -euo pipefail

DISPLAY_ID="${DISPLAY_ID:-:1}"
export DISPLAY="${DISPLAY:-$DISPLAY_ID}"
ANDROID_AVD_NAME="${ANDROID_AVD_NAME:-expo-emulator}"
BACKEND_PROXY_PORT="${BACKEND_PROXY_PORT:-4000}"
EXPO_PROXY_PORT="${EXPO_PROXY_PORT:-8081}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
VNC_PORT="${VNC_PORT:-5900}"
LOG_DIR="${LOG_DIR:-/workspace/logs}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/android-emulator.log}"
ANDROID_LAUNCH_URL="${ANDROID_LAUNCH_URL:-}"
ADB_DEVICE_SERIAL="${ADB_DEVICE_SERIAL:-emulator-5554}"

PIDS=()

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

cleanup() {
  local exit_code=$?

  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done

  wait || true
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

wait_for_port() {
  local host="$1"
  local port="$2"
  local label="$3"

  for _ in $(seq 1 90); do
    if python3 - "$host" "$port" <<'PY'
import socket
import sys

host = sys.argv[1]
port = int(sys.argv[2])

sock = socket.socket()
sock.settimeout(1)
try:
    sock.connect((host, port))
except OSError:
    sys.exit(1)
finally:
    sock.close()
sys.exit(0)
PY
    then
      echo "${label} is reachable on ${host}:${port}."
      return 0
    fi
    sleep 2
  done

  echo "Timed out waiting for ${label} on ${host}:${port}."
  return 1
}

start_reverse_proxy() {
  local label="$1"
  local listen_port="$2"
  local target="$3"

  if [ -z "$target" ]; then
    return
  fi

  local target_host="${target%%:*}"
  local target_port="${target##*:}"

  echo "Proxying emulator localhost:${listen_port} to ${target} (${label})..."
  socat "TCP-LISTEN:${listen_port},fork,reuseaddr" "TCP:${target_host}:${target_port}" &
  PIDS+=("$!")
  adb reverse "tcp:${listen_port}" "tcp:${listen_port}" >/dev/null
}

open_expo_in_emulator() {
  local expo_target="${EXPO_PROXY_TARGET:-}"
  local launch_host="127.0.0.1"
  local launch_port="$EXPO_PROXY_PORT"
  local launch_url="$ANDROID_LAUNCH_URL"

  if [ -n "$expo_target" ]; then
    launch_host="${expo_target%%:*}"
    launch_port="${expo_target##*:}"
  fi

  wait_for_port "$launch_host" "$launch_port" "Expo dev server"

  if [ -z "$launch_url" ]; then
    launch_url="exp://127.0.0.1:${launch_port}"
  fi

  # Install Expo Go if it is not already present on the emulator.
  if [ -f /opt/expo-go.apk ]; then
    if ! adb -s "$ADB_DEVICE_SERIAL" shell pm list packages 2>/dev/null | grep -q "host.exp.exponent"; then
      echo "Installing Expo Go on emulator..."
      adb -s "$ADB_DEVICE_SERIAL" install /opt/expo-go.apk \
        || echo "Warning: Expo Go install failed. Open exp://127.0.0.1:${EXPO_PROXY_PORT} manually inside the emulator."
    fi
  fi

  echo "Launching Expo in Android emulator via ${launch_url}..."
  adb -s "$ADB_DEVICE_SERIAL" shell am start -a android.intent.action.VIEW -d "$launch_url" >/dev/null \
    || echo "Warning: could not launch Expo Go automatically. Open ${launch_url} manually inside the emulator."
}

echo "Starting Xvfb on ${DISPLAY_ID}..."
Xvfb "$DISPLAY_ID" -screen 0 1280x800x24 -ac +extension GLX +render -noreset &
PIDS+=("$!")
sleep 1

EMULATOR_ACCEL="on"
if [ ! -r /dev/kvm ] || [ ! -w /dev/kvm ]; then
  echo "KVM is not accessible inside the emulator container. Hardware acceleration cannot start."
  echo "Check /dev/kvm passthrough and Docker permissions on the host."
  exit 1
fi

echo "Starting Android emulator (${ANDROID_AVD_NAME}) with accel=${EMULATOR_ACCEL}..."
/opt/android-sdk/emulator/emulator "@${ANDROID_AVD_NAME}" \
  -gpu swiftshader_indirect \
  -no-metrics \
  -no-audio \
  -no-snapshot \
  -no-boot-anim \
  -accel "${EMULATOR_ACCEL}" &
PIDS+=("$!")

echo "Starting VNC server on :${VNC_PORT}..."
x11vnc -display "$DISPLAY_ID" -forever -shared -nopw -listen 0.0.0.0 -rfbport "$VNC_PORT" -noxdamage -nowf -noscr -repeat -xkb &
PIDS+=("$!")

echo "Starting noVNC on :${NOVNC_PORT}..."
if [ -x /usr/share/novnc/utils/novnc_proxy ]; then
  /usr/share/novnc/utils/novnc_proxy --listen "0.0.0.0:${NOVNC_PORT}" --vnc "localhost:${VNC_PORT}" &
else
  websockify --web=/usr/share/novnc/ "0.0.0.0:${NOVNC_PORT}" "localhost:${VNC_PORT}" &
fi
PIDS+=("$!")

echo "Waiting for emulator ADB connection..."
adb start-server >/dev/null
adb wait-for-device
adb -s "$ADB_DEVICE_SERIAL" wait-for-device
echo "Waiting for Android boot completion..."
adb -s "$ADB_DEVICE_SERIAL" shell 'while [ "$(getprop sys.boot_completed 2>/dev/null | tr -d "\r")" != "1" ]; do sleep 2; done'

start_reverse_proxy "backend" "$BACKEND_PROXY_PORT" "${BACKEND_PROXY_TARGET:-}"
start_reverse_proxy "expo" "$EXPO_PROXY_PORT" "${EXPO_PROXY_TARGET:-}"

open_expo_in_emulator

echo "Android emulator is ready."

wait
