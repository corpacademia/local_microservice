import boto3
import json
import sys
import secrets
import string
import psycopg2
import re

import re

def sanitize_username(username):
    return re.sub(r"[^a-zA-Z0-9+=,.@_-]", "-", username)

def build_policy(username, services):
    allowed_actions = [f"{service}:*" for service in services]
    policy_document = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowFullServiceAccessForUserOwnedResources",
                "Effect": "Allow",
                "Action": allowed_actions,
                "Resource": "*",
            }
        ]
    }
    return policy_document


def create_iam_user(iam_client, username):
    try:
        response = iam_client.create_user(UserName=username)
        print(f"IAM user '{username}' created successfully.")
        return response
    except iam_client.exceptions.EntityAlreadyExistsException:
        print(f"User '{username}' already exists.")
        sys.exit(1)
    except Exception as e:
        print(f"Error creating user: {e}")
        sys.exit(1)


def attach_inline_policy(iam_client, username, policy_document):
    policy_name = "UserLimitedAccessPolicy"
    try:
        iam_client.put_user_policy(
            UserName=username,
            PolicyName=policy_name,
            PolicyDocument=json.dumps(policy_document)
        )
        print(f"Inline policy '{policy_name}' attached to user '{username}' successfully.")
    except Exception as e:
        print(f"Error attaching inline policy: {e}")
        sys.exit(1)


def generate_random_password(length=16):
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


def create_login_profile(iam_client, username, password):
    try:
        iam_client.create_login_profile(
            UserName=username,
            Password=password,
            PasswordResetRequired=False
        )
        print("Login profile created successfully.")
    except Exception as e:
        print(f"Error creating login profile: {e}")
        sys.exit(1)


def get_console_login_link(iam_client):
    try:
        response = iam_client.list_account_aliases()
        aliases = response.get('AccountAliases', [])
        if aliases:
            alias = aliases[0]
            console_url = f"https://{alias}.signin.aws.amazon.com/console"
        else:
            sts_client = boto3.client('sts')
            account_id = sts_client.get_caller_identity().get('Account')
            console_url = f"https://{account_id}.signin.aws.amazon.com/console"
    except Exception as e:
        print(f"Error retrieving console login link: {e}")
        console_url = "Console login URL could not be generated."
    return console_url


def update_credentials_in_db(username, password, console_url, role, labid, orgid=None, user_id=None,purchased=False):
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password="Corp@123",
            dbname="golab"
        )
        cur = conn.cursor()
        if role == "superadmin" or role == "orgsuperadmin" :
            
            table = "cloudslicelab"
            query = f"""
                UPDATE {table}
                SET username = %s, password = %s, console_url = %s
                WHERE labid = %s;
            """
            cur.execute(query, (username, password, console_url, labid))

        elif role == "orgadmin":
            table = "cloudsliceorgassignment"
            if orgid is None:
                print("Error: orgid is required for orgadmin role.")
                return
            query = f"""
                UPDATE {table}
                SET username = %s, password = %s, console_url = %s
                WHERE labid = %s AND orgid = %s;
            """
            cur.execute(query, (username, password, console_url, labid, orgid))

        elif role == "user":
            if purchased:
                table = 'cloudslice_purchased_labs'
            else:
                table = "cloudsliceuserassignment"
            if user_id is None:
                print("Error: user_id is required for user role.")
                return
            query = f"""
                UPDATE {table}
                SET username = %s, password = %s, console_url = %s
                WHERE labid = %s AND user_id = %s;
            """
            cur.execute(query, (username, password, console_url, labid, user_id))

        else:
            print("Invalid role provided. No DB update performed.")
            return

        conn.commit()
        cur.close()
        conn.close()
        print(f"Credentials updated in '{table}' table successfully.")

    except Exception as e:
        print(f"Database update error: {e}")
        sys.exit(1)


def main():
    if len(sys.argv) < 6:
        print("Usage: python iam_user.py <username> <service1,service2,...> <role> <labid> [orgid/userid] [purchased]")
        sys.exit(1)

    username = sys.argv[1]
    original_username = sys.argv[1]
    username = sanitize_username(original_username)

    services = sys.argv[2].split(",")
    role = sys.argv[3]
    labid = sys.argv[4]

    orgid = None
    user_id = None
    purchased = False

    if role == "orgadmin" and len(sys.argv) >= 6:
        orgid = sys.argv[5]

    if role == "user":
        if len(sys.argv) >= 6:
            user_id = sys.argv[5]
        if len(sys.argv) >= 7:
            # Convert string to boolean
            purchased = sys.argv[6].lower() == "true"

    # For superadmin/orgsuperadmin roles, optionally accept purchased
    if role in ("superadmin", "orgsuperadmin") and len(sys.argv) >= 6:
        purchased = sys.argv[5].lower() == "true"

    iam_client = boto3.client('iam')

    create_iam_user(iam_client, username)

    policy_document = build_policy(username, services)
    print("Created policy document:")
    print(json.dumps(policy_document, indent=4))
    attach_inline_policy(iam_client, username, policy_document)

    password = generate_random_password()
    create_login_profile(iam_client, username, password)

    console_url = get_console_login_link(iam_client)

    print("\nIAM User Credentials:")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print(f"Console Login URL: {console_url}")

    update_credentials_in_db(username, password, console_url, role, labid, orgid, user_id, purchased)


if __name__ == "__main__":
    main()