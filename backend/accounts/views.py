from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .serializers import RegisterSerializer, UserSerializer


# FR#1: create an account. Open to anyone.
@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)  # sends back errors if invalid
    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {"token": token.key, "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )


# FR#2: log in with username and password. Open to anyone.
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    user = authenticate(
        username=request.data.get("username"),
        password=request.data.get("password"),
    )
    if user is None:
        # Same message either way so attackers can't tell which part was wrong
        return Response(
            {"error": "Invalid username or password"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": UserSerializer(user).data})


# FR#3: log out by deleting the token so it can't be used again
@api_view(["POST"])
def logout_view(request):
    request.auth.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# Returns the logged-in user so the frontend knows who it is
@api_view(["GET"])
def me_view(request):
    return Response(UserSerializer(request.user).data)