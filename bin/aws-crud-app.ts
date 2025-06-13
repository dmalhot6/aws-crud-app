#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsCrudAppStack } from '../lib/aws-crud-app-stack';

const app = new cdk.App();
new AwsCrudAppStack(app, 'AwsCrudAppStack', {
  /* Using the current CLI configuration for account and region */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  
  /* Add stack tags */
  tags: {
    'Environment': 'Development',
    'Application': 'CrudApp',
    'Owner': 'DevTeam'
  }
});