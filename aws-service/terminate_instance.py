
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['i-00f2dbb1a53153454'])
    print("Instance i-00f2dbb1a53153454 terminated.")
