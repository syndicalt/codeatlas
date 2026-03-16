class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

    def display(self):
        return f"{self.name} <{self.email}>"

    def validate(self):
        return "@" in self.email


class AdminUser(User):
    def __init__(self, name: str, email: str, role: str = "admin"):
        super().__init__(name, email)
        self.role = role

    def display(self):
        return f"[{self.role}] {self.name} <{self.email}>"

    def grant_access(self, resource: str):
        print(f"Granting {self.role} access to {resource}")
