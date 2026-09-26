import threading
import numpy as np

class CircularAudioBuffer:
    def __init__(self, capacity_samples: int):
        self.capacity = int(capacity_samples)
        self.buffer = np.zeros(self.capacity, dtype=np.float32)
        self.write_ptr = 0
        self.total_samples_written = 0
        self.lock = threading.Lock()

    def write(self, samples: np.ndarray) -> None:
        n = len(samples)
        if n == 0:
            return
        with self.lock:
            if n >= self.capacity:
                self.buffer[:] = samples[-self.capacity:]
                self.write_ptr = 0
            else:
                end_ptr = self.write_ptr + n
                if end_ptr <= self.capacity:
                    self.buffer[self.write_ptr:end_ptr] = samples
                    self.write_ptr = end_ptr % self.capacity
                else:
                    p1 = self.capacity - self.write_ptr
                    self.buffer[self.write_ptr:] = samples[:p1]
                    self.buffer[:n - p1] = samples[p1:]
                    self.write_ptr = n - p1
            self.total_samples_written += n

    def get_latest(self, n_samples: int) -> np.ndarray:
        n = int(n_samples)
        if n > self.capacity:
            raise ValueError(f"Requested {n} samples exceeds capacity {self.capacity}")
        with self.lock:
            if self.write_ptr >= n:
                return self.buffer[self.write_ptr - n:self.write_ptr].copy()
            tail_len = n - self.write_ptr
            return np.concatenate((self.buffer[self.capacity - tail_len:], self.buffer[:self.write_ptr]))

    def clear(self) -> None:
        with self.lock:
            self.buffer.fill(0)
            self.write_ptr = 0
            self.total_samples_written = 0
