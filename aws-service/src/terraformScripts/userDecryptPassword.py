import subprocess
import psycopg2
import json
import time
import sys

# Database connection details
DB_CONFIG = {
    "dbname": "golab",
    "user": "postgres",
    "password": "Corp@123",
    "host": "localhost",
    "port": 5432
}

# Ensure correct private key path (Update if needed)
KEY_PAIR_PATH = r"C:/Users/Administrator/Downloads/golabing_key.pem"
def extract_and_store_password(user_id, public_ip, instance_id):
    """Wait for 4 minutes, retry password extraction, and store it in the database."""
    print("Waiting for 4 minutes before retrieving password...")
    time.sleep(260)  # Wait for ~4 minutes

    retries = 5
    password = None

    for attempt in range(retries):
        print(f"Attempt {attempt + 1} to get password...")

        try:
            # AWS CLI command to retrieve password
            aws_command = f'aws ec2 get-password-data --instance-id {instance_id} --priv-launch-key "{KEY_PAIR_PATH}" --output json'
            
            result = subprocess.run(
                ["powershell.exe", "-Command", aws_command], 
                capture_output=True, text=True
            )

            if result.returncode == 0:
                output = result.stdout.strip()

                try:
                    password_data = json.loads(output)
                    password = password_data.get("PasswordData", "").strip()
                except json.JSONDecodeError as e:
                    print(f"JSON decoding error: {e}")
                    print("Raw output:", output)

                if password:
                    print(f"Retrieved password: {password}")
                    break
                else:
                    print("Password is empty, retrying...")

            else:
                print(f"Error retrieving password: {result.stderr}")

        except Exception as e:
            print(f"Error extracting password: {e}")

        time.sleep(30)  # Wait before retrying

    if password:
        try:
            # Update the password in the database using user_id, public_ip, and instance_id
            conn = psycopg2.connect(**DB_CONFIG)
            cursor = conn.cursor()

            cursor.execute(
                "UPDATE instances SET password = %s WHERE user_id = %s AND public_ip = %s AND instance_id = %s",
                (password, user_id, public_ip, instance_id)
            )
            conn.commit()

            cursor.close()
            conn.close()
            print(f"Password stored in database for instance {instance_id}.")
        except Exception as e:
            print(f"Error storing password in database: {e}")
    else:
        print("Failed to retrieve password after multiple attempts.")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python script.py <user_id> <public_ip> <instance_id>")
        sys.exit(1)

    # Retrieve arguments from sys.argv
    user_id = sys.argv[1]
    public_ip = sys.argv[2]
    instance_id = sys.argv[3]

    # Run the password extraction and storage process
    extract_and_store_password(user_id, public_ip, instance_id)