from urllib.parse import urlsplit


def safe_return_path(value: str | None) -> str:
    if not value or len(value) > 512 or not value.startswith("/") or value.startswith("//") or "\\" in value:
        return "/dashboard"
    if any(ord(character) < 32 for character in value):
        return "/dashboard"
    parsed = urlsplit(value)
    return value if not parsed.netloc and parsed.path in ("/dashboard", "/studio", "/messages", "/settings") else "/dashboard"
