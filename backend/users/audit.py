from .models import AuditLog


def write_audit_log(*, actor, action, target_type, target_id=None, metadata=None):
    AuditLog.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        metadata=metadata or {},
    )