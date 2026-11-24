from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import AttendanceRecord, Club, Event, Membership

User = get_user_model()


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )
    club_name = serializers.CharField(source="club.name", read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id",
            "user",
            "user_id",
            "club",
            "club_name",
            "role",
            "is_lead",
            "date_joined",
        ]
        read_only_fields = ["date_joined"]


class ClubSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Club
        fields = [
            "id",
            "name",
            "description",
            "category",
            "created_at",
            "member_count",
            "my_role",
        ]

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_my_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None


class EventSerializer(serializers.ModelSerializer):
    color = serializers.ReadOnlyField()
    club_name = serializers.CharField(source="club.name", read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, default=None
    )

    class Meta:
        model = Event
        fields = [
            "id",
            "club",
            "club_name",
            "title",
            "description",
            "category",
            "color",
            "location",
            "start_time",
            "end_time",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]
        
    def validate(self, attrs):
        # On PATCH only one time may be sent, so fall back to the saved value.
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"detail": "End time must be after the start time."})

        # An officer of one club must not be able to push an event into another club.
        if self.instance is not None and "club" in attrs and attrs["club"] != self.instance.club:
            raise serializers.ValidationError({"detail": "An event can't be moved to a different club."})
        return attrs

class AttendanceRecordSerializer(serializers.ModelSerializer):
    member = UserSerializer(read_only=True)
    member_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="member", write_only=True
    )

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "event",
            "member",
            "member_id",
            "status",
            "method",
            "recorded_at",
        ]
        read_only_fields = ["recorded_at"]
