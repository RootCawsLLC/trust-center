resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "${var.project}-connector"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.connector.id]
}

resource "aws_apprunner_service" "app" {
  count        = var.deploy_service ? 1 : 0
  service_name = var.project

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access.arn
    }
    auto_deployments_enabled = false

    image_repository {
      image_identifier      = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = "3000"
        runtime_environment_variables = merge({
          STORAGE_DRIVER  = "s3"
          S3_BUCKET       = aws_s3_bucket.docs.bucket
          AWS_REGION      = var.aws_region
          COMPANY_NAME    = var.company_name
          AUTH_TRUST_HOST = "true"
          NODE_ENV        = "production"
          # Make Next's standalone server bind all interfaces (else it inherits
          # the container hostname and App Runner health checks can't reach it).
          HOSTNAME = "0.0.0.0"
          }, var.app_url != "" ? {
          # Canonical URL for Auth.js redirects (HOSTNAME=0.0.0.0 otherwise makes
          # it derive the wrong base URL).
          AUTH_URL = var.app_url
          APP_URL  = var.app_url
        } : {})
        runtime_environment_secrets = {
          DATABASE_URL = aws_secretsmanager_secret.database_url.arn
          AUTH_SECRET  = aws_secretsmanager_secret.auth_secret.arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = var.app_cpu
    memory            = var.app_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    egress_configuration {
      egress_type = var.app_egress == "VPC" ? "VPC" : "DEFAULT"
      vpc_connector_arn = var.app_egress == "VPC" ? aws_apprunner_vpc_connector.main.arn : null
    }
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/api/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  depends_on = [aws_db_instance.main, aws_vpc_endpoint.secretsmanager]
}
