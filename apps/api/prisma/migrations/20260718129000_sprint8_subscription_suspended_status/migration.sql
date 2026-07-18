-- PostgreSQL requires a newly added enum value to commit before later DDL uses it.
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
