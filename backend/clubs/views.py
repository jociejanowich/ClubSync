from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AttendanceRecord, Club, Event, Membership
from .permissions import get_membership
from .serializers import (
    AttendanceRecordSerializer,
    ClubSerializer,
    EventSerializer,
    MembershipSerializer,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Clubs + Roster (FR: Club Profile Management, Roster Management)
# ---------------------------------------------------------------------------

class ClubViewSet(viewsets.ModelViewSet):
    serializer_class = ClubSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # A user only sees clubs they belong to (Officer or General Member).
        return (
            Club.objects.filter(memberships__user=self.request.user)
            .distinct()
            .order_by("name")
        )

    def perform_create(self, serializer):
        club = serializer.save()
        # Creator becomes the founding Officer/lead for their new club.
        Membership.objects.create(
            user=self.request.user, club=club, role="officer", is_lead=True
        )

    def _require_officer(self, club):
        membership = get_membership(self.request.user, club)
        if membership is None or membership.role != "officer":
            raise PermissionDenied("Only officers of this club can do that.")
        return membership

    def perform_update(self, serializer):
        self._require_officer(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_officer(instance)
        instance.delete()

    @action(detail=True, methods=["get", "post"])
    def roster(self, request, pk=None):
        club = self.get_object()
        if request.method == "GET":
            memberships = club.memberships.select_related("user").order_by(
                "-role", "user__username"
            )
            return Response(MembershipSerializer(memberships, many=True).data)

        # POST: add a member by username (Officer-only).
        self._require_officer(club)
        username = request.data.get("username")
        role = request.data.get("role", "member")
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise ValidationError({"username": "No user with that username exists."})
        membership, created = Membership.objects.get_or_create(
            user=user, club=club, defaults={"role": role}
        )
        if not created:
            raise ValidationError({"username": "That user is already on the roster."})
        return Response(MembershipSerializer(membership).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path="roster/(?P<membership_id>[^/.]+)")
    def roster_detail(self, request, pk=None, membership_id=None):
        club = self.get_object()
        self._require_officer(club)
        try:
            membership = club.memberships.get(pk=membership_id)
        except Membership.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == "DELETE":
            membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH: change role / lead flag.
        role = request.data.get("role")
        if role:
            membership.role = role
        if "is_lead" in request.data:
            membership.is_lead = bool(request.data["is_lead"])
        membership.save()
        return Response(MembershipSerializer(membership).data)

    @action(detail=True, methods=["get"])
    def dashboard(self, request, pk=None):
        club = self.get_object()
        if get_membership(request.user, club) is None:
            raise PermissionDenied("You are not a member of this club.")

        now = timezone.now()
        upcoming = club.events.filter(start_time__gte=now).count()
        total_members = club.memberships.count()
        officer_count = club.memberships.filter(role="officer").count()

        recent_events = club.events.filter(start_time__lt=now).order_by("-start_time")[:5]
        attendance_summary = []
        for event in recent_events:
            total = event.attendance_records.count()
            present = event.attendance_records.filter(status="present").count()
            attendance_summary.append(
                {
                    "event_id": event.id,
                    "title": event.title,
                    "start_time": event.start_time,
                    "present": present,
                    "total_recorded": total,
                }
            )

        return Response(
            {
                "club": ClubSerializer(club, context={"request": request}).data,
                "total_members": total_members,
                "officer_count": officer_count,
                "upcoming_events": upcoming,
                "recent_attendance": attendance_summary,
            }
        )


# ---------------------------------------------------------------------------
# Events + Attendance (FR: Calendar Management, Attendance Tracking)
# ---------------------------------------------------------------------------

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_clubs = Club.objects.filter(memberships__user=self.request.user)
        queryset = Event.objects.filter(club__in=user_clubs).select_related("club")
        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)
        return queryset.order_by("start_time")

    def _require_officer(self, club):
        membership = get_membership(self.request.user, club)
        if membership is None or membership.role != "officer":
            raise PermissionDenied("Only officers of this club can manage events.")
        return membership

    def perform_create(self, serializer):
        club = serializer.validated_data["club"]
        self._require_officer(club)
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        self._require_officer(serializer.instance.club)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_officer(instance.club)
        instance.delete()

    @action(detail=True, methods=["get", "post"])
    def attendance(self, request, pk=None):
        event = self.get_object()
        membership = get_membership(request.user, event.club)
        if membership is None:
            raise PermissionDenied("You are not a member of this club.")

        if request.method == "GET":
            records = event.attendance_records.select_related("member").order_by(
                "member__username"
            )
            return Response(AttendanceRecordSerializer(records, many=True).data)

        # POST: mark attendance.
        # - Officers can mark any member present/absent (manual or import).
        # - General members may only self check-in as present.
        member_id = request.data.get("member_id", request.user.id)
        status_value = request.data.get("status", "present")
        method = request.data.get("method", "manual")

        if membership.role != "officer":
            if int(member_id) != request.user.id:
                raise PermissionDenied("You can only check yourself in.")
            status_value = "present"
            method = "check_in"

        record, _ = AttendanceRecord.objects.update_or_create(
            event=event,
            member_id=member_id,
            defaults={"status": status_value, "method": method},
        )
        return Response(AttendanceRecordSerializer(record).data, status=status.HTTP_200_OK)
