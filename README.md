# 概要

CloudFront + S3 による静的リソースホスティングのサンプル実装

一般的なユースケースを想定して以下を実装しています

- S3 への直接アクセスを禁止
  - 最新プラクティスである,OriginAccessControl の仕組みを利用
- レスポンスヘッダーなどをアプリケーション要件に合わせて変更するための CFfn の実装

# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
