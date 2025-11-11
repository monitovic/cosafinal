# ============= TERRAFORM CONFIGURATION =============
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
  
  backend "s3" {
    # Configure backend in terraform.tfvars or via CLI
    # bucket = "condoconnectai-terraform-state"
    # key    = "infrastructure/terraform.tfstate"
    # region = "us-east-1"
  }
}

# ============= PROVIDER CONFIGURATION =============
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.owner
    }
  }
}

# ============= VARIABLES =============
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "condoconnectai"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "condoconnectai.com"
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
  default     = "CondoconnectAI Team"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_vpn_gateway" {
  description = "Enable VPN Gateway"
  type        = bool
  default     = false
}

variable "database_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "database_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = false
}

# ============= LOCAL VALUES =============
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = var.owner
  }
  
  vpc_cidr = var.vpc_cidr
  azs      = var.availability_zones
  
  public_subnets  = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 8, k)]
  private_subnets = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 8, k + 10)]
  database_subnets = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 8, k + 20)]
}

# ============= DATA SOURCES =============
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ============= RANDOM RESOURCES =============
resource "random_password" "database_password" {
  length  = 16
  special = true
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# ============= VPC MODULE =============
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = local.vpc_cidr

  azs              = local.azs
  public_subnets   = local.public_subnets
  private_subnets  = local.private_subnets
  database_subnets = local.database_subnets

  enable_nat_gateway = var.enable_nat_gateway
  enable_vpn_gateway = var.enable_vpn_gateway
  enable_dns_hostnames = true
  enable_dns_support = true

  # Single NAT Gateway for cost optimization in dev
  single_nat_gateway = var.environment == "dev" ? true : false
  one_nat_gateway_per_az = var.environment == "prod" ? true : false

  create_database_subnet_group = true
  create_database_subnet_route_table = true

  tags = local.common_tags
}

# ============= SECURITY GROUPS =============
resource "aws_security_group" "alb" {
  name_prefix = "${local.name_prefix}-alb-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for Application Load Balancer"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "web" {
  name_prefix = "${local.name_prefix}-web-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for web servers"

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "HTTPS from ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "database" {
  name_prefix = "${local.name_prefix}-db-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for RDS database"

  ingress {
    description     = "PostgreSQL from web servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id, aws_security_group.lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "lambda" {
  name_prefix = "${local.name_prefix}-lambda-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for Lambda functions"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-lambda-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ============= S3 BUCKETS =============
resource "aws_s3_bucket" "webapp" {
  bucket = "${local.name_prefix}-webapp-${random_id.bucket_suffix.hex}"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-webapp"
    Type = "WebApp"
  })
}

resource "aws_s3_bucket_public_access_block" "webapp" {
  bucket = aws_s3_bucket.webapp.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "webapp" {
  bucket = aws_s3_bucket.webapp.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

resource "aws_s3_bucket_cors_configuration" "webapp" {
  bucket = aws_s3_bucket.webapp.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket" "files" {
  bucket = "${local.name_prefix}-files-${random_id.bucket_suffix.hex}"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-files"
    Type = "FileStorage"
  })
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket = aws_s3_bucket.files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "files" {
  bucket = aws_s3_bucket.files.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    id     = "delete_old_versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }
}

# ============= DYNAMODB TABLES =============
resource "aws_dynamodb_table" "residents" {
  name           = "${local.name_prefix}-residents"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name     = "TenantIndex"
    hash_key = "tenantId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name     = "EmailIndex"
    hash_key = "email"
    projection_type = "ALL"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-residents"
  })
}

resource "aws_dynamodb_table" "payments" {
  name           = "${local.name_prefix}-payments"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "residentId"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  global_secondary_index {
    name               = "ResidentIndex"
    hash_key           = "residentId"
    range_key          = "date"
    projection_type    = "ALL"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-payments"
  })
}

resource "aws_dynamodb_table" "work_orders" {
  name           = "${local.name_prefix}-work-orders"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name               = "TenantStatusIndex"
    hash_key           = "tenantId"
    range_key          = "status"
    projection_type    = "ALL"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-work-orders"
  })
}

resource "aws_dynamodb_table" "security_events" {
  name           = "${local.name_prefix}-security-events"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  global_secondary_index {
    name               = "TenantTimestampIndex"
    hash_key           = "tenantId"
    range_key          = "timestamp"
    projection_type    = "ALL"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-security-events"
  })
}

resource "aws_dynamodb_table" "visitors" {
  name           = "${local.name_prefix}-visitors"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "visitDate"
    type = "S"
  }

  global_secondary_index {
    name               = "TenantDateIndex"
    hash_key           = "tenantId"
    range_key          = "visitDate"
    projection_type    = "ALL"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-visitors"
  })
}

resource "aws_dynamodb_table" "messages" {
  name           = "${local.name_prefix}-messages"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "recipientId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  global_secondary_index {
    name               = "RecipientIndex"
    hash_key           = "recipientId"
    range_key          = "timestamp"
    projection_type    = "ALL"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-messages"
  })
}

resource "aws_dynamodb_table" "announcements" {
  name           = "${local.name_prefix}-announcements"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  global_secondary_index {
    name               = "TenantTimestampIndex"
    hash_key           = "tenantId"
    range_key          = "timestamp"
    projection_type    = "ALL"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-announcements"
  })
}

resource "aws_dynamodb_table" "access_logs" {
  name           = "${local.name_prefix}-access-logs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  global_secondary_index {
    name               = "TenantTimestampIndex"
    hash_key           = "tenantId"
    range_key          = "timestamp"
    projection_type    = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-access-logs"
  })
}

