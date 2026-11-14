from django.contrib import admin

from .models import AttendanceRecord, Club, Event, Membership

admin.site.register(Club)
admin.site.register(Membership)
admin.site.register(Event)
admin.site.register(AttendanceRecord)
