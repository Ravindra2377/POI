import smtplib
from email.message import EmailMessage

from app.config import Settings


class ProfessionalEmailUnavailable(RuntimeError):
    pass


def send_professional_verification_email(
    settings: Settings,
    *,
    recipient: str,
    display_name: str,
    token: str,
) -> None:
    smtp_host = settings.smtp_host
    from_email = settings.smtp_from_email
    if not smtp_host or not from_email:
        raise ProfessionalEmailUnavailable("Professional email delivery is not configured")
    verification_url = f"{settings.public_web_url}/professional/account?verify={token}"
    message = EmailMessage()
    message["Subject"] = "Verify your professional account"
    message["From"] = from_email
    message["To"] = recipient
    message.set_content(
        f"Hello {display_name},\n\n"
        "Verify your professional account using this link:\n"
        f"{verification_url}\n\n"
        "The link expires in 30 minutes. If you did not create this account, ignore this email.\n"
    )
    try:
        with smtplib.SMTP(smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise ProfessionalEmailUnavailable("Verification email could not be delivered") from exc
