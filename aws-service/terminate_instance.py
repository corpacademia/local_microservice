
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['i-01292e1b8360bc312'])
    print("Instance i-01292e1b8360bc312 terminated")
