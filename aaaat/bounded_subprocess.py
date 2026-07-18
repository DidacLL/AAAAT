from __future__ import annotations

import queue
import subprocess
import threading
import time
from dataclasses import dataclass
from typing import Mapping, Sequence

_READ_CHUNK_BYTES = 64 * 1024
_POLL_SECONDS = 0.02
_JOIN_SECONDS = 5.0


class OutputLimitExceeded(RuntimeError):
    def __init__(self, stream_name: str, limit_bytes: int) -> None:
        self.stream_name = stream_name
        self.limit_bytes = int(limit_bytes)
        super().__init__(f"{stream_name} exceeded the {limit_bytes}-byte safety limit")


@dataclass(frozen=True)
class BoundedProcessResult:
    returncode: int
    stdout: str
    stderr: str


def run_bounded_process(
    argv: Sequence[str],
    *,
    input_text: str | None,
    timeout_seconds: int,
    stdout_limit_bytes: int,
    stderr_limit_bytes: int,
    environment: Mapping[str, str] | None = None,
) -> BoundedProcessResult:
    """Run a child process while enforcing output limits during execution."""
    command = [str(item) for item in argv]
    process = subprocess.Popen(
        command,
        stdin=subprocess.PIPE if input_text is not None else subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=dict(environment) if environment is not None else None,
    )
    if process.stdout is None or process.stderr is None:
        process.kill()
        process.wait()
        raise RuntimeError("Could not open bounded subprocess output streams")

    buffers: dict[str, bytearray] = {
        "stdout": bytearray(),
        "stderr": bytearray(),
    }
    events: queue.Queue[tuple[str, str]] = queue.Queue()

    def reader(stream_name: str, limit: int) -> None:
        stream = process.stdout if stream_name == "stdout" else process.stderr
        assert stream is not None
        try:
            while True:
                chunk = stream.read(_READ_CHUNK_BYTES)
                if not chunk:
                    return
                buffer = buffers[stream_name]
                remaining = limit - len(buffer)
                if remaining <= 0 or len(chunk) > remaining:
                    if remaining > 0:
                        buffer.extend(chunk[:remaining])
                    events.put(("limit", stream_name))
                    return
                buffer.extend(chunk)
        finally:
            stream.close()

    def writer() -> None:
        if input_text is None or process.stdin is None:
            return
        try:
            process.stdin.write(input_text.encode("utf-8"))
            process.stdin.flush()
        except (BrokenPipeError, OSError):
            pass
        finally:
            process.stdin.close()

    readers = [
        threading.Thread(target=reader, args=("stdout", int(stdout_limit_bytes)), daemon=True),
        threading.Thread(target=reader, args=("stderr", int(stderr_limit_bytes)), daemon=True),
    ]
    for thread in readers:
        thread.start()
    input_thread = threading.Thread(target=writer, daemon=True)
    input_thread.start()

    deadline = time.monotonic() + max(1, int(timeout_seconds))
    limit_stream = ""
    timed_out = False
    while process.poll() is None:
        try:
            event, stream_name = events.get_nowait()
        except queue.Empty:
            event = ""
            stream_name = ""
        if event == "limit":
            limit_stream = stream_name
            process.kill()
            break
        if time.monotonic() >= deadline:
            timed_out = True
            process.kill()
            break
        time.sleep(_POLL_SECONDS)

    try:
        returncode = process.wait(timeout=_JOIN_SECONDS)
    except subprocess.TimeoutExpired:
        process.kill()
        returncode = process.wait()

    input_thread.join(timeout=_JOIN_SECONDS)
    for thread in readers:
        thread.join(timeout=_JOIN_SECONDS)

    while not events.empty() and not limit_stream:
        event, stream_name = events.get_nowait()
        if event == "limit":
            limit_stream = stream_name

    if timed_out:
        raise subprocess.TimeoutExpired(command, timeout_seconds)
    if limit_stream:
        limit = stdout_limit_bytes if limit_stream == "stdout" else stderr_limit_bytes
        raise OutputLimitExceeded(limit_stream, int(limit))

    return BoundedProcessResult(
        returncode=int(returncode),
        stdout=bytes(buffers["stdout"]).decode("utf-8", errors="replace"),
        stderr=bytes(buffers["stderr"]).decode("utf-8", errors="replace"),
    )
