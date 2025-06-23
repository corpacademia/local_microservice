
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['i-0c0ee65c70e67e54e'])
    print("Instance i-0c0ee65c70e67e54e terminated.")
