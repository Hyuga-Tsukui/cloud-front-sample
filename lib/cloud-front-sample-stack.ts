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

    // OAIの作成
    // OAIはCloudFrontからのみs3にアクセスできるようにするための設定
    const oai = new cdk.aws_cloudfront.OriginAccessIdentity(this, "OAI", {
      comment: "OAI for CloudFront",
    });
    bucket.grantRead(oai);

    // CloudFrontの作成
    const distribution = new cdk.aws_cloudfront.CloudFrontWebDistribution(
      this,
      "Distribution",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: bucket,
              originAccessIdentity: oai,
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

    // S3にリソースを配置
    new cdk.aws_s3_deployment.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [cdk.aws_s3_deployment.Source.asset("./web")],
      destinationBucket: bucket,
      distribution, // デプロイ時にCloudFront cacheを無効化する
      distributionPaths: ["/*"],
    });
  }
}
