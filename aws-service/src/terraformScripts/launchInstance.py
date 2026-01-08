import sys
import subprocess
import json
import psycopg2
import boto3
from datetime import datetime
import re

# Ensure correct usage
if len(sys.argv) != 8:
    print("Usage: python main.py <USERNAME> <GOLDEN_AMI_ID> <USER_ID> <LAB_ID> <INSTANCE_TYPE> <START_DATE> <END_DATE>")
    print("Date format: YYYY-MM-DD HH:MM:SS (UTC)")
    sys.exit(1)

username      = sys.argv[1]
ami_id        = sys.argv[2]
user_id       = sys.argv[3]
lab_id        = sys.argv[4]
instance_type = sys.argv[5]
start_date    = sys.argv[6]
end_date      = sys.argv[7]

# Instance name
instance_name = f"{username}_{user_id}"

# UNIQUE name using timestamp
timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', f"{instance_name}_{timestamp}")

terraform_resource_name = f"app_{safe_name}"

# Validate dates
try:
    start_datetime = datetime.strptime(start_date, "%Y-%m-%d %H:%M:%S")
    end_datetime   = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S")
    if start_datetime >= end_datetime:
        print("Error: Start date must be before end date.")
        sys.exit(1)
except ValueError:
    print("Invalid date format. Use YYYY-MM-DD HH:MM:SS")
    sys.exit(1)

# DB config
db_config = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": 5432
}

# Ensure table exists
conn = psycopg2.connect(**db_config)
cursor = conn.cursor()
cursor.execute("""
CREATE TABLE IF NOT EXISTS cloudAssignedInstance (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    user_id VARCHAR(255),
    lab_id VARCHAR(255),
    instance_id VARCHAR(255),
    public_ip VARCHAR(255),
    instance_name VARCHAR(255),
    instance_type VARCHAR(255),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
conn.commit()
cursor.close()
conn.close()

# Terraform script (APPENDED)
terraform_script = f"""
resource "aws_instance" "{terraform_resource_name}" {{
  ami           = "{ami_id}"
  instance_type = "{instance_type}"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {{
    Name = "{instance_name}"
  }}
}}

output "instance_id_{safe_name}" {{
  value = aws_instance.{terraform_resource_name}.id
}}

output "public_ip_{safe_name}" {{
  value = aws_instance.{terraform_resource_name}.public_ip
}}
"""

# Append to main.tf (IMPORTANT FIX)
with open("main.tf", "a") as f:
    f.write("\n\n")
    f.write(terraform_script)

# Run Terraform
subprocess.run(["terraform", "init", "-upgrade"], check=True)
subprocess.run(["terraform", "apply", "-auto-approve"], check=True)

# Get Terraform outputs
result = subprocess.run(["terraform", "output", "-json"], capture_output=True, text=True, check=True)
output_data = json.loads(result.stdout)

instance_id = output_data.get(f"instance_id_{safe_name}", {}).get("value")
public_ip   = output_data.get(f"public_ip_{safe_name}", {}).get("value")

if not instance_id or not public_ip:
    print("ERROR retrieving instance details")
    sys.exit(1)

# Fetch password from Instances table
instance_password = ""
conn = psycopg2.connect(**db_config)
cursor = conn.cursor()
cursor.execute("SELECT password FROM Instances WHERE lab_id = %s", (lab_id,))
row = cursor.fetchone()
if row:
    instance_password = row[0]
cursor.close()
conn.close()

# Insert into DB
conn = psycopg2.connect(**db_config)
cursor = conn.cursor()
cursor.execute("""
INSERT INTO cloudAssignedInstance
(username, user_id, lab_id, instance_id, public_ip, instance_name, instance_type, start_date, end_date, password)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
""",
(username, user_id, lab_id, instance_id, public_ip, instance_name, instance_type, start_date, end_date, instance_password)
)
conn.commit()
cursor.close()
conn.close()

# Termination Lambda script
lambda_script = f"""
import boto3
def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['{instance_id}'])
    print("Instance {instance_id} terminated.")
"""

with open("terminate_instance.py", "w") as f:
    f.write(lambda_script)

print("====================================")
print(f"User          : {username}")
print(f"Instance Name : {instance_name}")
print(f"Instance ID   : {instance_id}")
print(f"Public IP     : {public_ip}")
print("====================================")
print("Saved to database successfully.")