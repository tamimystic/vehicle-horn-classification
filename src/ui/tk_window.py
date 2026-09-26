"""
Lightweight Built-In Tkinter GUI for Vehicle Horn Data Collector
Requires ZERO extra GUI packages (runs natively on any Python installation).
"""
import tkinter as tk
from tkinter import ttk, messagebox
import threading
from typing import Dict, Any

from config.settings import config
from src.core.audio_engine import AudioEngine
from src.services.recorder_service import RecorderService
from src.services.metadata_service import MetadataService
from src.utils.logger import logger

class TkMainWindow:
    """Native Tkinter Desktop Application."""
    def __init__(self, audio_engine: AudioEngine,
                 recorder_service: RecorderService,
                 metadata_service: MetadataService):
        self.audio_engine = audio_engine
        self.recorder_service = recorder_service
        self.metadata_service = metadata_service

        self.taxonomy = config.load_taxonomy()
        self.classes_data = self.taxonomy.get("classes", [])
        self.key_to_class = {c["key_shortcut"]: c for c in self.classes_data}

        self.root = tk.Tk()
        self.root.title("Vehicle Horn Acoustic Data Collector (Desktop)")
        self.root.geometry("850x680")
        self.root.configure(bg="#1e1e2e")

        self.init_ui()
        self.bind_keys()
        self.update_live_loop()

    def init_ui(self):
        style = ttk.Style()
        style.theme_use("clam")

        # 1. Header
        header_frame = tk.Frame(self.root, bg="#181825", padx=15, pady=10)
        header_frame.pack(fill=tk.X, padx=10, pady=8)

        title_lbl = tk.Label(header_frame, text="🎙️ Vehicle Horn Acoustic Data Collector",
                             font=("Segoe UI", 16, "bold"), fg="#89b4fa", bg="#181825")
        title_lbl.pack(side=tk.LEFT)

        badge = tk.Label(header_frame, text="ZERO-DSP (NO AGC)", font=("Segoe UI", 9, "bold"),
                         fg="#11111b", bg="#a6e3a1", padx=8, pady=2)
        badge.pack(side=tk.RIGHT)

        # 2. Session Parameters
        param_frame = tk.LabelFrame(self.root, text=" Session Parameters (Spatial & Environmental) ",
                                    font=("Segoe UI", 10, "bold"), fg="#89b4fa", bg="#181825", padx=12, pady=10)
        param_frame.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(param_frame, text="Location:", fg="#cdd6f4", bg="#181825").grid(row=0, column=0, sticky=tk.W, padx=4, pady=4)
        self.loc_entry = tk.Entry(param_frame, bg="#313244", fg="#cdd6f4", insertbackground="white", width=22)
        self.loc_entry.insert(0, "Gabtoli_Terminal")
        self.loc_entry.grid(row=0, column=1, padx=4, pady=4)

        tk.Label(param_frame, text="Distance:", fg="#cdd6f4", bg="#181825").grid(row=0, column=2, sticky=tk.W, padx=4, pady=4)
        self.dist_combo = ttk.Combobox(param_frame, values=["3m", "5m", "7.5m", "10m", "15m", "Overbridge_45deg"], width=12)
        self.dist_combo.set("5m")
        self.dist_combo.grid(row=0, column=3, padx=4, pady=4)

        tk.Label(param_frame, text="SLM Reading (dBA):", fg="#cdd6f4", bg="#181825").grid(row=0, column=4, sticky=tk.W, padx=4, pady=4)
        self.spl_entry = tk.Entry(param_frame, bg="#313244", fg="#cdd6f4", insertbackground="white", width=10)
        self.spl_entry.insert(0, "95.0")
        self.spl_entry.grid(row=0, column=5, padx=4, pady=4)

        # 3. Live Status & Level Meter
        meter_frame = tk.Frame(self.root, bg="#181825", padx=12, pady=8)
        meter_frame.pack(fill=tk.X, padx=10, pady=5)

        self.level_lbl = tk.Label(meter_frame, text="Peak: -100.0 dBFS | RMS: -100.0 dBFS",
                                  font=("Segoe UI", 11), fg="#89b4fa", bg="#181825")
        self.level_lbl.pack(side=tk.LEFT)

        self.clipping_badge = tk.Label(meter_frame, text="SIGNAL CLEAN", font=("Segoe UI", 10, "bold"),
                                       fg="#11111b", bg="#a6e3a1", padx=12, pady=4)
        self.clipping_badge.pack(side=tk.RIGHT)

        # 4. Class Buttons Grid (1-9)
        btn_frame = tk.LabelFrame(self.root, text=" One-Touch Class Logger (Click or Press Keys 1 - 9) ",
                                  font=("Segoe UI", 10, "bold"), fg="#fab387", bg="#181825", padx=10, pady=10)
        btn_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=8)

        self.buttons = {}
        for idx, c in enumerate(self.classes_data):
            k = c["key_shortcut"]
            name = c["display_name"]
            color = c.get("color", "#89b4fa")

            btn = tk.Button(btn_frame, text=f"[{k}] {name}", font=("Segoe UI", 11, "bold"),
                            fg=color, bg="#313244", activebackground=color, activeforeground="#11111b",
                            relief=tk.FLAT, bd=2, height=2,
                            command=lambda info=c: self.trigger_class(info))
            row = idx // 3
            col = idx % 3
            btn.grid(row=row, column=col, sticky="nsew", padx=5, pady=5)
            btn_frame.grid_columnconfigure(col, weight=1)
            btn_frame.grid_rowconfigure(row, weight=1)
            self.buttons[k] = btn

        # 5. Bottom Status Bar
        self.status_lbl = tk.Label(self.root, text=f"Total Logged Events: {self.metadata_service.get_sample_count()} | Ready to record...",
                                   font=("Segoe UI", 10, "bold"), fg="#a6adc8", bg="#11111b", anchor=tk.W, padx=12, pady=6)
        self.status_lbl.pack(fill=tk.X, side=tk.BOTTOM)

    def bind_keys(self):
        for k in self.key_to_class:
            self.root.bind(k, lambda event, key=k: self.on_hotkey(key))

    def on_hotkey(self, key):
        if key in self.key_to_class:
            class_info = self.key_to_class[key]
            # Flash button visually
            btn = self.buttons.get(key)
            if btn:
                orig_bg = btn.cget("bg")
                orig_fg = btn.cget("fg")
                btn.configure(bg="#ffffff", fg="#000000")
                self.root.after(120, lambda: btn.configure(bg=orig_bg, fg=orig_fg))
            self.trigger_class(class_info)

    def trigger_class(self, class_info):
        try:
            spl_val = float(self.spl_entry.get().strip() or "90.0")
        except ValueError:
            spl_val = 90.0

        session_params = {
            "location": self.loc_entry.get().strip().replace(" ", "_"),
            "distance": self.dist_combo.get(),
            "measured_spl": spl_val,
            "angle_deg": 45,
            "mic_height_m": 1.5,
            "elevation_type": "Ground_Level",
            "weather": "Dry_Sunny",
            "annotator_id": "RESEARCHER_1"
        }

        self.recorder_service.trigger_capture(
            class_info=class_info,
            session_params=session_params,
            on_complete=self.on_export_done
        )

    def on_export_done(self, message):
        def _update():
            count = self.metadata_service.get_sample_count()
            self.status_lbl.configure(text=f"Total Logged: {count} | {message}", fg="#a6e3a1")
        self.root.after(0, _update)

    def update_live_loop(self):
        """Periodic loop to update Peak and RMS meter."""
        peak = self.audio_engine.current_peak_dbfs
        rms = self.audio_engine.current_rms_dbfs
        is_clip = self.audio_engine.is_clipping

        self.level_lbl.configure(text=f"Peak: {peak:.1f} dBFS | RMS: {rms:.1f} dBFS")

        if is_clip:
            self.clipping_badge.configure(text="!! CLIPPING DISTORTION WARNING !!", bg="#f38ba8", fg="#11111b")
        elif peak > -6.0:
            self.clipping_badge.configure(text=f"HIGH LEVEL: {peak:.1f} dBFS", bg="#fab387", fg="#11111b")
        else:
            self.clipping_badge.configure(text=f"SIGNAL CLEAN: {peak:.1f} dBFS", bg="#a6e3a1", fg="#11111b")

        self.root.after(50, self.update_live_loop)

    def run(self):
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        self.root.mainloop()

    def on_close(self):
        self.audio_engine.stop()
        self.root.destroy()