# ============= COGNITO USER POOL =============
resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-users"

  password_policy {
    minimum_length    = 8
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
  }

  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]

  schema {
    attribute_data_type = "String"
    name               = "email"
    required           = true
    mutable            = true
  }

  schema {
    attribute_data_type = "String"
    name               = "name"
    required           = true
    mutable            = true
  }

  schema {
    attribute_data_type = "String"
    name               = "phone_number"
    required           = false
    mutable            = true
  }

  schema {
    attribute_data_type = "String"
    name               = "tenant_id"
    required           = false
    mutable            = true
  }

  schema {
    attribute_data_type = "String"
    name               = "role"
    required           = false
    mutable            = true
  }

  schema {
    attribute_data_type = "String"
    name               = "unit_number"
    required           = false
    mutable            = true
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-users"
  })
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${local.name_prefix}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ADMIN_NO_SRP_AUTH",
    "USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  supported_identity_providers = ["COGNITO"]

  callback_urls = [
    "https://${var.domain_name}/callback",
    "http://localhost:3000/callback"
  ]

  logout_urls = [
    "https://${var.domain_name}/logout",
    "http://localhost:3000/logout"
  ]

  allowed_oauth_flows = ["code", "implicit"]
  allowed_oauth_scopes = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true
}

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${local.name_prefix}-identity"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-identity"
  })
}

# ============= IAM ROLES =============
resource "aws_iam_role" "cognito_authenticated" {
  name = "${local.name_prefix}-cognito-authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "cognito_authenticated" {
  name = "CognitoAuthenticatedPolicy"
  role = aws_iam_role.cognito_authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "execute-api:Invoke"
        ]
        Resource = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*/*/*/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.files.arn}/*"
      }
    ]
  })
}

resource "aws_iam_role" "lambda_execution" {
  name = "${local.name_prefix}-lambda-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
  ]

  tags = local.common_tags
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "DynamoDBAccess"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.residents.arn,
          aws_dynamodb_table.payments.arn,
          aws_dynamodb_table.work_orders.arn,
          aws_dynamodb_table.security_events.arn,
          aws_dynamodb_table.visitors.arn,
          aws_dynamodb_table.messages.arn,
          aws_dynamodb_table.announcements.arn,
          aws_dynamodb_table.access_logs.arn,
          "${aws_dynamodb_table.residents.arn}/index/*",
          "${aws_dynamodb_table.payments.arn}/index/*",
          "${aws_dynamodb_table.work_orders.arn}/index/*",
          "${aws_dynamodb_table.security_events.arn}/index/*",
          "${aws_dynamodb_table.visitors.arn}/index/*",
          "${aws_dynamodb_table.messages.arn}/index/*",
          "${aws_dynamodb_table.announcements.arn}/index/*",
          "${aws_dynamodb_table.access_logs.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_s3" {
  name = "S3Access"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.files.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.files.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_sns_ses" {
  name = "SNSSESAccess"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============= API GATEWAY =============
resource "aws_api_gateway_rest_api" "main" {
  name        = "${local.name_prefix}-api"
  description = "CondoconnectAI REST API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = "*"
        Action = "execute-api:Invoke"
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = var.environment

  depends_on = [aws_api_gateway_rest_api.main]

  lifecycle {
    create_before_destroy = true
  }
}

# ============= CLOUDFRONT DISTRIBUTION =============
resource "aws_cloudfront_origin_access_control" "webapp" {
  name                              = "${local.name_prefix}-webapp-oac"
  description                       = "OAC for webapp S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name              = aws_s3_bucket.webapp.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.webapp.id
    origin_id                = "S3Origin"
  }

  origin {
    domain_name = "${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com"
    origin_id   = "ApiOrigin"

    custom_origin_config {
      http_port              = 443
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ApiOrigin"
    viewer_protocol_policy = "https-only"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cdn"
  })
}

# ============= S3 BUCKET POLICY FOR CLOUDFRONT =============
resource "aws_s3_bucket_policy" "webapp" {
  bucket = aws_s3_bucket.webapp.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.webapp.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.webapp]
}

# ============= COGNITO IDENTITY POOL ROLE ATTACHMENT =============
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated" = aws_iam_role.cognito_authenticated.arn
  }
}

# ============= OUTPUTS =============
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.main.id
}

output "identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = aws_cognito_identity_pool.main.id
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.environment}"
}

output "webapp_bucket_name" {
  description = "Name of the webapp S3 bucket"
  value       = aws_s3_bucket.webapp.bucket
}

output "files_bucket_name" {
  description = "Name of the files S3 bucket"
  value       = aws_s3_bucket.files.bucket
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}

output "dynamodb_tables" {
  description = "Map of DynamoDB table names"
  value = {
    residents       = aws_dynamodb_table.residents.name
    payments        = aws_dynamodb_table.payments.name
    work_orders     = aws_dynamodb_table.work_orders.name
    security_events = aws_dynamodb_table.security_events.name
    visitors        = aws_dynamodb_table.visitors.name
    messages        = aws_dynamodb_table.messages.name
    announcements   = aws_dynamodb_table.announcements.name
    access_logs     = aws_dynamodb_table.access_logs.name
  }
}

output "security_groups" {
  description = "Map of security group IDs"
  value = {
    alb      = aws_security_group.alb.id
    web      = aws_security_group.web.id
    database = aws_security_group.database.id
    lambda   = aws_security_group.lambda.id
  }
}
