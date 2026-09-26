import sys
import subprocess

def build():
    excludes = [
        "torch", "torchvision", "scipy", "matplotlib", "spyder", "sphinx", "bcrypt",
        "black", "cryptography", "jupyter", "IPython", "notebook", "jinja2", "nbformat",
        "nbconvert", "dask", "distributed", "PIL", "skimage", "sklearn", "transformers",
        "huggingface_hub", "twisted", "scrapy", "streamlit", "xarray", "xgboost",
        "pytest", "docutils", "babel", "jedi", "parso"
    ]
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm", "--onedir", "--windowed",
        "--name", "VehicleHornCollector",
        "--add-data", "config;config",
    ]
    for ex in excludes:
        cmd.extend(["--exclude-module", ex])
    cmd.append("main.py")

    print("Building lightweight VehicleHornCollector with PyInstaller...")
    subprocess.run(cmd, check=True)
    print("Build complete in dist/VehicleHornCollector/")

if __name__ == '__main__':
    build()
