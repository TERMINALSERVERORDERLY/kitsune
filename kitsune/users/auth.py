import base64

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.models import User

from mozilla_django_oidc.auth import OIDCAuthenticationBackend

from kitsune.users.utils import get_oidc_fxa_setting


class ModelBackendAllowInactive(ModelBackend):
    """
    Standard model authentication that also allows inactive users.

    This is necessary as new registered users are marked inactive
    but still logged in automatically. Some control around logging
    in as an active user is still retained via the ``only_active``
    argument of ``kitsune.users.forms.AuthenticationForm``.
    """

    def user_can_authenticate(self, user):
        """
        Allow users with is_active=False.
        """
        return True


class TokenLoginBackend(object):
    """Authenticates users based on tokens that can be passed in urls.

    Tokens are the string '{username}:{token}' base64 encoded, where
    username is the username of the user to be logged in, and token is
    a token generated by `django.contrib.auth.tokens.default_token_generator`
    for that user.

    A user can only be logged in once for each token, because the token
    creation process includes the last login time for a user. Once a
    user logs in, the token won't work again. The token will also stop
    working if the user's password changes.

    :returns: A user object if the user is authenticated succesfully, or
        None if the user was not authenticated.
    """

    def authenticate(self, auth):
        try:
            decoded = base64.b64decode(auth)
        except (TypeError, UnicodeDecodeError):
            return None

        if ':' not in decoded:
            return None
        username, token = decoded.split(':')
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return None

        match = default_token_generator.check_token(user, token)
        if match:
            return user
        else:
            return None

    def get_user(self, user_id):
        try:
            user = User.objects.get(pk=user_id)
            user.backend = 'kitsune.users.auth.TokenLoginMiddleware'
            return user
        except User.DoesNotExist:
            return None


def get_auth_str(user):
    """Creates an auth string based on {username}:{token}"""
    token = default_token_generator.make_token(user)
    auth = '{0}:{1}'.format(user.username, token)
    return base64.b64encode(auth)


class FXAAuthBackend(OIDCAuthenticationBackend):

    @staticmethod
    def get_settings(attr, *args):
        """Override settings for Firefox Accounts Provider."""
        val = get_oidc_fxa_setting(attr)
        if val is not None:
            return val
        return super(FXAAuthBackend, FXAAuthBackend).get_settings(attr, *args)
