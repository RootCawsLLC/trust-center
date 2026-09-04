locals {
  database_url = "postgresql://${var.db_username}:${urlencode(var.db_password)}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/trustcenter?schema=public&sslmode=require"
}

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.project}/database-url-${random_id.suffix.hex}"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = local.database_url
}

resource "aws_secretsmanager_secret" "auth_secret" {
  name                    = "${var.project}/auth-secret-${random_id.suffix.hex}"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "auth_secret" {
  secret_id     = aws_secretsmanager_secret.auth_secret.id
  secret_string = var.app_auth_secret
}
