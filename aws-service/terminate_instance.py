
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['i-073fb2359298e84de'])
    print("Instance i-073fb2359298e84de terminated.")
