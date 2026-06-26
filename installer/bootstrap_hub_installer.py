#!/usr/bin/env python3
"""
Bootstrap Hub Installer (PyInstaller edition)

Place this executable in the same folder as the bundle's manifest.json,
config.json, manifest.sig and files/ directory, then run it as Administrator.
"""

import hashlib
import json
import os
import shutil
import ssl
import subprocess
import sys
import time
import zipfile
from urllib.parse import urlparse
from urllib.request import Request, urlopen

if sys.platform == "win32":
    import winreg


SCRIPT_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))
MANIFEST_PATH = os.path.join(SCRIPT_DIR, "manifest.json")
SIG_PATH = os.path.join(SCRIPT_DIR, "manifest.sig")
FILES_DIR = os.path.join(SCRIPT_DIR, "files")

PROGRAM_DATA = os.environ.get("ProgramData", r"C:\ProgramData")
LOG_DIR = os.path.join(PROGRAM_DATA, "BootstrapHub")
LOG_PATH = os.path.join(LOG_DIR, "install.log")
ERROR_LOG_PATH = os.path.join(LOG_DIR, "errors.log")


def _ensure_log_dir():
    os.makedirs(LOG_DIR, exist_ok=True)


def log(message: str) -> None:
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {message}"
    _ensure_log_dir()
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def log_error(message: str) -> None:
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] ERROR: {message}"
    _ensure_log_dir()
    print(line, file=sys.stderr)
    with open(ERROR_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def is_admin() -> bool:
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def expand_environment_strings(path: str) -> str:
    if sys.platform == "win32" and path:
        import ctypes
        buf = ctypes.create_unicode_buffer(32767)
        ctypes.windll.kernel32.ExpandEnvironmentStringsW(path, buf, 32767)
        return buf.value or path
    return os.path.expandvars(path or "")


def set_registry_value(key_path: str, name: str, value: str) -> None:
    if sys.platform != "win32":
        return
    parts = key_path.split("\\")
    root_name = parts[0].upper()
    sub = "\\".join(parts[1:])
    root = getattr(winreg, root_name)
    with winreg.CreateKey(root, sub) as key:
        winreg.SetValueEx(key, str(name), 0, winreg.REG_SZ, str(value))


def get_registry_value(key_path: str, name: str):
    if sys.platform != "win32":
        return None
    parts = key_path.split("\\")
    root_name = parts[0].upper()
    sub = "\\".join(parts[1:])
    root = getattr(winreg, root_name)
    try:
        with winreg.OpenKey(root, sub, 0, winreg.KEY_READ) as key:
            return winreg.QueryValueEx(key, name)[0]
    except (FileNotFoundError, OSError):
        return None


def key_exists(key_path: str) -> bool:
    if sys.platform != "win32" or not key_path:
        return False
    parts = key_path.split("\\")
    root_name = parts[0].upper()
    sub = "\\".join(parts[1:])
    root = getattr(winreg, root_name)
    try:
        with winreg.OpenKey(root, sub):
            return True
    except (FileNotFoundError, OSError):
        return False


def _enum_subkeys(key):
    i = 0
    while True:
        try:
            yield winreg.EnumKey(key, i)
            i += 1
        except OSError:
            break


def program_installed(name_contains: str) -> bool:
    if sys.platform != "win32":
        return False
    roots = [
        (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Uninstall"),
        (winreg.HKEY_LOCAL_MACHINE, r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
    ]
    needle = name_contains.lower()
    for root, sub in roots:
        try:
            with winreg.OpenKey(root, sub) as key:
                for subkey_name in _enum_subkeys(key):
                    try:
                        with winreg.OpenKey(key, subkey_name) as subkey:
                            display_name, _ = winreg.QueryValueEx(subkey, "DisplayName")
                            if display_name and needle in str(display_name).lower():
                                return True
                    except (FileNotFoundError, OSError):
                        continue
        except (FileNotFoundError, OSError):
            continue
    return False


def marker_installed(app_id: str) -> bool:
    return get_registry_value(r"HKLM\Software\BootstrapHub\Installed", app_id) is not None


def test_installed(app: dict) -> bool:
    if marker_installed(app["id"]):
        return True
    rule = app.get("detectionRule") or {}
    method = app.get("detectionMethod")
    if method == "REGISTRY":
        return key_exists(rule.get("key", ""))
    if method == "PROGRAM":
        return program_installed(rule.get("displayNameContains") or app["name"])
    if method == "FILE":
        return os.path.exists(expand_environment_strings(rule.get("path", "")))
    if method == "CUSTOM":
        try:
            return subprocess.run(rule.get("script", ""), shell=True, check=False, capture_output=True).returncode == 0
        except Exception:
            return False
    return False


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_hash(path: str, expected: str) -> None:
    if not expected:
        return
    actual = sha256_file(path)
    if actual.lower() != expected.lower():
        raise RuntimeError(f"SHA256 mismatch for {path} (expected {expected}, got {actual})")
    log(f"SHA256 verified: {path}")


def remote_filename(url: str) -> str:
    try:
        return os.path.basename(urlparse(url).path) or "installer.exe"
    except Exception:
        return "installer.exe"


def download_file(url: str, dest: str) -> None:
    ctx = ssl.create_default_context()
    last_err = None
    for attempt in range(1, 4):
        try:
            req = Request(url, headers={"User-Agent": "BootstrapHubInstaller/1.0"})
            with urlopen(req, context=ctx, timeout=300) as resp:
                with open(dest, "wb") as f:
                    shutil.copyfileobj(resp, f)
            return
        except Exception as e:
            last_err = e
            log(f"Download attempt {attempt} failed for {url}: {e}")
            time.sleep(5)
    raise last_err


def get_installer(name: str, local_file: str, url: str, expected_hash: str):
    if os.path.exists(local_file):
        verify_hash(local_file, expected_hash)
        return local_file, False
    if not url:
        raise RuntimeError(f"No installer available for {name}")
    tmp_dir = os.path.join(os.environ.get("TEMP", os.getcwd()), "BootstrapHub", "files")
    os.makedirs(tmp_dir, exist_ok=True)
    dest = os.path.join(tmp_dir, remote_filename(url))
    log(f"Downloading {name} from {url}")
    download_file(url, dest)
    verify_hash(dest, expected_hash)
    return dest, True


def install_application(app: dict) -> None:
    name = app["name"]
    if test_installed(app):
        log(f"Already installed: {name}")
        return

    log(f"Installing: {name}")
    method = app.get("installMethod", "EXE")
    local_file = os.path.join(FILES_DIR, app.get("_bundleFileName", "installer"))

    try:
        installer, downloaded = get_installer(
            name,
            local_file,
            app.get("downloadUrl", ""),
            app.get("sha256", ""),
        )
        try:
            if method in ("EXE", "PORTABLE"):
                args = app.get("installArgs") or [app.get("silentInstallCommand", "")]
                cmd = [installer] + [str(a) for a in args if str(a) != ""]
                result = subprocess.run(cmd, check=False)
                if result.returncode != 0:
                    raise RuntimeError(f"Installer exited with code {result.returncode}")

            elif method == "MSI":
                args = app.get("installArgs") or ["/i", installer, "/qn", "/norestart"]
                cmd = ["msiexec.exe"] + [str(a) for a in args]
                result = subprocess.run(cmd, check=False)
                if result.returncode != 0:
                    raise RuntimeError(f"MSI installer exited with code {result.returncode}")

            elif method == "ZIP":
                dest = os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), name)
                os.makedirs(dest, exist_ok=True)
                with zipfile.ZipFile(installer, "r") as z:
                    z.extractall(dest)

            elif method == "WINGET":
                app_id = app.get("silentInstallCommand", "")
                result = subprocess.run(
                    ["winget.exe", "install", "--id", app_id, "--silent", "--accept-package-agreements", "--accept-source-agreements"],
                    check=False,
                )
                if result.returncode != 0:
                    raise RuntimeError(f"winget exited with code {result.returncode}")

            elif method == "CHOCO":
                app_id = app.get("silentInstallCommand", "")
                result = subprocess.run(["choco.exe", "install", app_id, "-y"], check=False)
                if result.returncode != 0:
                    raise RuntimeError(f"choco exited with code {result.returncode}")

            if app.get("launchAfterInstall") and app.get("launchArguments"):
                subprocess.Popen([app["launchArguments"]], shell=False)

            set_registry_value(r"HKLM\Software\BootstrapHub\Installed", app["id"], time.strftime("%Y-%m-%dT%H:%M:%S"))
            log(f"Installed: {name}")

        finally:
            if downloaded and os.path.exists(installer):
                os.remove(installer)
                log(f"Cleaned up installer for {name}")

    except Exception as e:
        log_error(f"Failed to install {name}: {e}")
        raise


def install_extension(ext: dict) -> None:
    if sys.platform != "win32":
        return
    browser = ext.get("browser")
    ext_id = ext.get("extensionId")
    paths = {
        "CHROME": r"Software\Policies\Google\Chrome\ExtensionInstallForcelist",
        "BRAVE": r"Software\Policies\BraveSoftware\Brave\ExtensionInstallForcelist",
        "EDGE": r"Software\Policies\Microsoft\Edge\ExtensionInstallForcelist",
    }
    policy_path = paths.get(browser)
    if not policy_path:
        return

    with winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE, policy_path) as key:
        used = set()
        i = 0
        while True:
            try:
                name, _, _ = winreg.EnumValue(key, i)
                used.add(str(name))
                i += 1
            except OSError:
                break
        next_idx = 1
        while str(next_idx) in used:
            next_idx += 1
        value = f"{ext_id};{ext.get('chromeStoreUrl', '')}"
        winreg.SetValueEx(key, str(next_idx), 0, winreg.REG_SZ, value)
    log(f"Configured extension policy for {browser}: {ext_id}")


