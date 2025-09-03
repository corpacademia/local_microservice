
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_00a28138-1b9e-48ca-90eb-4870b6a758cf" {
  name = "ssm_role_00a28138-1b9e-48ca-90eb-4870b6a758cf"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "ssm_role_attach_00a28138-1b9e-48ca-90eb-4870b6a758cf" {
  role       = aws_iam_role.ssm_role_00a28138-1b9e-48ca-90eb-4870b6a758cf.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_00a28138-1b9e-48ca-90eb-4870b6a758cf" {
  name = "ssm_instance_profile_00a28138-1b9e-48ca-90eb-4870b6a758cf"
  role = aws_iam_role.ssm_role_00a28138-1b9e-48ca-90eb-4870b6a758cf.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_00a28138-1b9e-48ca-90eb-4870b6a758cf" {
  ami           = "ami-0475fc1bab1e86604"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
    encrypted = true
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_00a28138-1b9e-48ca-90eb-4870b6a758cf.name
  hibernation = true
  tags = {
    Name = "Aws Test Lab-00a28138-1b9e-48ca-90eb-4870b6a758cf"
  }
}

output "instance_id" {
  value = aws_instance.aws_00a28138-1b9e-48ca-90eb-4870b6a758cf.id
}
