"""
Thread-safe Circular Ring Buffer for Low-Latency Real-Time Audio
"""
import threading
import numpy as np

class CircularAudioBuffer:
    """
    High-performance circular ring buffer stored in system RAM.
    Allows continuous write from PortAudio callback thread and
    instantaneous, non-blocking extraction of pre/post-trigger audio.
    """
    def __init__(self, capacity_samples: int):
        self.capacity = int(capacity_samples)
        self.buffer = np.zeros(self.capacity, dtype=np.float32)
        self.write_ptr = 0
        self.total_samples_written = 0
        self.lock = threading.Lock()

    def write(self, samples: np.ndarray) -> None:
        """
        Writes incoming audio samples into the circular buffer with thread safety.
        Handles wrapping around the end boundary seamlessly.
        """
        n = len(samples)
        if n == 0:
            return

        with self.lock:
            if n >= self.capacity:
                # If incoming chunk is larger than capacity, only keep latest capacity samples
                self.buffer[:] = samples[-self.capacity:]
                self.write_ptr = 0
            else:
                end_ptr = self.write_ptr + n
                if end_ptr <= self.capacity:
                    self.buffer[self.write_ptr:end_ptr] = samples
                    self.write_ptr = end_ptr % self.capacity
                else:
                    first_part = self.capacity - self.write_ptr
                    second_part = n - first_part
                    self.buffer[self.write_ptr:] = samples[:first_part]
                    self.buffer[:second_part] = samples[first_part:]
                    self.write_ptr = second_part

            self.total_samples_written += n

    def get_latest(self, n_samples: int) -> np.ndarray:
        """
        Extracts the most recent `n_samples` from the buffer in chronological order.
        """
        n = int(n_samples)
        if n > self.capacity:
            raise ValueError(f"Requested {n} samples exceeds buffer capacity of {self.capacity}")

        with self.lock:
            if self.write_ptr >= n:
                return self.buffer[self.write_ptr - n:self.write_ptr].copy()
            else:
                tail_len = n - self.write_ptr
                part1 = self.buffer[self.capacity - tail_len:]
                part2 = self.buffer[:self.write_ptr]
                return np.concatenate((part1, part2))

    def clear(self) -> None:
        """Resets the buffer."""
        with self.lock:
            self.buffer.fill(0)
            self.write_ptr = 0
            self.total_samples_written = 0
