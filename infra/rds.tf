resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnets"
  subnet_ids = aws_subnet.public[*].id
  tags       = { Name = "${var.project}-db-subnets" }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = "17.4"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 50
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "trustcenter"
  username = var.db_username
  password = var.db_password
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  # Public endpoint is used only for running migrations from an allowlisted IP.
  # For production UAT, set admin_ip_cidr = "" and this to false.
  publicly_accessible = var.admin_ip_cidr != ""

  backup_retention_period = 3
  deletion_protection     = false
  skip_final_snapshot     = true
  apply_immediately       = true

  tags = { Name = "${var.project}-db" }
}
