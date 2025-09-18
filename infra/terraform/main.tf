# Max weekly cost: $1,500 AUD — enforced by AWS Budgets

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# KMS Key for encryption
resource "aws_kms_key" "main" {
  description             = "KMS key for CarbonX data encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

# VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "CarbonX-VPC"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
}

resource "aws_eip" "nat" {
  vpc = true
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.main.id
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Security Groups
resource "aws_security_group" "eks" {
  name        = "eks-sg"
  description = "Security group for EKS cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.office_ip]
  }
}

resource "aws_security_group" "rds" {
  name        = "rds-sg"
  description = "Security group for RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks.id]
  }
}

resource "aws_security_group" "redis" {
  name        = "redis-sg"
  description = "Security group for ElastiCache"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks.id]
  }
}

resource "aws_security_group" "bastion" {
  name        = "bastion-sg"
  description = "Security group for Bastion"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.office_ip]
  }
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "carbonx-cluster"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = aws_subnet.private[*].id
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.main.arn
    }
    resources = ["secrets"]
  }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "carbonx-nodes"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = aws_subnet.private[*].id

  instance_types = ["t3.medium"]
  capacity_type  = var.environment == "prod" ? "ON_DEMAND" : "SPOT"

  scaling_config {
    desired_size = 3
    max_size     = 5
    min_size     = 1
  }

  tags = {
    Name = "CarbonX-EKS-Nodes"
  }
}

resource "aws_iam_role" "eks" {
  name = "eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks.name
}

resource "aws_iam_role" "node" {
  name = "eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "node" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.node.name
}

resource "aws_iam_role_policy_attachment" "cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.node.name
}

resource "aws_iam_role_policy_attachment" "ecr" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node.name
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  allocated_storage    = 20
  storage_type         = "gp2"
  engine               = "postgres"
  engine_version       = "13.7"
  instance_class       = "db.t3.small"
  db_name              = "carbonx"
  username             = var.db_username
  password             = var.db_password
  parameter_group_name = "default.postgres13"
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  kms_key_id             = aws_kms_key.main.arn
  storage_encrypted      = true
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  skip_final_snapshot    = true
}

resource "aws_db_subnet_group" "main" {
  name       = "carbonx-db-subnet"
  subnet_ids = aws_subnet.private[*].id
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "carbonx-redis"
  engine               = "redis"
  node_type            = "cache.t3.small"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis6.x"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  snapshot_retention_limit = 7
  snapshot_window      = "03:00-04:00"
  maintenance_window   = "sun:04:00-sun:05:00"
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "carbonx-redis-subnet"
  subnet_ids = aws_subnet.private[*].id
}

# S3 Bucket for logs and attestations
resource "aws_s3_bucket" "logs" {
  bucket = "carbonx-logs-attestations-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 8
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "EKS-CPU-High"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors EKS node CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    AutoScalingGroupName = aws_eks_node_group.main.resources[0].autoscaling_groups[0].name
  }
}

resource "aws_cloudwatch_metric_alarm" "disk_high" {
  alarm_name          = "EKS-Disk-High"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DiskSpaceUtilization"
  namespace           = "System/Linux"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors EKS node disk utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

resource "aws_sns_topic" "alerts" {
  name = "carbonx-alerts"
}

# AWS Budgets
resource "aws_budgets_budget" "weekly" {
  name         = "CarbonX-Weekly-Budget"
  budget_type  = "COST"
  limit_amount = "1500"
  limit_unit   = "USD"
  time_unit    = "WEEKLY"

  cost_filters = {
    Service = "Amazon Elastic Compute Cloud - Compute"
    Service = "Amazon Relational Database Service"
    Service = "Amazon ElastiCache"
    Service = "Amazon Simple Storage Service"
  }
}

# CloudTrail for audit logging
resource "aws_cloudtrail" "main" {
  name                          = "carbonx-trail"
  s3_bucket_name                = aws_s3_bucket.logs.bucket
  s3_key_prefix                 = "cloudtrail"
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
}

# Elasticsearch (ELK)
resource "aws_elasticsearch_domain" "main" {
  domain_name           = "carbonx-elk"
  elasticsearch_version = "7.10"

  cluster_config {
    instance_type = "t3.small.elasticsearch"
  }

  vpc_options {
    subnet_ids = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.elasticsearch.id]
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.main.key_id
  }

  node_to_node_encryption {
    enabled = true
  }
}

resource "aws_security_group" "elasticsearch" {
  name        = "elasticsearch-sg"
  description = "Security group for Elasticsearch"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks.id]
  }
}

# Bastion Host with restricted SSH
resource "aws_instance" "bastion" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  key_name      = var.key_name
  vpc_security_group_ids = [aws_security_group.bastion.id]
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "CarbonX-Bastion"
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}