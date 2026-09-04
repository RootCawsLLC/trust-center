output "ecr_repository_url" {
  description = "Push the image here"
  value       = aws_ecr_repository.app.repository_url
}

output "codebuild_project" {
  description = "CodeBuild project that builds the image"
  value       = aws_codebuild_project.build.name
}

output "source_bucket" {
  description = "Upload source.zip here for CodeBuild"
  value       = aws_s3_bucket.source.bucket
}

output "docs_bucket" {
  description = "Private document blob bucket"
  value       = aws_s3_bucket.docs.bucket
}

output "rds_endpoint" {
  description = "RDS endpoint host"
  value       = aws_db_instance.main.address
}

output "database_url_secret_arn" {
  description = "Secrets Manager ARN for DATABASE_URL"
  value       = aws_secretsmanager_secret.database_url.arn
}

output "database_url" {
  description = "Connection string for running migrations from an allowlisted IP"
  value       = local.database_url
  sensitive   = true
}

output "service_url" {
  description = "Public App Runner URL (once deploy_service = true)"
  value       = var.deploy_service ? "https://${aws_apprunner_service.app[0].service_url}" : "(set deploy_service=true and re-apply)"
}
