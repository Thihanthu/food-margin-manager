# SPDX-License-Identifier: Apache-2.0
"""Local-only HTTP companion for Nara SAR audio transcription."""

import base64
import json
import os
import subprocess
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = int(os.environ.get("NARA_PORT", "8765"))
MODEL_DIR = Path(os.environ.get("NARA_MODEL_DIR", str(Path(__file__).resolve().parent.parent / "nara-sar")))
TRANSCRIBE = MODEL_DIR / "transcribe.py"


class Handler(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        if self.path != "/health":
            self.send_json(404, {"error": "Not found"})
            return
        ready = TRANSCRIBE.exists()
        self.send_json(200, {"ready": ready, "engine": "Nara SAR", "modelDir": str(MODEL_DIR)})

    def do_POST(self):
        if self.path != "/transcribe":
            self.send_json(404, {"error": "Not found"})
            return
        if not TRANSCRIBE.exists():
            self.send_json(503, {"error": "Nara model is not installed. Run scripts/setup_nara.py first."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            audio = base64.b64decode(payload["audio"], validate=True)
            if len(audio) > 256 * 1024 * 1024:
                self.send_json(413, {"error": "Audio exceeds 256 MiB"})
                return
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as file:
                file.write(audio)
                audio_path = file.name
            try:
                result = subprocess.run(
                    [sys.executable, str(TRANSCRIBE), "--audio", audio_path, "--json"],
                    cwd=str(MODEL_DIR),
                    capture_output=True,
                    text=True,
                    timeout=120,
                    check=False,
                )
                if result.returncode != 0:
                    self.send_json(422, {"error": result.stderr.strip() or "Transcription failed"})
                    return
                parsed = json.loads(result.stdout)
                self.send_json(200, {"text": parsed["text"], "details": parsed})
            finally:
                Path(audio_path).unlink(missing_ok=True)
        except Exception as error:
            self.send_json(400, {"error": str(error)})


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Nara SAR companion listening on http://{HOST}:{PORT}")
    server.serve_forever()
