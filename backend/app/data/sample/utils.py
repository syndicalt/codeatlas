import re


def validate_email(email: str) -> str:
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    if not re.match(pattern, email):
        raise ValueError(f"Invalid email: {email}")
    return email


def format_name(first: str, last: str) -> str:
    return f"{first.strip().title()} {last.strip().title()}"


def slugify(text: str) -> str:
    return re.sub(r'[^\w]+', '-', text.lower()).strip('-')
