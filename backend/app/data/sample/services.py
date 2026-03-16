from models import User
from utils import validate_email


class UserService:
    def __init__(self):
        self.users = []

    def create_user(self, name: str, email: str) -> User:
        validate_email(email)
        user = User(name, email)
        self.users.append(user)
        return user

    def find_user(self, email: str) -> User | None:
        for user in self.users:
            if user.email == email:
                return user
        return None

    def list_users(self):
        return [u.display() for u in self.users]
