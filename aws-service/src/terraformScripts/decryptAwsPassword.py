import boto3
import base64
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5


ec2_client = boto3.client("ec2")


def decrypt_windows_password(encrypted_password, private_key_pem):
    key = RSA.import_key(private_key_pem)
    cipher = PKCS1_v1_5.new(key)
    decoded = base64.b64decode(encrypted_password)
    return cipher.decrypt(decoded, None).decode("utf-8")


def get_ec2_credentials(instance_id, private_key_pem=None):
    """
    Returns:
        {
            "username": str,
            "password": str | None
        }
    """

    try:
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        instance = response["Reservations"][0]["Instances"][0]

        # ---------------- WINDOWS ----------------
        if instance.get("Platform") == "windows":
            username = "Administrator"

            if not private_key_pem:
                raise Exception("Private key required to decrypt Windows password")

            password_data = ec2_client.get_password_data(InstanceId=instance_id)

            if not password_data["PasswordData"]:
                return {
                    "username": username,
                    "password": None  # Password not ready yet
                }

            password = decrypt_windows_password(
                password_data["PasswordData"], private_key_pem
            )

            return {
                "username": username,
                "password": password
            }

        # ---------------- LINUX ----------------
        image_id = instance["ImageId"]
        image = ec2_client.describe_images(ImageIds=[image_id])["Images"][0]
        image_name = image["Name"].lower()

        if "ubuntu" in image_name:
            username = "ubuntu"
        elif "debian" in image_name:
            username = "admin"
        else:
            username = "ec2-user"

        return {
            "username": username,
            "password": None  # Linux has no default password
        }

    except Exception as e:
        return {
            "username": "ec2-user",
            "password": None
        }
