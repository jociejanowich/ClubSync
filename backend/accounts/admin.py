from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

# Show our custom User model in the Django admin page.
# UserAdmin gives it the same layout as Django's default user admin.
admin.site.register(User, UserAdmin)