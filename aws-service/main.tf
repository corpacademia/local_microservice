
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.82.2"
    }
  }
}
 
provider "aws" {
  region = "us-east-1"
}
 
resource "aws_instance" "app_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"
 
  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF
 
  tags = {
    Name = "A1_34c17183-06ed-46d0-b1f8-49caef71ed1e"
  }
}
 
output "instance_id_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e" {
  value = aws_instance.app_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e.id
}
 
output "public_ip_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e" {
  value = aws_instance.app_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e.public_ip
}



resource "aws_instance" "app_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e_20260107071351" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "A1_34c17183-06ed-46d0-b1f8-49caef71ed1e"
  }
}

output "instance_id_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e_20260107071351" {
  value = aws_instance.app_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e_20260107071351.id
}

output "public_ip_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e_20260107071351" {
  value = aws_instance.app_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e_20260107071351.public_ip
}



resource "aws_instance" "app_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260107071647" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "Khan_1da5810e-6dfd-4629-a6db-a93f01871289"
  }
}

output "instance_id_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260107071647" {
  value = aws_instance.app_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260107071647.id
}

output "public_ip_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260107071647" {
  value = aws_instance.app_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260107071647.public_ip
}



resource "aws_instance" "app_Nagendra_E_6eb41c3e_0020_4118_8d4b_f1a9ca98b575_20260107072132" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "Nagendra E_6eb41c3e-0020-4118-8d4b-f1a9ca98b575"
  }
}

output "instance_id_Nagendra_E_6eb41c3e_0020_4118_8d4b_f1a9ca98b575_20260107072132" {
  value = aws_instance.app_Nagendra_E_6eb41c3e_0020_4118_8d4b_f1a9ca98b575_20260107072132.id
}

output "public_ip_Nagendra_E_6eb41c3e_0020_4118_8d4b_f1a9ca98b575_20260107072132" {
  value = aws_instance.app_Nagendra_E_6eb41c3e_0020_4118_8d4b_f1a9ca98b575_20260107072132.public_ip
}



resource "aws_instance" "app_Parveez_Khan_0ee99e02_557a_4600_8b71_ce0bb6414da1_20260107125547" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "Parveez Khan_0ee99e02-557a-4600-8b71-ce0bb6414da1"
  }
}

output "instance_id_Parveez_Khan_0ee99e02_557a_4600_8b71_ce0bb6414da1_20260107125547" {
  value = aws_instance.app_Parveez_Khan_0ee99e02_557a_4600_8b71_ce0bb6414da1_20260107125547.id
}

output "public_ip_Parveez_Khan_0ee99e02_557a_4600_8b71_ce0bb6414da1_20260107125547" {
  value = aws_instance.app_Parveez_Khan_0ee99e02_557a_4600_8b71_ce0bb6414da1_20260107125547.public_ip
}



resource "aws_instance" "app_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260108083627" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "user4_0c8fa041-f9a9-40bc-9707-cd557e57f82e"
  }
}

output "instance_id_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260108083627" {
  value = aws_instance.app_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260108083627.id
}

output "public_ip_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260108083627" {
  value = aws_instance.app_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260108083627.public_ip
}



resource "aws_instance" "app_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260108111228" {
  ami           = "ami-09ddeb14ac8b4a43a"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "Khan_1da5810e-6dfd-4629-a6db-a93f01871289"
  }
}

output "instance_id_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260108111228" {
  value = aws_instance.app_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260108111228.id
}

output "public_ip_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260108111228" {
  value = aws_instance.app_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260108111228.public_ip
}



resource "aws_instance" "app_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e_20260108113229" {
  ami           = "ami-09ddeb14ac8b4a43a"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "A1_34c17183-06ed-46d0-b1f8-49caef71ed1e"
  }
}

output "instance_id_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e_20260108113229" {
  value = aws_instance.app_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e_20260108113229.id
}

