variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "office_ip" {
  description = "Office IP for SSH access"
  type        = string
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment (prod or dev)"
  type        = string
  default     = "dev"
}

variable "key_name" {
  description = "SSH key pair name for bastion"
  type        = string
}