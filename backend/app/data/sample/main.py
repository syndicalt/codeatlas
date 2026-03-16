from models import User, AdminUser
from services import UserService
from utils import validate_email, format_name


def main():
    service = UserService()
    email = validate_email("alice@example.com")
    name = format_name("Alice", "Smith")
    user = service.create_user(name, email)
    print(f"Created user: {user.name}")


def cli():
    main()


if __name__ == "__main__":
    cli()
