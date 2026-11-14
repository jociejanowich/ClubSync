from rest_framework import permissions

from .models import Membership


def get_membership(user, club):
    if not user or not user.is_authenticated:
        return None
    return Membership.objects.filter(user=user, club=club).first()


class IsClubMember(permissions.BasePermission):
    """Read access for anyone who belongs to the club (officer or member)."""

    def has_object_permission(self, request, view, obj):
        club = obj if hasattr(obj, "memberships") else getattr(obj, "club", None)
        if club is None:
            return False
        return get_membership(request.user, club) is not None


class IsClubOfficer(permissions.BasePermission):
    """Write access limited to Officers of the specific club the object belongs to."""

    def has_object_permission(self, request, view, obj):
        club = obj if hasattr(obj, "memberships") else getattr(obj, "club", None)
        if club is None:
            return False

        if request.method in permissions.SAFE_METHODS:
            return get_membership(request.user, club) is not None

        membership = get_membership(request.user, club)
        return membership is not None and membership.role == "officer"
