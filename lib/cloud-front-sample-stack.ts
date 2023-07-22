import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class CloudFrontSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // s3の作成
    const bucket = new cdk.aws_s3.Bucket(this, "Bucket", {
      // websiteIndexDocument: "index.html",
      // websiteErrorDocument: "error.html",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    const oac = new cdk.aws_cloudfront.CfnOriginAccessControl(this, "OAC", {
      originAccessControlConfig: {
        name: "OAC",
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
    });

    const bucketPolicy = new cdk.aws_iam.PolicyStatement({
      actions: ["s3:GetObject"],
      effect: cdk.aws_iam.Effect.ALLOW,
      principals: [
        new cdk.aws_iam.ServicePrincipal("cloudfront.amazonaws.com"),
      ],
      resources: [bucket.bucketArn + "/*"],
    });

    // response headerを変更するcfnの作成
    const cfnFunction = new cdk.aws_cloudfront.Function(this, "Function", {
      functionName: "OverrideResponseHeader",
      code: cdk.aws_cloudfront.FunctionCode.fromFile({
        filePath: "./functions/overrideResponseHeader.js",
      }),
    });

    // CloudFrontの作成
    const distribution = new cdk.aws_cloudfront.CloudFrontWebDistribution(
      this,
      "Distribution",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: bucket,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
                allowedMethods:
                  cdk.aws_cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
                cachedMethods:
                  cdk.aws_cloudfront.CloudFrontAllowedCachedMethods
                    .GET_HEAD_OPTIONS,
                compress: true,
                // キャッシュ設定
                defaultTtl: cdk.Duration.days(1),
                maxTtl: cdk.Duration.days(365),
                functionAssociations: [
                  {
                    function: cfnFunction,
                    eventType:
                      cdk.aws_cloudfront.FunctionEventType.VIEWER_RESPONSE,
                  },
                ],
              },
            ],
          },
        ],

        // CloudFrontのエラー時のindex.htmlをs3のerror.htmlとする
        errorConfigurations: [
          {
            errorCode: 403,
            responseCode: 200,
            responsePagePath: "/error.html",
          },
          {
            errorCode: 404,
            responseCode: 200,
            responsePagePath: "/error.html",
          },
        ],

        // CloudFrontのデフォルトのindex.htmlをs3のindex.htmlとする
        defaultRootObject: "index.html",

        // // CloudFrontのログをs3に保存する
        // loggingConfig: {
        //   bucket: bucket,
        //   includeCookies: true,
        //   prefix: "logs/",
        // },
        priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_200,
      }
    );

    bucketPolicy.addCondition("StringEquals", {
      "AWS:SourceArn": `arn:aws:cloudfront::${
        cdk.Stack.of(this).account
      }:distribution/${distribution.distributionId}`,
    });

    bucket.addToResourcePolicy(bucketPolicy);

    // OAIがレガシーなので、OACを使った設定 REF: https://zenn.dev/thyt_lab/articles/d6423c883882b7
    const cfnDistribution = distribution.node
      .defaultChild as cdk.aws_cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride(
      "DistributionConfig.Origins.0.OriginAccessControlId",
      oac.getAtt("Id")
    );
    cfnDistribution.addOverride(
      "Properties.DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity",
      ""
    );
    cfnDistribution.addPropertyDeletionOverride(
      "DistributionConfig.Origins.0.CustomOriginConfig"
    );

    // S3にリソースを配置
    new cdk.aws_s3_deployment.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [cdk.aws_s3_deployment.Source.asset("./web")],
      destinationBucket: bucket,
      distribution, // デプロイ時にCloudFront cacheを無効化する
      distributionPaths: ["/*"],
    });
  }
}
