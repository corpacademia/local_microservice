
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['i-0a1b573b685a3674e'])
    print("Instance i-0a1b573b685a3674e terminated")
