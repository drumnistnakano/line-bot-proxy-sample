import { Stack, StackProps, Duration } from 'aws-cdk-lib'
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import {
  RestApi,
  MethodLoggingLevel,
  LambdaIntegration,
} from 'aws-cdk-lib/aws-apigateway'
import { Construct } from 'constructs'
import { loadSsmParameterStores } from './load-ssm-parameter-stores'

export class LineBotProxySampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const { lineChannelAccessToken, lineChannelSecret } =
      loadSsmParameterStores({ construct: this })

    const lineEchoBotHandler = new NodejsFunction(this, 'lineBotProxyHandler', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'proxy-server/src/handler.ts',
      timeout: Duration.seconds(30),
      tracing: Tracing.ACTIVE,
      environment: {
        LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN: lineChannelAccessToken,
        LINE_MESSAGING_API_CHANNEL_SECRET: lineChannelSecret,
      },
    })

    const api = new RestApi(this, 'lineEchoBotApi', {
      restApiName: 'lineEchoBotApi',
      deployOptions: {
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
    })

    const items = api.root.addResource('proxy')
    items.addMethod('POST', new LambdaIntegration(lineEchoBotHandler))
  }
}
