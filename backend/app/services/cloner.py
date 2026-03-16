import re
import zipfile
from pathlib import Path

import git
from fastapi import UploadFile


GITHUB_URL_RE = re.compile(
    r"^https?://github\.com/[\w.\-]+/[\w.\-]+(\.git)?(/?)$"
)


def validate_github_url(url: str) -> str:
    url = url.rstrip("/")
    if not GITHUB_URL_RE.match(url + "/"):
        raise ValueError(f"Invalid GitHub URL: {url}")
    if url.endswith(".git"):
        url = url[:-4]
    return url


def clone_repo(
    url: str,
    dest: Path,
    branch: str | None = None,
    shallow: bool = True,
    access_token: str | None = None,
) -> Path:
    url = validate_github_url(url)
    if access_token:
        # Extract owner/repo from validated URL (without .git)
        parts = url.rstrip("/").split("github.com/", 1)
        owner_repo = parts[1] if len(parts) == 2 else ""
        clone_url = f"https://x-access-token:{access_token}@github.com/{owner_repo}.git"
    else:
        clone_url = url + ".git"
    kwargs: dict = {}
    if shallow:
        kwargs["depth"] = 1
    if branch:
        kwargs["branch"] = branch
    git.Repo.clone_from(clone_url, str(dest), **kwargs)
    return dest


async def extract_zip(upload_file: UploadFile, dest: Path) -> Path:
    dest.mkdir(parents=True, exist_ok=True)
    zip_path = dest / "upload.zip"

    content = await upload_file.read()
    zip_path.write_bytes(content)

    with zipfile.ZipFile(zip_path, "r") as zf:
        # Zip-slip protection
        for member in zf.namelist():
            member_path = (dest / member).resolve()
            if not str(member_path).startswith(str(dest.resolve())):
                raise ValueError(f"Zip slip detected: {member}")
        zf.extractall(dest)

    zip_path.unlink()

    # If the zip contained a single root directory, return that
    entries = [e for e in dest.iterdir() if e.is_dir()]
    if len(entries) == 1:
        return entries[0]
    return dest
