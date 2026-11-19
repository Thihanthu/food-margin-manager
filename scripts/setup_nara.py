import subprocess
import sys
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / "nara-sar"
REPO = "YeeNyunn/nara-sar"

if sys.version_info[:2] != (3, 11):
    raise SystemExit("Nara SAR setup requires Python 3.11.")

MODEL_DIR.mkdir(parents=True, exist_ok=True)

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

    snapshot_download(
        repo_id=REPO,
        local_dir=str(MODEL_DIR),
        allow_patterns=[
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
        ],
    )
except Exception as error:
    raise SystemExit(f"Nara SAR model download failed: {error}") from error

print(f"Nara SAR downloaded to {MODEL_DIR}")
