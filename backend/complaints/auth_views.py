# backend/complaints/auth_views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from users.models import Profile


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile_data = None
        try:
            profile = request.user.profile
            profile_data = {
                "role": profile.role,
                "national_id": profile.national_id,
                "is_blocked": profile.is_blocked,
                "is_spammer": profile.is_spammer,
                "can_read_complaints": profile.can_read_complaints,
                "can_update_complaints": profile.can_update_complaints,
                "can_reply_complaints": profile.can_reply_complaints,
                "can_manage_departments": profile.can_manage_departments,
                "can_manage_users": profile.can_manage_users,
                "can_manage_ai_settings": profile.can_manage_ai_settings,
                "view_scope": profile.view_scope,
                "allowed_departments": list(
                    profile.allowed_departments.values("id", "name_tr", "code")
                ),
            }
        except Profile.DoesNotExist:
            profile_data = None

        return Response(
            {
                "id": request.user.id,
                "username": request.user.username,
                "is_staff": request.user.is_staff,
                "is_superuser": request.user.is_superuser,
                "groups": [g.name for g in request.user.groups.all()],
                "profile": profile_data,
            }
        )
