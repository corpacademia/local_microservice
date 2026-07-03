import boto3
import sys
import secrets
import string
from botocore.exceptions import ClientError

# Removes the deny policy and rotates the console password.
# The Node.js controller reads the new password from stdout and updates the DB.
DENY_POLICY_NAME = "GoLabDailyLimitDeny"


def generate_password(length=16):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def enable_iam_access(username):
    iam = boto3.client('iam')

    # Remove the deny policy (if it was attached when limit was reached)
    try:
        iam.delete_user_policy(UserName=username, PolicyName=DENY_POLICY_NAME)
        print(f"Deny policy removed from '{username}'.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchEntity':
            print(f"No deny policy found on '{username}' — already clean.")
        else:
            print(f"Error removing deny policy: {e}")
            sys.exit(1)

    # Rotate the console password
    password = generate_password()
    try:
        iam.update_login_profile(UserName=username, Password=password, PasswordResetRequired=False)
        print(f"Login profile password rotated for '{username}'.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchEntity':
            iam.create_login_profile(UserName=username, Password=password, PasswordResetRequired=False)
            print(f"Login profile recreated for '{username}'.")
        else:
            print(f"Error updating login profile: {e}")
            sys.exit(1)

    # Print the new password on its own line so the Node.js controller can parse it
    print(f"GENERATED_PASSWORD:{password}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python enableIamLoginProfile.py <username>")
        sys.exit(1)
    enable_iam_access(sys.argv[1])
