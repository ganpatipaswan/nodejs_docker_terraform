output "ec2_public_ip" {
  value = aws_instance.node_demo.public_ip
}
