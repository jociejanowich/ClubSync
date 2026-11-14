from rest_framework.routers import DefaultRouter

from .views import ClubViewSet, EventViewSet

router = DefaultRouter()
router.register(r"clubs", ClubViewSet, basename="club")
router.register(r"events", EventViewSet, basename="event")

urlpatterns = router.urls
