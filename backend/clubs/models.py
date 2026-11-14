from django.conf import settings
from django.db import models


# A recognized student club using ClubSync (FR: Club Profile Management).
class Club(models.Model):
    CATEGORY_CHOICES = [
        ("academic", "Academic/Professional"),
        ("sports", "Sports/Recreation"),
        ("service", "Community Service"),
        ("cultural", "Cultural/Identity"),
        ("arts", "Arts/Performance"),
        ("other", "Other"),
    ]

    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# Links a user to a club with a role (FR: Roster Management).
class Membership(models.Model):
    ROLE_CHOICES = [
        ("officer", "Officer"),
        ("member", "General Member"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="member")
    is_lead = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "club")

    def __str__(self):
        return f"{self.user.username} @ {self.club.name} ({self.role})"


# A club meeting/event on the color-coded calendar (FR: Calendar Management).
class Event(models.Model):
    CATEGORY_COLORS = {
        "general_body": "#2E5C8A",
        "officer_meeting": "#8A2E5C",
        "committee": "#2E8A5C",
        "social": "#D98E04",
        "fundraiser": "#8A5C2E",
        "community_service": "#2E8A8A",
        "other": "#6B6B6B",
    }
    CATEGORY_CHOICES = [
        ("general_body", "General Body"),
        ("officer_meeting", "Officer Meeting"),
        ("committee", "Committee"),
        ("social", "Social"),
        ("fundraiser", "Fundraiser"),
        ("community_service", "Community Service"),
        ("other", "Other"),
    ]

    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="events")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="general_body")
    location = models.CharField(max_length=200, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="events_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_time"]

    @property
    def color(self):
        return self.CATEGORY_COLORS.get(self.category, "#6B6B6B")

    def __str__(self):
        return f"{self.title} ({self.club.name})"


# Attendance for a member at an event (FR: Attendance Tracking).
class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent", "Absent"),
    ]
    METHOD_CHOICES = [
        ("manual", "Manual"),
        ("check_in", "Check-In"),
        ("import", "Import"),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="attendance_records")
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_records")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="present")
    method = models.CharField(max_length=10, choices=METHOD_CHOICES, default="manual")
    recorded_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("event", "member")

    def __str__(self):
        return f"{self.member.username} - {self.event.title}: {self.status}"
