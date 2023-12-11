import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'
import { createNodejsFn, nodejsFnPropsDefault } from './util'
import {
  RestApi,
  MethodLoggingLevel,
  LambdaIntegration,
} from 'aws-cdk-lib/aws-apigateway'

export interface CreateLineBotApiProps {
  construct: Construct
  lineUsersTable: dynamodb.Table
  lineChannelAccessToken: string
  lineChannelSecret: string
  oldLineWebhookUrl: string
}

/**
 *  LINE Webhook Proxy APIリソースを作成
 *
 * @param {CreateLineBotApiProps} params パラメータ
 */
export const createLineBotProxyApi = ({
  construct,
  lineUsersTable,
  lineChannelAccessToken,
  lineChannelSecret,
  oldLineWebhookUrl,
}: CreateLineBotApiProps) => {
  const nodejsFnEnvironment: Record<string, string> = {
    LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN: lineChannelAccessToken,
    LINE_MESSAGING_API_CHANNEL_SECRET: lineChannelSecret,
    LINE_USERS_TABLE_NAME: lineUsersTable.tableName,
    OLD_LINE_WEBHOOK_URL: oldLineWebhookUrl,
  }
  const { nodejsFn: lineBotProxyFn } = createNodejsFn({
    construct,
    nodejsFnId: 'lineBotProxyFn',
    nodejsFnProps: {
      ...nodejsFnPropsDefault,
      environment: nodejsFnEnvironment,
      entry: '../proxy-server/src/handler.ts',
    },
  })
  lineUsersTable.grantReadWriteData(lineBotProxyFn)

  const lineBotProxyApi = new RestApi(construct, 'lineBotProxyApi', {
    restApiName: 'lineBotProxyApi',
    deployOptions: {
      tracingEnabled: true,
      dataTraceEnabled: true,
      loggingLevel: MethodLoggingLevel.INFO,
      metricsEnabled: true,
    },
  })
  const lineBotProxyApiResource = lineBotProxyApi.root.addResource('proxy')
  lineBotProxyApiResource.addMethod(
    'POST',
    new LambdaIntegration(lineBotProxyFn)
  )
}
