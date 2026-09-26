import sys
import logging
from logging.handlers import RotatingFileHandler
from config.settings import config

def setup_logger(name: str = "AcousticAcquire") -> logging.Logger:
    log = logging.getLogger(name)
    log.setLevel(logging.DEBUG)
    if not log.handlers:
        fmt = logging.Formatter("[%(asctime)s] [%(levelname)s] - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
        ch = logging.StreamHandler(sys.stdout)
        ch.setLevel(logging.INFO)
        ch.setFormatter(fmt)
        log.addHandler(ch)
        fh = RotatingFileHandler(config.paths.logs_dir / "acquisition.log", maxBytes=10*1024*1024, backupCount=5, encoding="utf-8")
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(fmt)
        log.addHandler(fh)
    return log

logger = setup_logger()
