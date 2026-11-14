from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User


# What we send back about a user (never the password)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]


# What the register form sends in
class RegisterSerializer(serializers.ModelSerializer):
    # write_only means the password is accepted but never returned
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "password"]

    # Use Django's built-in rules (length, too common, etc.)
    def validate_password(self, value):
        validate_password(value)
        return value

    # create_user hashes the password instead of saving it as plain text
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

    # Used when claiming a roster-only account: fills it in and sets the password
    def update(self, instance, validated_data):
        password = validated_data.pop("password")
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.set_password(password)
        instance.save()
        return instance
