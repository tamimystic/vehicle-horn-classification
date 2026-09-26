import tkinter as tk
from tkinter import ttk
from config.settings import config
from src.core.audio_engine import AudioEngine
from src.services.recorder_service import RecorderService
from src.services.metadata_service import MetadataService

class TkMainWindow:
    def __init__(self, audio_engine: AudioEngine, recorder_service: RecorderService, metadata_service: MetadataService):
        self.audio_engine = audio_engine
        self.recorder_service = recorder_service
        self.metadata_service = metadata_service
        self.taxonomy = config.load_taxonomy()
        self.classes_data = self.taxonomy.get("classes", [])
        self.key_to_class = {c["key_shortcut"]: c for c in self.classes_data}

        self.root = tk.Tk()
        self.root.title("Vehicle Horn Acoustic Data Collector")
        self.root.geometry("850x660")
        self.root.configure(bg="#1e1e2e")

        self.init_ui()
        self.bind_keys()
        self.update_live_loop()

    def init_ui(self):
        style = ttk.Style()
        style.theme_use("clam")

        header = tk.Frame(self.root, bg="#181825", padx=15, pady=10)
        header.pack(fill=tk.X, padx=10, pady=8)
        tk.Label(header, text="Vehicle Horn Acoustic Data Collector", font=("Segoe UI", 16, "bold"), fg="#89b4fa", bg="#181825").pack(side=tk.LEFT)
        tk.Label(header, text="ZERO-DSP (RAW PCM)", font=("Segoe UI", 9, "bold"), fg="#11111b", bg="#a6e3a1", padx=8, pady=2).pack(side=tk.RIGHT)

        params = tk.LabelFrame(self.root, text=" Session Parameters ", font=("Segoe UI", 10, "bold"), fg="#89b4fa", bg="#181825", padx=12, pady=8)
        params.pack(fill=tk.X, padx=10, pady=4)

        tk.Label(params, text="Location:", fg="#cdd6f4", bg="#181825").grid(row=0, column=0, padx=4, pady=4, sticky=tk.W)
        self.loc_entry = tk.Entry(params, bg="#313244", fg="#cdd6f4", insertbackground="white", width=22)
        self.loc_entry.insert(0, "Gabtoli_Terminal")
        self.loc_entry.grid(row=0, column=1, padx=4, pady=4)

        tk.Label(params, text="Distance:", fg="#cdd6f4", bg="#181825").grid(row=0, column=2, padx=4, pady=4, sticky=tk.W)
        self.dist_combo = ttk.Combobox(params, values=["3m", "5m", "7.5m", "10m", "15m", "Overbridge_45deg"], width=12)
        self.dist_combo.set("5m")
        self.dist_combo.grid(row=0, column=3, padx=4, pady=4)

        tk.Label(params, text="SLM (dBA):", fg="#cdd6f4", bg="#181825").grid(row=0, column=4, padx=4, pady=4, sticky=tk.W)
        self.spl_entry = tk.Entry(params, bg="#313244", fg="#cdd6f4", insertbackground="white", width=10)
        self.spl_entry.insert(0, "95.0")
        self.spl_entry.grid(row=0, column=5, padx=4, pady=4)

        meter = tk.Frame(self.root, bg="#181825", padx=12, pady=6)
        meter.pack(fill=tk.X, padx=10, pady=4)
        self.level_lbl = tk.Label(meter, text="Peak: -100.0 dBFS | RMS: -100.0 dBFS", font=("Segoe UI", 11), fg="#89b4fa", bg="#181825")
        self.level_lbl.pack(side=tk.LEFT)
        self.clip_lbl = tk.Label(meter, text="SIGNAL CLEAN", font=("Segoe UI", 10, "bold"), fg="#11111b", bg="#a6e3a1", padx=12, pady=3)
        self.clip_lbl.pack(side=tk.RIGHT)

        btn_box = tk.LabelFrame(self.root, text=" One-Touch Event Logger (Hotkeys 1 - 9) ", font=("Segoe UI", 10, "bold"), fg="#fab387", bg="#181825", padx=10, pady=10)
        btn_box.pack(fill=tk.BOTH, expand=True, padx=10, pady=6)

        self.buttons = {}
        for idx, c in enumerate(self.classes_data):
            k, name, color = c["key_shortcut"], c["display_name"], c.get("color", "#89b4fa")
            btn = tk.Button(btn_box, text=f"[{k}] {name}", font=("Segoe UI", 11, "bold"), fg=color, bg="#313244",
                            activebackground=color, activeforeground="#11111b", relief=tk.FLAT, bd=2, height=2,
                            command=lambda info=c: self.trigger_class(info))
            r, col = idx // 3, idx % 3
            btn.grid(row=r, column=col, sticky="nsew", padx=5, pady=5)
            btn_box.grid_columnconfigure(col, weight=1)
            btn_box.grid_rowconfigure(r, weight=1)
            self.buttons[k] = btn

        self.status_lbl = tk.Label(self.root, text=f"Total Logged: {self.metadata_service.get_sample_count()} | Ready",
                                   font=("Segoe UI", 10, "bold"), fg="#a6adc8", bg="#11111b", anchor=tk.W, padx=12, pady=6)
        self.status_lbl.pack(fill=tk.X, side=tk.BOTTOM)

    def bind_keys(self):
        for k in self.key_to_class:
            self.root.bind(k, lambda e, key=k: self.on_hotkey(key))

    def on_hotkey(self, key):
        if key in self.key_to_class:
            btn = self.buttons.get(key)
            if btn:
                obg, ofg = btn.cget("bg"), btn.cget("fg")
                btn.configure(bg="#ffffff", fg="#000000")
                self.root.after(120, lambda: btn.configure(bg=obg, fg=ofg))
            self.trigger_class(self.key_to_class[key])

    def trigger_class(self, class_info):
        try:
            spl_val = float(self.spl_entry.get().strip() or "90.0")
        except ValueError:
            spl_val = 90.0
        params = {
            "location": self.loc_entry.get().strip().replace(" ", "_"),
            "distance": self.dist_combo.get(), "measured_spl": spl_val,
            "angle_deg": 45, "mic_height_m": 1.5, "elevation_type": "Ground_Level",
            "weather": "Dry_Sunny", "annotator_id": "RESEARCHER_1"
        }
        self.recorder_service.trigger_capture(class_info=class_info, session_params=params, on_complete=self.on_export_done)

    def on_export_done(self, message):
        self.root.after(0, lambda: self.status_lbl.configure(text=f"Total Logged: {self.metadata_service.get_sample_count()} | {message}", fg="#a6e3a1"))

    def update_live_loop(self):
        peak, rms, is_clip = self.audio_engine.current_peak_dbfs, self.audio_engine.current_rms_dbfs, self.audio_engine.is_clipping
        self.level_lbl.configure(text=f"Peak: {peak:.1f} dBFS | RMS: {rms:.1f} dBFS")
        if is_clip:
            self.clip_lbl.configure(text="! CLIPPING WARNING !", bg="#f38ba8", fg="#11111b")
        elif peak > -6.0:
            self.clip_lbl.configure(text=f"HIGH LEVEL: {peak:.1f} dBFS", bg="#fab387", fg="#11111b")
        else:
            self.clip_lbl.configure(text=f"SIGNAL CLEAN: {peak:.1f} dBFS", bg="#a6e3a1", fg="#11111b")
        self.root.after(50, self.update_live_loop)

    def run(self):
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        self.root.mainloop()

    def on_close(self):
        self.audio_engine.stop()
        self.root.destroy()
