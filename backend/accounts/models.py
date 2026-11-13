from django.contrib.auth.models import AbstractUser
from django.db import models


# Custom user model for ClubSync.
# Extends Django's built-in user so we can add fields later
# without redoing migrations.
class User(AbstractUser):
    # Each email can only be used by one account.
    email = models.EmailField(unique=True)