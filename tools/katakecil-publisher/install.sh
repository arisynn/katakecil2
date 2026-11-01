#!/usr/bin/env sh
set -eu
TASK_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEST_DIR="$HOME/katakecil-publisher"
BIN_DIR="${PREFIX:-$HOME/.local}/bin"
command -v python3 >/dev/null 2>&1 || { printf '%s\n' 'Pasang Python dahulu: pkg install python'; exit 1; }
mkdir -p "$DEST_DIR" "$BIN_DIR"
chmod 700 "$DEST_DIR"
if [ "$TASK_DIR" != "$DEST_DIR" ]; then
  cp "$TASK_DIR/kk.py" "$DEST_DIR/kk.py"
fi
PYTHON_PATH=$(command -v python3)
"$PYTHON_PATH" - "$DEST_DIR" "$BIN_DIR/kk" "$PYTHON_PATH" <<'PY'
import os, shlex, sys
from pathlib import Path
dest, launcher, python = map(Path, sys.argv[1:])
launcher.write_text('#!/usr/bin/env sh\nexec ' + shlex.quote(str(python)) + ' ' + shlex.quote(str(dest / 'kk.py')) + ' "$@"\n')
launcher.chmod(0o755)
PY
if [ -f "$TASK_DIR/aktivasi-kk.json" ]; then
  "$PYTHON_PATH" - "$TASK_DIR/aktivasi-kk.json" <<'PY'
import json, os, sys
from pathlib import Path
target = Path.home() / '.config' / 'katakecil' / 'config.json'
target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
config = json.loads(target.read_text()) if target.exists() else {}
activation = json.loads(Path(sys.argv[1]).read_text())
config.update({k:activation[k] for k in ('url','key','token') if k in activation})
target.write_text(json.dumps(config, ensure_ascii=False, indent=2))
target.chmod(0o600)
PY
fi
printf '\n%s\n' 'Kata Kecil terpasang. Ketik: kk'
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) printf '%s\n' "Tambahkan $BIN_DIR ke PATH, atau jalankan: $BIN_DIR/kk" ;;
esac
