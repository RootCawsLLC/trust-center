# Copy to terraform.tfvars and fill in. Never commit real secrets.
aws_region   = "us-east-1"
project      = "trust-center"
company_name = "Acme Corp"

# Strong, unique values. Generate secrets with: openssl rand -base64 32
db_password         = "REPLACE-with-a-strong-db-password"
runtime_db_password = "REPLACE-with-a-strong-role-password"
app_auth_secret     = "REPLACE-with-openssl-rand-base64-32"

# Your workstation's public IP as a /32, so you can run migrations against RDS.
# Find it with: curl -s https://checkip.amazonaws.com
# Set to "" to disable public DB access (then run migrations via a bastion/CI).
admin_ip_cidr = "203.0.113.10/32"

# Leave false for the first apply; the deploy script flips it to true after the
# image is built and pushed.
deploy_service = false
