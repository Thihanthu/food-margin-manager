import os
import subprocess
import sys
import time
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / "nara-sar"
REPO = "YeeNyunn/nara-sar"
FILES = [
    "onnx/acoustic.onnx",
    "sar.json",
    "language.lm",
    "sar_decoder.py",
    "sar_syllables.py",
    "transcribe.py",
    "LICENSE",
    "NOTICE",
    "ATTRIBUTION.md",
    "THIRD_PARTY.md",
]

if sys.version_info[:2] != (3, 11):
    raise SystemExit("Nara SAR setup requires Python 3.11.")

MODEL_DIR.mkdir(parents=True, exist_ok=True)
os.environ["HF_HUB_DISABLE_XET"] = "1"
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "600")
os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "60")

subprocess.run(
    [
        sys.executable,
        "-m",
        "pip",
        "install",
        "huggingface_hub",
        "-r",
        "https://huggingface.co/YeeNyunn/nara-sar/raw/main/requirements.txt",
    ],
    check=True,
)

try:
    from huggingface_hub import snapshot_download

    for attempt in range(1, 4):
        try:
            snapshot_download(
                repo_id=REPO,
                local_dir=str(MODEL_DIR),
                allow_patterns=FILES,
            )
            break
        except Exception:
            if attempt == 3:
                raise
            wait = attempt * 5
            print(
                f"Download interrupted; partial files will resume. "
                f"Retrying in {wait}s ({attempt}/3).",
                flush=True,
            )
            time.sleep(wait)
except Exception as error:
    raise SystemExit(
        f"Nara SAR model download failed: {error}\n"
        "Check the network and available disk space, then run this setup command again; "
        "Hugging Face Hub will resume partial downloads."
    ) from error

missing = [name for name in FILES if not (MODEL_DIR / name).is_file()]
if missing:
    raise SystemExit("Nara SAR download is incomplete. Missing: " + ", ".join(missing))

model_size = (MODEL_DIR / "onnx" / "acoustic.onnx").stat().st_size
if model_size < 350_000_000:
    raise SystemExit(
        f"Nara acoustic model is incomplete ({model_size:,} bytes). "
        "Run this setup command again to resume the download."
    )

print(f"Nara SAR downloaded to {MODEL_DIR}")
