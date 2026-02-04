import sys
import psycopg2
import boto3
from datetime import datetime, timezone
import time

# ==============================
# ARGUMENTS
# ==============================
if len(sys.argv) not in [8, 10]:
    print("Usage: python main.py <USERNAME> <AMI_ID> <USER_ID> <LAB_ID> <INSTANCE_TYPE> <START_DATE> <END_DATE>")
    print("Format: YYYY-MM-DD HH:MM:SS (UTC)")
    sys.exit(1)

username      = sys.argv[1]
ami_id        = sys.argv[2]
user_id       = sys.argv[3]
lab_id        = sys.argv[4]
instance_type = sys.argv[5]
start_date    = sys.argv[6]
end_date      = sys.argv[7]

# Optional batch info
batch     = None
batch_id  = None

if len(sys.argv) == 10:
    batch    = sys.argv[8]
    batch_id =  None if not sys.argv[9] or sys.argv[9] == "null" else sys.argv[9]

instance_name = f"{username}_{user_id}"

# ==============================
# TIME VALIDATION
# ==============================
try:
    start_dt = datetime.strptime(start_date, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    end_dt   = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
except ValueError:
    print("Invalid date format")
    sys.exit(1)

now_utc = datetime.now(timezone.utc)

print("Current UTC:", now_utc)
print("Start UTC  :", start_dt)
print("End UTC    :", end_dt)

if now_utc < start_dt:
    print(" Lab not started yet")
    sys.exit(1)

if now_utc > end_dt:
    print(" Lab expired")
    sys.exit(1)

print(" Time window valid. Creating VM...")

# ==============================
# DATABASE CONFIG
# ==============================
db_config = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": 5432
}

# ==============================
# AWS EC2 CREATION
# ==============================
ec2 = boto3.client("ec2", region_name="us-east-1")

response = ec2.run_instances(
    ImageId=ami_id,
    InstanceType=instance_type,
    MinCount=1,
    MaxCount=1,
    TagSpecifications=[
        {
            "ResourceType": "instance",
            "Tags": [{"Key": "Name", "Value": instance_name}]
        }
    ]
)

instance_id = response["Instances"][0]["InstanceId"]
print(f"Instance created: {instance_id}")

# ==============================
# WAIT UNTIL RUNNING
# ==============================
waiter = ec2.get_waiter("instance_running")
waiter.wait(InstanceIds=[instance_id])

desc = ec2.describe_instances(InstanceIds=[instance_id])
public_ip = desc["Reservations"][0]["Instances"][0].get("PublicIpAddress")

print("Public IP:", public_ip)

# ==============================
# FETCH PASSWORD
# ==============================
instance_password = ""

conn = psycopg2.connect(**db_config)
cursor = conn.cursor()
cursor.execute("SELECT password FROM Instances WHERE lab_id = %s", (lab_id,))
row = cursor.fetchone()
if row:
    instance_password = row[0]
cursor.close()
conn.close()

# ==============================
# INSERT INTO DATABASE
# ==============================
conn = psycopg2.connect(**db_config)
cursor = conn.cursor()

cursor.execute("""
INSERT INTO cloudAssignedInstance
(username, user_id, lab_id, instance_id, public_ip, instance_name, instance_type, start_date, end_date, password,batch,batch_id)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
""", (
    username, user_id, lab_id, instance_id, public_ip,
    instance_name, instance_type, start_dt, end_dt, instance_password,batch,batch_id
))

conn.commit()
cursor.close()
conn.close()

# ==============================
# TERMINATION LAMBDA SCRIPT
# ==============================
lambda_code = f"""
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['{instance_id}'])
    print("Instance {instance_id} terminated")
"""

with open("terminate_instance.py", "w") as f:
    f.write(lambda_code)

# ==============================
# FINAL OUTPUT
# ==============================
print("====================================")
print("VM CREATED SUCCESSFULLY")
print("User       :", username)
print("InstanceID :", instance_id)
print("Public IP  :", public_ip)
print("====================================")