import sys
import boto3
import json

# AWS Configuration
AWS_REGION = "us-east-1"
ec2_client = boto3.client("ec2", region_name=AWS_REGION)


def get_default_username(instance_id):
    try:
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        instance = response["Reservations"][0]["Instances"][0]

        # Windows detection (reliable)
        if instance.get("Platform") == "windows":
            return "Administrator"

        image_id = instance["ImageId"]
        image = ec2_client.describe_images(ImageIds=[image_id])["Images"][0]
        image_name = image["Name"].lower()

        if "ubuntu" in image_name:
            return "ubuntu"
        elif "debian" in image_name:
            return "admin"
        else:
            return "ec2-user"

    except Exception:
        return "ec2-user"


# ---------------- READ ARGUMENTS ----------------
if len(sys.argv) < 4:
    print("Error: Missing required arguments")
    sys.exit(1)

os_type = sys.argv[1].strip().lower()   # linux / windows
instance_id = sys.argv[2]
password = sys.argv[3] if len(sys.argv) > 3 else ""


# ---------------- OUTPUT CREDENTIALS ----------------
if os_type == "linux" or os_type == "ubuntu":
    username = get_default_username(instance_id)
    password = ""   # Linux has no default password
    port = '22'
    protocol ='ssh'

else:  # windows
    username = "Administrator"
    password = password  # received from Node.js
    port = '3389'
    protocol = 'rdp'


# ---------------- PRINT AS JSON ----------------
result = {
    "username": username,
    "password": password,
    "protocol" : protocol,
    "port" : port
}

sys.stdout.write(json.dumps(result))
