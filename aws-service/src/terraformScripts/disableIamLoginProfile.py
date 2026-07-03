import boto3
import json
import sys
from botocore.exceptions import ClientError

# Attaches a deny-all inline policy to the IAM user.
# This takes effect IMMEDIATELY for all active sessions including open console tabs.
DENY_POLICY_NAME = "GoLabDailyLimitDeny"

DENY_ALL_POLICY = json.dumps({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyAllWhileDailyLimitReached",
            "Effect": "Deny",
            "Action": "*",
            "Resource": "*"
        }
    ]
})


def disable_iam_access(username):
    iam = boto3.client('iam')
    try:
        iam.put_user_policy(
            UserName=username,
            PolicyName=DENY_POLICY_NAME,
            PolicyDocument=DENY_ALL_POLICY
        )
        print(f"Deny policy attached to '{username}' — all console actions blocked immediately.")
    except ClientError as e:
        print(f"Error attaching deny policy: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python disableIamLoginProfile.py <username>")
        sys.exit(1)
    disable_iam_access(sys.argv[1])
