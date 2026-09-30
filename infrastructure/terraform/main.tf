terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}

resource "aws_vpc" "pandav_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "pandav-vpc-${var.environment}"
    ManagedBy   = "Pandav-AI-Bhima"
  }
}

resource "aws_s3_bucket" "pandav_artifacts" {
  bucket = "pandav-ai-artifacts-${var.environment}"

  tags = {
    Name        = "Pandav Mission Artifacts"
    Environment = var.environment
  }
}
