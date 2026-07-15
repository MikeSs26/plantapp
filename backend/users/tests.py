"""Tests for the email-verification signup flow.

Django's test runner swaps in the locmem email backend automatically, so
mail.outbox captures anything the code tries to send.
"""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APITestCase

from .emails import email_verification_token

User = get_user_model()


class EmailVerificationTests(APITestCase):
    REGISTER = "/api/auth/register/"
    LOGIN = "/api/auth/login/"
    VERIFY = "/api/auth/verify-email/"
    RESEND = "/api/auth/resend-verification/"

    def register(self, email="new@test.com", username="newbie"):
        return self.client.post(
            self.REGISTER,
            {
                "email": email,
                "password": "Reforestar2026!",
                "username": username,
                "display_name": "New Bie",
            },
        )

    def tokens_for(self, user):
        return (
            urlsafe_base64_encode(force_bytes(user.pk)),
            email_verification_token.make_token(user),
        )

    def test_register_creates_unverified_user_and_sends_email(self):
        res = self.register()
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email="new@test.com")
        self.assertFalse(user.email_verified)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(user.email, mail.outbox[0].to)

    def test_login_blocked_until_verified(self):
        self.register()
        res = self.client.post(
            self.LOGIN, {"email": "new@test.com", "password": "Reforestar2026!"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("email_not_verified", str(res.data))

    def test_verify_then_login_succeeds(self):
        self.register()
        user = User.objects.get(email="new@test.com")
        uid, token = self.tokens_for(user)

        res = self.client.post(self.VERIFY, {"uid": uid, "token": token})
        self.assertEqual(res.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)

        login = self.client.post(
            self.LOGIN, {"email": "new@test.com", "password": "Reforestar2026!"}
        )
        self.assertEqual(login.status_code, 200)
        self.assertIn("access", login.data)

    def test_verify_with_bad_token_fails(self):
        self.register()
        user = User.objects.get(email="new@test.com")
        uid, _ = self.tokens_for(user)
        res = self.client.post(self.VERIFY, {"uid": uid, "token": "not-a-real-token"})
        self.assertEqual(res.status_code, 400)
        user.refresh_from_db()
        self.assertFalse(user.email_verified)

    def test_used_link_is_not_replayable(self):
        # Once verified, the same token must stop working (hash includes
        # email_verified) — but the endpoint stays friendly (idempotent 200).
        self.register()
        user = User.objects.get(email="new@test.com")
        uid, token = self.tokens_for(user)
        self.client.post(self.VERIFY, {"uid": uid, "token": token})

        again = self.client.post(self.VERIFY, {"uid": uid, "token": token})
        self.assertEqual(again.status_code, 200)  # idempotent "already verified"
        # Reload so the token hash is recomputed against email_verified=True.
        user.refresh_from_db()
        self.assertFalse(email_verification_token.check_token(user, token))

    def test_resend_is_generic_and_sends_for_unverified(self):
        self.register()
        mail.outbox.clear()
        res = self.client.post(self.RESEND, {"email": "new@test.com"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_unknown_email_reveals_nothing(self):
        res = self.client.post(self.RESEND, {"email": "ghost@test.com"})
        self.assertEqual(res.status_code, 200)  # same response, no enumeration
        self.assertEqual(len(mail.outbox), 0)

    def test_duplicate_email_rejected_case_insensitive(self):
        self.register(email="dup@test.com", username="dupone")
        res = self.register(email="DUP@test.com", username="duptwo")
        self.assertEqual(res.status_code, 400)
        self.assertIn("correo", str(res.data).lower())

    @override_settings(
        BREVO_API_KEY="test-key", DEFAULT_FROM_EMAIL="PlantApp <sender@x.com>"
    )
    def test_register_uses_brevo_http_api_when_configured(self):
        with patch("users.emails.urllib.request.urlopen") as urlopen:
            resp = MagicMock()
            resp.status = 201
            urlopen.return_value.__enter__.return_value = resp
            res = self.register()
        self.assertEqual(res.status_code, 201)
        self.assertTrue(urlopen.called)
        # Brevo path used → nothing went through the Django SMTP/locmem backend.
        self.assertEqual(len(mail.outbox), 0)