output "public_ip_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e_20260108113229" {
  value = aws_instance.app_A1_34c17183_06ed_46d0_b1f8_49caef71ed1e_20260108113229.public_ip
}



resource "aws_instance" "app_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260108115015" {
  ami           = "ami-09ddeb14ac8b4a43a"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "user4_0c8fa041-f9a9-40bc-9707-cd557e57f82e"
  }
}

output "instance_id_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260108115015" {
  value = aws_instance.app_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260108115015.id
}

output "public_ip_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260108115015" {
  value = aws_instance.app_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260108115015.public_ip
}



resource "aws_instance" "app_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260109080132" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "Khan_1da5810e-6dfd-4629-a6db-a93f01871289"
  }
}

output "instance_id_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260109080132" {
  value = aws_instance.app_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260109080132.id
}

output "public_ip_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260109080132" {
  value = aws_instance.app_Khan_1da5810e_6dfd_4629_a6db_a93f01871289_20260109080132.public_ip
}



resource "aws_instance" "app_Organization_superadmin_ddc04e8b_5395_4ef5_8e3d_14adc229c593_20260109092149" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "Organization superadmin_ddc04e8b-5395-4ef5-8e3d-14adc229c593"
  }
}

output "instance_id_Organization_superadmin_ddc04e8b_5395_4ef5_8e3d_14adc229c593_20260109092149" {
  value = aws_instance.app_Organization_superadmin_ddc04e8b_5395_4ef5_8e3d_14adc229c593_20260109092149.id
}

output "public_ip_Organization_superadmin_ddc04e8b_5395_4ef5_8e3d_14adc229c593_20260109092149" {
  value = aws_instance.app_Organization_superadmin_ddc04e8b_5395_4ef5_8e3d_14adc229c593_20260109092149.public_ip
}



resource "aws_instance" "app_Khan_c9c3b4dd_a3bd_4472_83ba_df5c35130422_20260109183806" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "Khan_c9c3b4dd-a3bd-4472-83ba-df5c35130422"
  }
}

output "instance_id_Khan_c9c3b4dd_a3bd_4472_83ba_df5c35130422_20260109183806" {
  value = aws_instance.app_Khan_c9c3b4dd_a3bd_4472_83ba_df5c35130422_20260109183806.id
}

output "public_ip_Khan_c9c3b4dd_a3bd_4472_83ba_df5c35130422_20260109183806" {
  value = aws_instance.app_Khan_c9c3b4dd_a3bd_4472_83ba_df5c35130422_20260109183806.public_ip
}



resource "aws_instance" "app_Khan_c9c3b4dd_a3bd_4472_83ba_df5c35130422_20260109184906" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "Khan_c9c3b4dd-a3bd-4472-83ba-df5c35130422"
  }
}

output "instance_id_Khan_c9c3b4dd_a3bd_4472_83ba_df5c35130422_20260109184906" {
  value = aws_instance.app_Khan_c9c3b4dd_a3bd_4472_83ba_df5c35130422_20260109184906.id
}

output "public_ip_Khan_c9c3b4dd_a3bd_4472_83ba_df5c35130422_20260109184906" {
  value = aws_instance.app_Khan_c9c3b4dd_a3bd_4472_83ba_df5c35130422_20260109184906.public_ip
}



resource "aws_instance" "app_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260109192126" {
  ami           = "ami-056098c79bd76d53f"
  instance_type = "t3.small"

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y
              sudo amazon-linux-extras enable epel
              sudo yum install -y httpd
              EOF

  tags = {
    Name = "user4_0c8fa041-f9a9-40bc-9707-cd557e57f82e"
  }
}

output "instance_id_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260109192126" {
  value = aws_instance.app_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260109192126.id
}

output "public_ip_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260109192126" {
  value = aws_instance.app_user4_0c8fa041_f9a9_40bc_9707_cd557e57f82e_20260109192126.public_ip
}
