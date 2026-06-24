import psycopg2
import os
import boto3
from pathlib import Path
 
# PostgreSQL database configuration
db_config = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": 5432
}
 
# Step 1: Fetch instance data from the PostgreSQL database
def fetch_instance_data():
    query = "SELECT lab_id, instance, storage, os, os_version, title FROM createlab ORDER BY created_at DESC LIMIT 1;"
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute(query)
        result = cursor.fetchone()
        conn.close()
    except Exception as e:
        raise RuntimeError(f"Error fetching data from the database: {e}")
   
    if not result:
        raise ValueError("No data found in the database.")
   
    lab_id, instance_type, storage_size, os_name, os_version, instance_name = result
    return lab_id, instance_type, storage_size, os_name, os_version, instance_name
 
# Step 2: Get the AMI for the specified OS and version
def get_ami_for_os(os_name, os_version):
 
    ec2 = boto3.client("ec2", region_name="us-east-1")
 
    os_name = os_name.lower()
    os_version = os_version.lower()
 
    # =========================
    # WINDOWS SERVER
    # =========================
    if "windows" in os_name:
 
        owners = ["801119661308"]   # Microsoft
 
        # Windows Server 2025
        if "2025" in os_version and "core" in os_version:
            name_filter = "Windows_Server-2025-English-Core-Base-*"
 
        elif "2025" in os_version and "core" not in os_version:
            name_filter = "Windows_Server-2025-English-Full-Base-*"
 
        # Windows Server 2022
        elif "2022" in os_version and "core" in os_version:
            name_filter = "Windows_Server-2022-English-Core-Base-*"
 
        elif "2022" in os_version and "core" not in os_version:
            name_filter = "Windows_Server-2022-English-Full-Base-*"
 
        # Windows Server 2019
        elif "2019" in os_version and "core" in os_version:
            name_filter = "Windows_Server-2019-English-Core-Base-*"
 
        elif "2019" in os_version and "core" not in os_version:
            name_filter = "Windows_Server-2019-English-Full-Base-*"
 
        # Windows Server 2016
        elif "2016" in os_version and "core" in os_version:
            name_filter = "Windows_Server-2016-English-Core-Base-*"
 
        elif "2016" in os_version and "core" not in os_version:
            name_filter = "Windows_Server-2016-English-Full-Base-*"
 
        else:
            raise ValueError(f"Unsupported Windows version: {os_version}")
 
    # =========================
    # UBUNTU
    # =========================
    elif "ubuntu" in os_name:
        owners = ["099720109477"]
 
        if "22.04" in os_version:
            name_filter = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
        elif "24.04" in os_version:
            name_filter = "ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*"
        else:
            raise ValueError(f"Unsupported Ubuntu version: {os_version}")
 
    # =========================
    # AMAZON LINUX
    # =========================
    elif "linux" in os_name and "amazon" in os_version or "amazon linux" in os_version:
        owners = ["137112412989"]
        name_filter = "al2023-ami-*-x86_64"
 
    # =========================
    # RHEL
    # =========================
    elif "rhel" in os_name or "red hat" in os_version:
        owners = ["309956199498"]
 
        if "9" in os_version:
            name_filter = "RHEL-9.*_HVM-*"
        elif "8" in os_version:
            name_filter = "RHEL-8.*_HVM-*"
        else:
            raise ValueError(f"Unsupported RHEL version: {os_version}")
 
    else:
        raise ValueError(f"Unsupported OS: {os_name} {os_version}")
 
 
    # =========================
    # FETCH LATEST AMI
    # =========================
    response = ec2.describe_images(
        Owners=owners,
        Filters=[
            {"Name": "name", "Values": [name_filter]},
            {"Name": "state", "Values": ["available"]}
        ]
    )
 
    images = sorted(
        response["Images"],
        key=lambda x: x["CreationDate"],
        reverse=True
    )
 
    if not images:
        raise RuntimeError(f"No AMIs found for filter: {name_filter}")
 
    return images[0]["ImageId"]
 
 
# Step 3: Generate Terraform configuration file with SSM IAM Role attached
def generate_terraform_file(instance_type, storage_size, ami_id, instance_name, lab_id):
    terraform_config = f"""
provider "aws" {{
  region = "us-east-1"
}}
 
# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_{lab_id}" {{
  name = "ssm_role_{lab_id}"
  assume_role_policy = <<EOF
{{
  "Version": "2012-10-17",
  "Statement": [
    {{
      "Effect": "Allow",
      "Principal": {{
        "Service": "ec2.amazonaws.com"
      }},
      "Action": "sts:AssumeRole"
    }}
  ]
}}
EOF
}}
 
resource "aws_iam_role_policy_attachment" "ssm_role_attach_{lab_id}" {{
  role       = aws_iam_role.ssm_role_{lab_id}.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}}
 
resource "aws_iam_instance_profile" "ssm_instance_profile_{lab_id}" {{
  name = "ssm_instance_profile_{lab_id}"
  role = aws_iam_role.ssm_role_{lab_id}.name
}}
 
# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_{lab_id}" {{
  ami           = "{ami_id}"
  instance_type = "{instance_type}"
  key_name      = "golab"
  vpc_security_group_ids = ["sg-0f4f7aca4400a8db8"]
 
  root_block_device {{
    volume_size = {storage_size}
    volume_type = "gp2"
    encrypted = true
  }}
 
  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_{lab_id}.name
  hibernation = true
  tags = {{
    Name = "{instance_name}-{lab_id}"
  }}
}}
 
output "instance_id" {{
  value = aws_instance.aws_{lab_id}.id
}}
"""
    try:
        tf_dir = Path(f"./terraform_{lab_id}")
        tf_dir.mkdir(parents=True, exist_ok=True)
        tf_filename = tf_dir / "main.tf"
        tf_filename.write_text(terraform_config)
        print(f"Terraform directory and configuration file created successfully for lab_id {lab_id}.")
        return str(tf_dir)
    except Exception as e:
        raise RuntimeError(f"Error generating Terraform file: {e}")
 
# Main function
if __name__ == "__main__":
    try:
        # Fetch instance details from the database
        lab_id, instance_type, storage_size, os_name, os_version, instance_name = fetch_instance_data()
 
        # Get the AMI ID for the OS and version
        ami_id = get_ami_for_os(os_name, os_version)
 
        # Generate Terraform configuration with SSM IAM Role attached
        tf_dir = generate_terraform_file(instance_type, storage_size, ami_id, instance_name, lab_id)
 
        print("Terraform setup successful. You can now proceed with Terraform execution manually.")
    except Exception as e:
        print(f"Error: {e}")