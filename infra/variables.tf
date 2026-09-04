variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Name prefix for all resources"
  type        = string
  default     = "trust-center"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "trustadmin"
}

variable "db_password" {
  description = "RDS master password (min 16 chars recommended)"
  type        = string
  sensitive   = true
}

variable "app_auth_secret" {
  description = "Auth.js signing secret (e.g. `openssl rand -base64 32`)"
  type        = string
  sensitive   = true
}

variable "runtime_db_password" {
  description = "Password for the least-privilege trust_app role"
  type        = string
  sensitive   = true
}

variable "admin_ip_cidr" {
  description = "CIDR allowed to reach RDS directly (your IP /32) for running migrations. Set to a tight value; use \"\" to disable public DB access."
  type        = string
  default     = ""
}

variable "company_name" {
  description = "Vendor name shown on the public site"
  type        = string
  default     = "Acme Corp"
}

variable "image_tag" {
  description = "Container image tag in ECR to deploy"
  type        = string
  default     = "latest"
}

variable "deploy_service" {
  description = "Create the App Runner service. Set false for the first apply (before the image exists), true after the image is pushed."
  type        = bool
  default     = false
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "app_cpu" {
  description = "App Runner vCPU (256 = 0.25 vCPU)"
  type        = string
  default     = "256"
}

variable "app_memory" {
  description = "App Runner memory (512 = 0.5 GB)"
  type        = string
  default     = "512"
}

variable "app_egress" {
  description = "App Runner egress mode: VPC (via connector) or PUBLIC (diagnostic)"
  type        = string
  default     = "VPC"
}

variable "app_url" {
  description = "Public URL of the service (set to the App Runner URL after first create so Auth.js builds correct redirects)"
  type        = string
  default     = ""
}
