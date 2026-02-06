
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2', region_name='us-east-1')
    ec2.terminate_instances(InstanceIds=['i-0902ebc3d3375ae31'])
    print("Instance i-0902ebc3d3375ae31 terminated")
