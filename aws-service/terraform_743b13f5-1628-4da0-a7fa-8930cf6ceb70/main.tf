
provider "aws" {
  region = "us-east-1"
}

# IAM Role for SSM with AmazonSSMManagedInstanceCore policy attached
resource "aws_iam_role" "ssm_role_743b13f5-1628-4da0-a7fa-8930cf6ceb70" {
  name = "ssm_role_743b13f5-1628-4da0-a7fa-8930cf6ceb70"
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

resource "aws_iam_role_policy_attachment" "ssm_role_attach_743b13f5-1628-4da0-a7fa-8930cf6ceb70" {
  role       = aws_iam_role.ssm_role_743b13f5-1628-4da0-a7fa-8930cf6ceb70.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm_instance_profile_743b13f5-1628-4da0-a7fa-8930cf6ceb70" {
  name = "ssm_instance_profile_743b13f5-1628-4da0-a7fa-8930cf6ceb70"
  role = aws_iam_role.ssm_role_743b13f5-1628-4da0-a7fa-8930cf6ceb70.name
}

# EC2 instance resource with the IAM instance profile attached
resource "aws_instance" "aws_743b13f5-1628-4da0-a7fa-8930cf6ceb70" {
  ami           = "ami-0475fc1bab1e86604"
  instance_type = "t3.small"
  key_name      = "Aws2"
  vpc_security_group_ids = ["sg-038ccec9310169fce"]

  root_block_device {
    volume_size = 50
    volume_type = "gp2"
    encrypted = true
  }

  iam_instance_profile = aws_iam_instance_profile.ssm_instance_profile_743b13f5-1628-4da0-a7fa-8930cf6ceb70.name
  hibernation = true
  tags = {
    Name = "Guacamole Single VM Aws-743b13f5-1628-4da0-a7fa-8930cf6ceb70"
  }
}

output "instance_id" {
  value = aws_instance.aws_743b13f5-1628-4da0-a7fa-8930cf6ceb70.id
}
