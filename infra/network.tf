data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${var.project}-vpc" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-igw" }
}

# Two subnets across two AZs (RDS subnet group requires >= 2). Public so the DB
# can be reached from an allowlisted admin IP for migrations without a NAT
# gateway; App Runner reaches the DB privately via the VPC connector.
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.20.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.project}-public-${count.index}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "${var.project}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security group for the App Runner VPC connector (egress to the DB).
resource "aws_security_group" "connector" {
  name        = "${var.project}-connector"
  description = "App Runner VPC connector egress"
  vpc_id      = aws_vpc.main.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-connector" }
}

# Security group for RDS: allow Postgres from the connector SG, and optionally
# from an allowlisted admin IP for running migrations.
resource "aws_security_group" "rds" {
  name        = "${var.project}-rds"
  description = "Postgres access"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from App Runner connector"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.connector.id]
  }

  dynamic "ingress" {
    for_each = var.admin_ip_cidr == "" ? [] : [var.admin_ip_cidr]
    content {
      description = "Postgres from admin IP (migrations)"
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-rds" }
}
