"""Email verification: token generation and sending.

Uses Django's PasswordResetTokenGenerator machinery (signed, time-limited,
no extra DB table) with email_verified mixed into the hash so a link stops
working the moment the account is verified — a used link can't be replayed.
"""

import json
import urllib.request
from email.utils import parseaddr

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        # Including email_verified invalidates the token after it flips True.
        return f"{user.pk}{timestamp}{user.email_verified}{user.password}"


email_verification_token = EmailVerificationTokenGenerator()


def build_verification_link(user):
    """Frontend URL the user clicks to verify, e.g.
    https://plantapp-black.vercel.app/verify-email?uid=<b64>&token=<token>
    """
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token.make_token(user)
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/verify-email?uid={uid}&token={token}"


def send_verification_email(user):
    """Send the verification email. Safe to call on register and on resend."""
    link = build_verification_link(user)
    name = user.display_name or user.username or "reforestador"

    subject = "Verifica tu correo — PlantApp 🌳"
    text_body = (
        f"¡Hola, {name}!\n\n"
        "Gracias por unirte a PlantApp. Para activar tu cuenta y empezar a "
        "registrar tus árboles, verifica tu correo haciendo clic en este enlace:\n\n"
        f"{link}\n\n"
        "Si tú no creaste esta cuenta, puedes ignorar este mensaje.\n\n"
        "— El equipo de PlantApp"
    )
    html_body = f"""\
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1e293b">
  <h1 style="color:#059669;font-size:22px">🌳 PlantApp</h1>
  <p>¡Hola, <strong>{name}</strong>!</p>
  <p>Gracias por unirte. Para activar tu cuenta y empezar a registrar tus árboles,
     verifica tu correo:</p>
  <p style="text-align:center;margin:28px 0">
    <a href="{link}"
       style="background:#059669;color:#fff;text-decoration:none;padding:12px 28px;
              border-radius:10px;font-weight:600;display:inline-block">
      Verificar mi correo
    </a>
  </p>
  <p style="font-size:13px;color:#64748b">
    Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
    <a href="{link}" style="color:#059669;word-break:break-all">{link}</a>
  </p>
  <p style="font-size:13px;color:#94a3b8">
    Si tú no creaste esta cuenta, puedes ignorar este mensaje.
  </p>
</div>"""

    # Prefer Brevo's HTTPS API when configured: many hosts (Render included)
    # filter outbound SMTP, so port-443 delivery is the reliable path.
    if settings.BREVO_API_KEY:
        _send_via_brevo(user.email, name, subject, html_body, text_body)
        return

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    message.attach_alternative(html_body, "text/html")
    # fail_silently=False so registration surfaces a real error if SMTP is
    # misconfigured, instead of silently telling the user to check their inbox.
    message.send(fail_silently=False)


def _send_via_brevo(to_email, to_name, subject, html_body, text_body):
    """Send a transactional email through Brevo's HTTP API (port 443).

    Raises on any non-success so the caller can roll back the signup.
    """
    from_name, from_email = parseaddr(settings.DEFAULT_FROM_EMAIL)
    payload = {
        "sender": {"name": from_name or "PlantApp", "email": from_email},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_body,
    }
    request = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
            "accept": "application/json",
        },
        method="POST",
    )
    # urlopen raises HTTPError on 4xx/5xx (e.g. unverified sender), which
    # propagates up and triggers the signup rollback in the view.
    # nosec B310: Bandit flags urlopen for scheme-injection (file://, etc.),
    # but the URL above is a hardcoded https:// literal, never user input,
    # so there's nothing to inject.
    with urllib.request.urlopen(request, timeout=15) as response:  # nosec B310
        if response.status not in (200, 201):
            raise RuntimeError(f"Brevo API returned status {response.status}")