def invoke_startup_action(action: dict) -> None:
    if not action.get("enabled"):
        return
    action_type = action.get("actionType")
    target = action.get("target", "")
    working_dir = action.get("workingDir") or SCRIPT_DIR
    log(f"Startup action: {action.get('name')} [{action_type}]")
    try:
        if action_type == "POWERSHELL":
            subprocess.Popen(["powershell.exe", "-ExecutionPolicy", "Bypass", "-Command", target], cwd=working_dir)
        elif action_type == "CMD":
            subprocess.Popen(["cmd.exe", "/c", target], cwd=working_dir)
        elif action_type == "EXECUTE":
            args = action.get("arguments", [])
            cmd = [target] + [str(a) for a in args]
            subprocess.Popen(cmd, cwd=working_dir)
        elif action_type == "URL":
            subprocess.Popen([target], cwd=working_dir)
    except Exception as e:
        log_error(f"Startup action failed {action.get('name')}: {e}")


def verify_signature(manifest: dict) -> None:
    if not os.path.exists(SIG_PATH):
        return
    with open(SIG_PATH, "r", encoding="utf-8") as f:
        actual = f.read().strip()
    expected = manifest.get("signature", "")
    if actual != expected:
        raise RuntimeError("Manifest signature mismatch.")
    log("Signature verified.")


def main() -> None:
    if sys.platform == "win32" and not is_admin():
        log("This installer must be run as Administrator.")
        sys.exit(1)

    if not os.path.exists(MANIFEST_PATH):
        log_error("manifest.json not found in the same folder as this installer.")
        sys.exit(1)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    verify_signature(manifest)

    log(f"Starting Bootstrap Hub installer for: {manifest.get('name')}")

    for app in manifest.get("applications", []):
        install_application(app)

    for ext in manifest.get("extensions", []):
        install_extension(ext)

    for action in sorted(manifest.get("startupActions", []), key=lambda x: x.get("order", 0)):
        invoke_startup_action(action)

    log("Bootstrap Hub installation complete.")


if __name__ == "__main__":
    main()
