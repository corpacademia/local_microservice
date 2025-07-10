
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['i-01e39dd65509e23d1'])
    print("Instance i-01e39dd65509e23d1 terminated.")
